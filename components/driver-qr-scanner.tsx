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
import { isIosDevice } from "@/lib/driver-qr-scan"

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

  if (
    !window.isSecureContext &&
    window.location.protocol !== "https:" &&
    window.location.hostname !== "localhost"
  ) {
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

function prepareInlineVideo(root: HTMLElement | null): void {
  if (!root) return
  const video = root.querySelector("video")
  if (!video) return
  video.muted = true
  video.defaultMuted = true
  video.autoplay = true
  video.playsInline = true
  video.setAttribute("muted", "")
  video.setAttribute("playsinline", "true")
  video.setAttribute("webkit-playsinline", "true")
  video.setAttribute("autoplay", "true")
  video.style.width = "100%"
  video.style.height = "100%"
  video.style.objectFit = "cover"
  void video.play().catch(() => undefined)
}

async function applyMobileFocus(scanner: Html5Qrcode): Promise<void> {
  try {
    const capabilities = scanner.getRunningTrackCapabilities() as MediaTrackCapabilities & {
      focusMode?: string[]
      zoom?: { min?: number; max?: number }
    }
    const constraints: MediaTrackConstraints = {}
    if (capabilities.focusMode?.includes("continuous")) {
      ;(constraints as MediaTrackConstraints & { focusMode?: string }).focusMode = "continuous"
    }
    if (capabilities.zoom && typeof capabilities.zoom.max === "number" && capabilities.zoom.max >= 1.5) {
      const advanced = [{ zoom: Math.min(2, capabilities.zoom.max) }]
      ;(constraints as MediaTrackConstraints & { advanced?: Array<Record<string, number>> }).advanced =
        advanced
    }
    if (Object.keys(constraints).length > 0) {
      await scanner.applyVideoConstraints(constraints)
    }
  } catch {
    // Capabilities vary widely; ignore unsupported focus/zoom.
  }
}

function buildScanConfig() {
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches
  const isIos = isIosDevice()

  return {
    fps: isIos ? 12 : 15,
    // Fixed 16:9 aspectRatio breaks portrait phones (black/tiny preview + no decode).
    // Let the library fill the reader box instead.
    qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
      const edge = Math.min(viewfinderWidth, viewfinderHeight)
      // Keep qrbox inside the viewfinder with margin so shading never throws.
      const ratio = isMobile ? 0.78 : 0.7
      const size = Math.max(120, Math.floor(edge * ratio))
      return { width: size, height: size }
    },
    disableFlip: false,
  }
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

        // Wait for fullscreen dialog layout so reader has real width/height.
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => {
            window.setTimeout(() => resolve(), 180)
          })
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

        // Ensure the reader fills its parent before html5-qrcode measures it.
        element.style.width = "100%"
        element.style.height = "100%"
        element.style.minHeight = "240px"

        await stopScanner()
        if (cancelled) {
          startingRef.current = false
          setIsLoading(false)
          return
        }

        const onSuccess = (decodedText: string) => {
          if (scannedOnceRef.current || cancelled) return
          scannedOnceRef.current = true
          pauseScanner()
          onScanRef.current(decodedText)
        }

        const createScanner = () =>
          new Html5Qrcode(READER_ELEMENT_ID, {
            verbose: false,
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            // BarcodeDetector is flaky on some iOS Safari builds; prefer ZXing there.
            useBarCodeDetectorIfSupported: !isIosDevice(),
          })

        const tryStart = async (cameraIdOrConfig: string | MediaTrackConstraints) => {
          await stopScanner()
          if (cancelled) return
          const scanner = createScanner()
          scannerRef.current = scanner
          await scanner.start(cameraIdOrConfig, buildScanConfig(), onSuccess, () => undefined)
        }

        const startWithCamera = async () => {
          // Prefer rear camera via facingMode (do NOT also set config.videoConstraints —
          // that path ignores the cameraIdOrConfig argument in html5-qrcode).
          try {
            await tryStart({ facingMode: "environment" })
            return
          } catch {
            // continue
          }

          try {
            await tryStart({ facingMode: { ideal: "environment" } })
            return
          } catch {
            // continue
          }

          // Enumerated devices (works after permission has been granted once).
          const cameras = await Html5Qrcode.getCameras()
          if (!cameras.length) {
            throw new Error("No camera found. Please connect a camera device.")
          }
          const preferred =
            cameras.find((camera) => /back|rear|environment|trás|atras/i.test(camera.label)) ??
            (cameras.length > 1 ? cameras[cameras.length - 1] : cameras[0])

          await tryStart(preferred.id)
        }

        try {
          await startWithCamera()

          if (cancelled) {
            await stopScanner()
            return
          }

          const scanner = scannerRef.current
          if (!scanner) {
            throw new Error("Failed to start the QR scanner. Tap Retry to try again.")
          }

          prepareInlineVideo(element)
          // Second pass after library finishes inserting <video>.
          window.setTimeout(() => {
            if (!cancelled) prepareInlineVideo(element)
          }, 250)

          void applyMobileFocus(scanner)

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
      <div className="flex h-full min-h-0 flex-col gap-3">
        {error && (
          <div className="shrink-0 rounded-xl bg-red-50 p-4 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
            <p className="mb-3 text-base text-red-700">{error}</p>
            {error.toLowerCase().includes("permission") && (
              <div className="mb-3 rounded-lg bg-red-100 p-3 text-left text-sm text-red-600">
                <p className="mb-1 font-semibold">How to enable camera access:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>Tap the camera / AA icon in the address bar</li>
                  <li>Allow camera access for this site</li>
                  <li>Close and reopen Scan Code</li>
                </ul>
              </div>
            )}
            <Button
              size="lg"
              className="mt-1 h-12 w-full max-w-sm text-base"
              onClick={() => {
                scannedOnceRef.current = false
                setError(null)
                setRestartToken((token) => token + 1)
              }}
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              Retry
            </Button>
          </div>
        )}

        <div className="relative min-h-[55dvh] flex-1 overflow-hidden rounded-none bg-black sm:min-h-[420px] sm:rounded-xl md:min-h-[520px]">
          <div
            id={READER_ELEMENT_ID}
            className="h-full w-full [&_img]:hidden [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
          />

          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
              <Loader2 className="h-10 w-10 animate-spin" />
              <p className="text-base">Starting camera…</p>
              <p className="px-6 text-center text-sm text-white/80">Allow camera access if prompted</p>
            </div>
          )}

          {isScanning && !error && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-5 pt-10 text-center">
              <p className="text-base font-medium text-white">Point at the slip QR code</p>
              <p className="mt-1 text-sm text-white/80">Hold steady — scans automatically</p>
            </div>
          )}
        </div>
      </div>
    )
  },
)
