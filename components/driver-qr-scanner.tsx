"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { AlertCircle, Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

const READER_ELEMENT_ID = "driver-html5-qr-reader"

export type DriverQrScannerHandle = {
  pause: () => void
  resume: () => void
  stop: () => Promise<void>
  restart: () => void
}

type DriverQrScannerProps = {
  active: boolean
  onScan: (text: string) => void
}

function mapCameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : ""
  const message = error instanceof Error ? error.message : String(error ?? "")

  if (!window.isSecureContext && window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
    return "Camera access requires a secure connection (HTTPS). Please use HTTPS or localhost."
  }
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || /permission|denied/i.test(message)) {
    return "Camera permission denied. Please allow camera access in your browser settings and try again."
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || /no camera|not found/i.test(message)) {
    return "No camera found. Please connect a camera device."
  }
  if (name === "NotReadableError" || name === "TrackStartError" || /in use|busy/i.test(message)) {
    return "Camera is already in use by another application. Please close other apps using the camera."
  }
  if (message) return message
  return "Failed to start the QR scanner. Tap Retry to try again."
}

export const DriverQrScanner = forwardRef<DriverQrScannerHandle, DriverQrScannerProps>(
  function DriverQrScanner({ active, onScan }, ref) {
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const onScanRef = useRef(onScan)
    const startingRef = useRef(false)
    const scannedOnceRef = useRef(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isScanning, setIsScanning] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [restartToken, setRestartToken] = useState(0)

    onScanRef.current = onScan

    const stopScanner = useCallback(async () => {
      const scanner = scannerRef.current
      scannerRef.current = null
      if (!scanner) return
      try {
        if (scanner.isScanning) {
          await scanner.stop()
        }
      } catch {
        // Ignore stop races during dialog close / remount.
      }
      try {
        scanner.clear()
      } catch {
        // Element may already be unmounted.
      }
    }, [])

    const pauseScanner = useCallback(() => {
      const scanner = scannerRef.current
      if (!scanner?.isScanning) return
      try {
        scanner.pause(true)
      } catch {
        // Ignore if already stopped.
      }
    }, [])

    const resumeScanner = useCallback(() => {
      const scanner = scannerRef.current
      if (!scanner) return
      try {
        scanner.resume()
      } catch {
        // Ignore if not paused.
      }
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        pause: pauseScanner,
        resume: resumeScanner,
        stop: stopScanner,
        restart: () => {
          scannedOnceRef.current = false
          setError(null)
          setRestartToken((token) => token + 1)
        },
      }),
      [pauseScanner, resumeScanner, stopScanner],
    )

    useEffect(() => {
      if (!active) {
        startingRef.current = false
        scannedOnceRef.current = false
        setIsLoading(false)
        setIsScanning(false)
        setError(null)
        void stopScanner()
        return
      }

      let cancelled = false

      const start = async () => {
        if (startingRef.current) return
        startingRef.current = true
        scannedOnceRef.current = false
        setIsLoading(true)
        setIsScanning(false)
        setError(null)

        // Wait a tick so the dialog mounts the reader element.
        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 100)
        })
        if (cancelled) {
          startingRef.current = false
          setIsLoading(false)
          return
        }

        const element = document.getElementById(READER_ELEMENT_ID)
        if (!element) {
          startingRef.current = false
          setIsLoading(false)
          setError("Camera preview is not ready. Please close and reopen the scanner.")
          return
        }

        await stopScanner()
        if (cancelled) {
          startingRef.current = false
          setIsLoading(false)
          return
        }

        const scanner = new Html5Qrcode(READER_ELEMENT_ID, {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          useBarCodeDetectorIfSupported: true,
        })
        scannerRef.current = scanner

        const scanConfig = {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const edge = Math.min(viewfinderWidth, viewfinderHeight)
            const size = Math.floor(Math.min(280, edge * 0.72))
            return { width: size, height: size }
          },
          aspectRatio: 1.777778,
        }

        const onSuccess = (decodedText: string) => {
          if (scannedOnceRef.current || cancelled) return
          scannedOnceRef.current = true
          pauseScanner()
          onScanRef.current(decodedText)
        }

        try {
          try {
            await scanner.start({ facingMode: "environment" }, scanConfig, onSuccess, () => undefined)
          } catch (primaryError) {
            // Fall back to an enumerated camera when facingMode is unsupported.
            const cameras = await Html5Qrcode.getCameras()
            if (!cameras.length) throw primaryError
            const preferred =
              cameras.find((camera) => /back|rear|environment/i.test(camera.label)) ?? cameras[cameras.length - 1]
            await scanner.start(preferred.id, scanConfig, onSuccess, () => undefined)
          }

          if (cancelled) {
            await stopScanner()
            return
          }

          setIsLoading(false)
          setIsScanning(true)
          setError(null)
        } catch (err) {
          if (cancelled) return
          const message = mapCameraError(err)
          console.error("html5-qrcode start failed:", err)
          await stopScanner()
          setIsLoading(false)
          setIsScanning(false)
          setError(message)
        } finally {
          startingRef.current = false
        }
      }

      void start()

      return () => {
        cancelled = true
        startingRef.current = false
        setIsLoading(false)
        setIsScanning(false)
        void stopScanner()
      }
      // restartToken intentionally triggers a fresh camera session on Retry.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, restartToken, pauseScanner, stopScanner])

    return (
      <div className="space-y-3">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-center sm:p-4">
            <AlertCircle className="mx-auto mb-2 h-6 w-6 text-red-500 sm:h-8 sm:w-8" />
            <p className="mb-3 text-sm text-red-700 sm:text-base">{error}</p>
            {error.toLowerCase().includes("permission") && (
              <div className="mb-3 rounded bg-red-100 p-2 text-left text-xs text-red-600 sm:text-sm">
                <p className="mb-1 font-semibold">How to enable camera access:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>Click the camera icon in your browser&apos;s address bar</li>
                  <li>Select &quot;Allow&quot; for camera permissions</li>
                  <li>Refresh the page and try again</li>
                </ul>
              </div>
            )}
            <Button
              className="mt-2"
              onClick={() => {
                scannedOnceRef.current = false
                setError(null)
                setRestartToken((token) => token + 1)
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        <div className="relative aspect-video overflow-hidden rounded-lg bg-black shadow-2xl">
          <div id={READER_ELEMENT_ID} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />

          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Starting camera…</p>
            </div>
          )}

          {isScanning && !error && (
            <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-xs text-white/90 sm:text-sm">
              Hold steady — scanning automatically
            </p>
          )}
        </div>
      </div>
    )
  },
)
