"use client"
import Image from "next/image"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import LoadingOverlay from "@/components/ui/loading-overlay"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, X, Settings, QrCode, AlertCircle, Loader2, RotateCcw, Building2 } from "lucide-react"
import { searchSuperadminLabCustomers } from "@/lib/api/superadmin-customers"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { LanguageSwitcher } from "@/components/language-switcher"
import { useTranslation } from "react-i18next"
import { useLocation } from "@/contexts/location-context"
import { useDriverSlip } from "@/contexts/DriverSlipContext"
import { useToast } from "@/hooks/use-toast"
import { Breadcrumb } from "@/components/breadcrumb"
import { BrowserMultiFormatReader, BarcodeFormat } from "@zxing/browser"
import { preloadComponentsByRoute } from "@/lib/code-splitting"
import { useSlipContext } from "../app/lab-case-management/SlipContext"
import DriverHistoryModal from "./driver-history-modal"
import { CustomerLogo } from "@/components/customer-logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { getUserAvatar, getUserProfileImageUrl } from "@/utils/avatar-utils"
import { UserProfileModal } from "@/components/user-profile-modal"
import { DashboardInviteModal } from "@/components/dashboard/dashboard-invite-modal"
import {
  fetchCurrentUserProfile,
  updateCurrentUserProfile,
  type UserProfileData,
} from "@/services/user-profile-service"
import type { UpdateMeProfileInput } from "@/lib/api/me"
import { User as UserIcon } from "lucide-react"
import { clearSlipCreationStorage } from "@/utils/slip-creation-storage"
import { useClearCaseDesignCenterStateMutation } from "@/hooks/use-case-design-center-state"
import { HeaderWaffleLauncher } from "@/components/header-waffle-launcher"
import { cn } from "@/lib/utils"
import { isOfficeCustomerContext } from "@/lib/role-utils"
import { TrialBanner } from "@/components/billing/trial-banner"
import { usePlanCapabilities } from "@/hooks/use-plan-capabilities"
import { filterValidQrScanSlips } from "@/lib/slip-location"
import {
  driverQrCameraConstraints,
  driverQrCameraFallbackConstraints,
  parseDriverQrText,
  processDriverScanApiResult,
  saveDriverSessionKey,
  loadDriverSessionKey,
  waitForVideoPlayback,
  persistDriverScanBatch,
  loadDriverScanBatch,
  clearDriverScanBatch,
  DRIVER_QR_SCANNER_OPEN_EVENT,
} from "@/lib/driver-qr-scan"
import type { IScannerControls } from "@zxing/browser"

/** New Slip: solid gradient fill, white text */
const NEW_SLIP_BUTTON_CLASS =
  "border-none bg-[linear-gradient(231.46deg,#2AA6DE_-14.5%,#82298D_51.11%,#C9539F_116.71%)] hover:brightness-110 text-[#F7F7F7] h-10 w-[120px] rounded-[8px] text-[18px] font-bold leading-[21px] font-[Inter, sans-serif] shadow-sm transition-all duration-200 hover:shadow-md px-0"

/** Scan Code: white bg, gradient border — text/icon gradient handled inline */
const SCAN_CODE_BUTTON_CLASS =
  "h-10 w-[144px] rounded-[8px] transition-all duration-200 px-0 [background:linear-gradient(white,white)_padding-box,linear-gradient(231.46deg,#2AA6DE_-14.5%,#82298D_51.11%,#C9539F_116.71%)_border-box] border-2 border-transparent hover:brightness-110"

/** Keep for any remaining non-slip/scan header actions */
const HEADER_ACTION_BUTTON_CLASS =
  "border-none bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] hover:brightness-110 text-white h-8 sm:h-9 md:h-10 px-2.5 sm:px-3 md:px-4 text-xs sm:text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md"

interface HeaderProps {
  toggleSidebar?: () => void
  onNewSlip?: () => void
}

interface ScanResult {
  id: string
  text: string
  format: string
  timestamp: Date
  validated: boolean
  type: "qr" | "barcode" | "unknown"
}

interface ScannerState {
  isOpen: boolean
  isLoading: boolean
  isScanning: boolean
  error: string | null
  hasPermission: boolean
}

// Add a Location type for clarity
interface Location {
  id: string | number;
  name: string;
  [key: string]: any;
}

export function Header({ toggleSidebar, onNewSlip }: HeaderProps) {
  const { user, logout, updateSessionUser, isSuperadmin, hasPermission, hasAnyPermission, setCustomerId, selectedCustomerId, isActingAsLabAdmin, exitLabContext } = useAuth()
  const { canDriverScanning } = usePlanCapabilities()
  const [scannerState, setScannerState] = useState<ScannerState>({
    isOpen: false,
    isLoading: false,
    isScanning: false,
    error: null,
    hasPermission: false,
  })
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])
  const [batchMode, setBatchMode] = useState(false)
  const [selectedFormats, setSelectedFormats] = useState<BarcodeFormat[]>([
    BarcodeFormat.QR_CODE,
    BarcodeFormat.CODE_128,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
  ])
  const [autoValidate, setAutoValidate] = useState(true)
  // use a ref for last scan time to avoid async state updates causing duplicate handling
  const lastScanTimeRef = useRef<number>(0)
  // processingRef prevents concurrent handling of the same detection
  const processingRef = useRef(false)
  const [isDecoding, setIsDecoding] = useState(false)
  const [showDriverHistoryModal, setShowDriverHistoryModal] = useState(false)
  const [qrScanData, setQrScanData] = useState<any>(null)
  const qrScanDataRef = useRef<any>(null)
  // Driver pickup session key — reused across scans so the backend keeps the
  // same single-office session; cleared when the batch is submitted/cancelled.
  const qrSessionRef = useRef<string | null>(null)
  // QR texts already scanned in the current session — prevents re-hitting the
  // backend with the same (last) slip when the QR stays in front of the camera.
  const scannedQrTextsRef = useRef<Set<string>>(new Set())
  // When true, ignore decode callbacks (decoder may still emit briefly after reset).
  const decoderActiveRef = useRef(false)
  // Cooldown lock: blocks the same QR text from re-firing scan-qr after a failed attempt.
  const qrScanLockRef = useRef<{ text: string | null; until: number }>({ text: null, until: 0 })
  const [showUserProfileModal, setShowUserProfileModal] = useState(false)
  const [showNewOfficeModal, setShowNewOfficeModal] = useState(false)
  const [showNewLabModal, setShowNewLabModal] = useState(false)
  const [userProfileData, setUserProfileData] = useState<UserProfileData | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [isSwitchingProfile, setIsSwitchingProfile] = useState(false)
  const [superAdminLabs, setSuperAdminLabs] = useState<{ id: number; name: string }[]>([])
  const { t } = useTranslation()
  // Use Location type for selectedLocation and setSelectedLocation
  const { locations, selectedLocation, setSelectedLocation } = useLocation(); // selectedLocation is a number (id)
  const { scanQrCode, submitScannedSlips, clearDriverSession } = useSlipContext()
  const { toast } = useToast();
  const pathname = usePathname() || "";
  const router = useRouter();
  const clearCaseDesignCenterStateMutation = useClearCaseDesignCenterStateMutation();
const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const scannerStartAttemptedRef = useRef(false);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScannedCodeRef = useRef<string>("");

  const userRoles = user?.roles || (user?.role ? [user.role] : [])
  // When acting as lab admin, treat the session as non-superadmin across the whole UI
  const isSuperAdmin = isActingAsLabAdmin ? false : (isSuperadmin || userRoles.includes("superadmin"))
  const canCreateSlip = isSuperAdmin || hasPermission("submit_new_case")
  // New Office is for lab/superadmin contexts — office profiles already have an office.
  const isOfficeSideUser = ["office_admin", "office_user", "doctor", "doctor_admin"].some((role) =>
    userRoles.includes(role),
  )
  const canCreateOffice =
    !isOfficeCustomerContext() &&
    !isOfficeSideUser &&
    (isSuperAdmin ||
      hasAnyPermission(["manage_office", "edit_office", "view_office"]))
  // Scanning is a lab-side workflow; office profiles never handle physical case codes.
  const canScanCode = !isSuperAdmin && !isOfficeSideUser && !isOfficeCustomerContext() && canDriverScanning

  // Sync profile photo from GET /me (session may only have avatar, or stale localStorage)
  useEffect(() => {
    if (!user?.id) return

    let cancelled = false
    fetchCurrentUserProfile()
      .then((profile) => {
        if (cancelled) return
        const imageUrl = getUserProfileImageUrl(profile)
        if (!imageUrl) return
        const currentUrl = getUserProfileImageUrl(user)
        if (imageUrl !== currentUrl) {
          updateSessionUser({
            image: profile.image ?? profile.avatar ?? imageUrl,
            avatar: profile.avatar ?? profile.image ?? imageUrl,
          })
        }
      })
      .catch(() => {
        // Non-blocking: header still shows session avatar or initials
      })

    return () => {
      cancelled = true
    }
  }, [user?.id, updateSessionUser])

  // Fetch all labs for superadmin location dropdown (also when acting as lab admin so the switcher still works)
  useEffect(() => {
    if (!isSuperAdmin && !isActingAsLabAdmin) return
    let cancelled = false
    searchSuperadminLabCustomers({ per_page: 100, order_by: "name", sort_by: "asc" })
      .then((res) => {
        if (cancelled) return
        setSuperAdminLabs(res.data.map((lab) => ({ id: lab.id, name: lab.name })))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isSuperAdmin])

  // Load persisted driver session + scan history on mount
  useEffect(() => {
    const savedSession = loadDriverSessionKey()
    if (savedSession) {
      qrSessionRef.current = savedSession
    }
  }, [])

  useEffect(() => {
    qrScanDataRef.current = qrScanData
    persistDriverScanBatch(qrScanData)
  }, [qrScanData])

  useEffect(() => {
    const savedHistory = localStorage.getItem("qr-scan-history")
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }))
        setScanHistory(parsed)
      } catch (error) {
        console.error("Failed to load scan history:", error)
      }
    }
  }, [])

  // Save scan history to localStorage
  const saveScanHistory = useCallback((history: ScanResult[]) => {
    try {
      localStorage.setItem("qr-scan-history", JSON.stringify(history))
    } catch (error) {
      console.error("Failed to save scan history:", error)
    }
  }, [])

  // Validate scanned code
  const validateScanResult = useCallback(
    (text: string, format: string): { isValid: boolean; type: ScanResult["type"]; message?: string } => {
      // Basic validation patterns
      const patterns = {
        url: /^https?:\/\/.+/i,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^\+?[\d\s\-$$$$]+$/,
        uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        labId: /^LAB-\d{6}$/i,
        caseId: /^CASE-\d{8}$/i,
      }

      if (format.includes("QR")) {
        if (patterns.url.test(text)) return { isValid: true, type: "qr", message: "Valid URL" }
        if (patterns.email.test(text)) return { isValid: true, type: "qr", message: "Valid Email" }
        if (patterns.labId.test(text)) return { isValid: true, type: "qr", message: "Lab ID" }
        if (patterns.caseId.test(text)) return { isValid: true, type: "qr", message: "Case ID" }
        return { isValid: true, type: "qr" }
      }

      if (format.includes("EAN") || format.includes("CODE")) {
        return {
          isValid: text.length >= 8,
          type: "barcode",
          message: text.length >= 8 ? "Valid Product Code" : "Invalid Product Code",
        }
      }

      return { isValid: false, type: "unknown", message: "Unknown format" }
    },
    [],
  )

  // Handle automatic actions based on scan result
  const handleAutomaticActions = useCallback(async (result: ScanResult) => {
    try {
      // Check if the scanned text matches our QR code format for case/slip URLs
      const urlMatch = result.text.match(/\/case\/(\d+)\?slips=([0-9,]+)/)
      
      if (urlMatch) {
        // This is already handled in handleScanSuccess, so we skip it here
        return
      }

      // Fallback to existing automatic actions if not a case/slip QR code
      if (result.text.startsWith("LAB-")) {
      } else if (result.text.startsWith("CASE-")) {
      } else if (result.text.startsWith("http")) {
      } else if (result.text.includes("@") && result.text.includes(".")) {
        try {
          window.open(`mailto:${result.text}`, "_blank")
        } catch (error) {
          console.error("Failed to open email client:", error)
        }
      } else if (/^\+?[\d\s\-()]+$/.test(result.text) && result.text.replace(/\D/g, "").length >= 10) {
        try {
          window.open(`tel:${result.text}`, "_blank")
        } catch (error) {
          console.error("Failed to open phone dialer:", error)
        }
      }
    } catch (error) {
      console.error("Error in automatic actions:", error)
    }
  }, [])

  const stopActiveDecoder = useCallback(() => {
    decoderActiveRef.current = false
    if (scannerControlsRef.current) {
      try {
        scannerControlsRef.current.stop()
      } catch {
        // Ignore cleanup errors
      }
      scannerControlsRef.current = null
    }
  }, [])

  const isQrScanLocked = useCallback((text: string) => {
    const lock = qrScanLockRef.current
    return lock.text === text && Date.now() < lock.until
  }, [])

  const lockQrScan = useCallback((text: string, cooldownMs: number) => {
    qrScanLockRef.current = { text, until: Date.now() + cooldownMs }
  }, [])

  // Handle successful scan
  const handleScanSuccess = useCallback(
    async (text: string, format: string) => {
      const now = Date.now()

      // Prevent concurrent handling from multiple decode callbacks
      if (processingRef.current) {
        return
      }

      // mark as processing immediately
      processingRef.current = true

      try {
        // Prevent duplicate scans within 3 seconds AND same content
        if (now - lastScanTimeRef.current < 3000 && lastScannedCodeRef.current === text) {
          return
        }

        if (isQrScanLocked(text)) {
          return
        }

        lastScanTimeRef.current = now
        lastScannedCodeRef.current = text

        const validation = autoValidate ? validateScanResult(text, format) : { isValid: true, type: "unknown" as const }

        const parsedDriverQr = parseDriverQrText(text)

        const scanResult: ScanResult = {
          id: `scan-${now}`,
          text,
          format,
          timestamp: new Date(),
          validated: validation.isValid,
          type: validation.type,
        }

        if (parsedDriverQr) {
          const { case_id: caseId, slip_ids: slipIds } = parsedDriverQr

          if (slipIds.length === 0) {
            stopActiveDecoder()
            lockQrScan(text, 10_000)
            toast({
              title: "Invalid QR code",
              description: "This QR code is missing slip information. Please scan the code printed on the slip.",
              variant: "destructive",
              duration: 5000,
            })
            closeScanner()
            return
          }

          // Stop the decoder immediately so the same QR in view cannot re-trigger
          // scan-qr while the API request is in flight or after a failure.
          stopActiveDecoder()

          // Already scanned in this session — don't hit the backend again with
          // the same slip; just stop the scanner and surface a gentle notice.
          if (scannedQrTextsRef.current.has(parsedDriverQr.rawText)) {
            closeScanner()
            setQrScanData((prev: any) => {
              if (!prev || !Array.isArray(prev.data)) return prev
              const filtered = filterValidQrScanSlips(prev.data)
              if (filtered.length === 0) return null
              return { ...prev, data: filtered }
            })
            setShowDriverHistoryModal(true)
            toast({
              title: "Already added",
              description: "This case has already been scanned in this session.",
              duration: 3000,
            })
            return
          }

          // Lock before the API call so a failed scan cannot loop on the same QR.
          lockQrScan(text, 15_000)

          try {
            const res: any = await scanQrCode(caseId, slipIds, qrSessionRef.current || undefined)

            const prevData = filterValidQrScanSlips(
              qrScanDataRef.current && Array.isArray(qrScanDataRef.current.data)
                ? qrScanDataRef.current.data
                : []
            )
            const outcome = processDriverScanApiResult(res, prevData, slipIds)

            if (outcome.sessionKey) {
              qrSessionRef.current = outcome.sessionKey
              saveDriverSessionKey(outcome.sessionKey)
            }

            if (outcome.alreadyInSession) {
              if (outcome.response?.data?.length) {
                setQrScanData(outcome.response)
                setShowDriverHistoryModal(true)
              }
              toast({
                title: "Already added",
                description: outcome.message,
                duration: 4000,
              })
              return
            }

            if (!outcome.ok || !outcome.response?.data?.length) {
              if (outcome.response) {
                setQrScanData(outcome.response)
              } else {
                setQrScanData((prev: any) => {
                  if (!prev || !Array.isArray(prev.data)) return prev
                  const filtered = filterValidQrScanSlips(
                    prev.data.filter((d: any) => !slipIds.includes(d.slip_id))
                  )
                  if (filtered.length === 0) return null
                  return { ...prev, data: filtered }
                })
              }
              toast({
                title: "QR Scan Failed",
                description: outcome.message,
                variant: "destructive",
                duration: 5000,
              })
              return
            }

            // Success: keep this QR blocked for the rest of the driver session.
            qrScanLockRef.current = { text, until: Number.MAX_SAFE_INTEGER }
            scannedQrTextsRef.current.add(parsedDriverQr.rawText)

            const successHistory = [scanResult, ...scanHistory].slice(0, 100)
            setScanHistory(successHistory)
            saveScanHistory(successHistory)

            setQrScanData(outcome.response)
            setShowDriverHistoryModal(true)

            toast({
              title: "QR Scan Successful",
              description: `Added ${outcome.validSlips.length} slip(s) for delivery`,
              duration: 3000,
            })
          } catch (error) {
            console.error("QR scan error:", error)
            toast({
              title: "QR Scan Error",
              description: "Failed to scan QR code",
              variant: "destructive",
              duration: 5000,
            })
          } finally {
            // Always stop the camera after handling a case/slip QR so it does not
            // keep re-firing /scan-qr with the same slip.
            closeScanner()
          }

          return
        }

        // Not an Rxn3D slip QR — reject clearly instead of treating as a generic success.
        stopActiveDecoder()
        lockQrScan(text, 8_000)
        toast({
          title: "Invalid QR code",
          description: "This is not a valid Rxn3D slip QR code. Please scan the code printed on the case slip.",
          variant: "destructive",
          duration: 5000,
        })
        if (!batchMode) {
          closeScanner()
        }
        return
      } catch (err) {
        console.error("Error in handleScanSuccess:", err)
      } finally {
        // Always clear processing flag so the scanner can be reused
        processingRef.current = false
      }
    },
    [
      scanHistory,
      saveScanHistory,
      autoValidate,
      validateScanResult,
      batchMode,
      toast,
      scanQrCode,
      stopActiveDecoder,
      isQrScanLocked,
      lockQrScan,
    ],
  )

  // Request camera permission
  const requestCameraPermission = useCallback(async () => {
    if (!window.isSecureContext && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      const errorMsg = "Camera access requires a secure connection (HTTPS). Please use HTTPS or localhost."
      setScannerState((prev) => ({ ...prev, hasPermission: false, error: errorMsg }))
      throw new Error(errorMsg)
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorMsg = "Camera API is not available in this browser. Please use a modern browser."
      setScannerState((prev) => ({ ...prev, hasPermission: false, error: errorMsg }))
      throw new Error(errorMsg)
    }

    const tryGetStream = async (constraints: MediaStreamConstraints) =>
      navigator.mediaDevices.getUserMedia(constraints)

    try {
      // Soft constraints first; do not hard-fail on enumerateDevices (labels are often empty).
      try {
        const stream = await tryGetStream(driverQrCameraConstraints())
        setScannerState((prev) => ({ ...prev, hasPermission: true, error: null }))
        return stream
      } catch (primaryError: any) {
        if (
          primaryError?.name === "OverconstrainedError" ||
          primaryError?.name === "ConstraintNotSatisfiedError" ||
          primaryError?.name === "NotFoundError" ||
          primaryError?.name === "DevicesNotFoundError"
        ) {
          const stream = await tryGetStream(driverQrCameraFallbackConstraints())
          setScannerState((prev) => ({ ...prev, hasPermission: true, error: null }))
          return stream
        }
        throw primaryError
      }
    } catch (error: any) {
      let errorMessage = "Camera access denied"

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = "Camera permission denied. Please allow camera access in your browser settings and try again."
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = "No camera found. Please connect a camera device."
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = "Camera is already in use by another application. Please close other apps using the camera."
      } else if (error.message) {
        errorMessage = error.message
      }

      setScannerState((prev) => ({ ...prev, hasPermission: false, error: errorMessage }))
      throw new Error(errorMessage)
    }
  }, [])

  // Start scanner
  const startScanner = useCallback(async () => {
    if (isDecoding) {
      return
    }

    decoderActiveRef.current = true
    setIsDecoding(true)
    setScannerState((prev) => ({ ...prev, isLoading: true, isScanning: false, error: null }))

    const failStart = (message: string, cause?: unknown) => {
      console.error("Error starting scanner:", cause ?? message)
      stopActiveDecoder()
      setIsDecoding(false)
      if (videoRef.current?.srcObject) {
        const activeStream = videoRef.current.srcObject as MediaStream
        activeStream.getTracks().forEach((track) => {
          track.stop()
          track.enabled = false
        })
        videoRef.current.srcObject = null
      }
      setStream(null)
      setScannerState((prev) => ({
        ...prev,
        isLoading: false,
        isScanning: false,
        error: message,
      }))
      toast({
        title: "Scanner Error",
        description: message,
        variant: "destructive",
        duration: 5000,
      })
    }

    try {
      // Dialog portal can mount a frame later than open state flips.
      for (let attempt = 0; attempt < 10 && !videoRef.current; attempt += 1) {
        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 50)
        })
      }

      if (!videoRef.current) {
        failStart("Camera preview is not ready. Please close and reopen the scanner.")
        return
      }

      const mediaStream = await requestCameraPermission()
      setStream(mediaStream)

      const video = videoRef.current
      video.srcObject = mediaStream
      await waitForVideoPlayback(video)

      const hints = new Map()
      hints.set(2, [BarcodeFormat.QR_CODE])
      hints.set(3, true)

      // Longer play timeout so ZXing does not reject(false) on slow devices.
      const codeReader = new BrowserMultiFormatReader(hints, {
        tryPlayVideoTimeout: 20_000,
        delayBetweenScanAttempts: 300,
      })
      codeReaderRef.current = codeReader

      // Keep our stream; decodeFromVideoElement does not dispose tracks on stop.
      const controls = await codeReader.decodeFromVideoElement(video, (result, error) => {
        if (result) {
          if (!decoderActiveRef.current || processingRef.current) return

          const text = result.getText()
          const formatStr = result.getBarcodeFormat().toString()

          stopActiveDecoder()
          void handleScanSuccess(text, formatStr)
        }
        if (error && error.name !== "NotFoundException") {
          // NotFoundException is normal while searching for a QR code.
        }
      })

      scannerControlsRef.current = controls
      setScannerState((prev) => ({ ...prev, isLoading: false, isScanning: true, error: null }))
    } catch (error) {
      const message =
        error === false
          ? "Camera preview timed out. Close other apps using the camera, then tap Retry."
          : error instanceof Error
            ? error.message
            : "Failed to start scanner"
      failStart(message, error)
    }
  }, [
    requestCameraPermission,
    handleScanSuccess,
    toast,
    isDecoding,
    stopActiveDecoder,
  ])

  // Close scanner
  const closeScanner = useCallback(() => {
    stopActiveDecoder()
    setIsDecoding(false)
    scannerStartAttemptedRef.current = false
    // Keep lastScannedCodeRef / lastScanTimeRef so a still-active decoder frame
    // cannot immediately re-hit scan-qr with the same QR after a failed attempt.

    if (codeReaderRef.current) {
      try {
        codeReaderRef.current = null
      } catch {
        // Ignore errors during cleanup
      }
    }

    // Clear any timeouts
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current)
      scanTimeoutRef.current = null
    }

    // Stop all video tracks to turn off camera
    // Get stream from state first, then from video element as fallback
    let mediaStream: MediaStream | null = stream
    
    // If stream is not in state, try to get it from video element
    if (!mediaStream && videoRef.current && videoRef.current.srcObject) {
      mediaStream = videoRef.current.srcObject as MediaStream
    }

    // Stop all tracks from the stream
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        track.stop()
        track.enabled = false
      })
    }

    // Clear video element source and pause video
    if (videoRef.current) {
      // Pause the video element
      videoRef.current.pause()
      // Clear the source
      if (videoRef.current.srcObject) {
        const videoStream = videoRef.current.srcObject as MediaStream
        videoStream.getTracks().forEach((track) => {
          track.stop()
          track.enabled = false
        })
      }
      videoRef.current.srcObject = null
      // Clear any remaining references
      videoRef.current.load()
    }

    // Clear stream state
    setStream(null)

    setScannerState({
      isOpen: false,
      isLoading: false,
      isScanning: false,
      error: null,
      hasPermission: false,
    })

    processingRef.current = false
  }, [stream, stopActiveDecoder])

  // Open scanner
  const openScanner = useCallback(() => {
    // Allow retrying a QR that previously failed once the user reopens the scanner.
    qrScanLockRef.current = { text: null, until: 0 }
    scannerStartAttemptedRef.current = false
    const restoredBatch = loadDriverScanBatch()
    if (restoredBatch && !qrScanDataRef.current) {
      setQrScanData(restoredBatch)
      qrScanDataRef.current = restoredBatch
    }
    setScannerState((prev) => {
      const newState = { ...prev, isOpen: true }
      return newState
    })
  }, [])

  // Effect to start scanner when dialog opens (once per open; manual Retry calls startScanner directly).
  useEffect(() => {
    if (!scannerState.isOpen || scannerStartAttemptedRef.current || isDecoding) return
    if (scannerState.isScanning || scannerState.isLoading) return

    scannerStartAttemptedRef.current = true
    const timerId = window.setTimeout(() => {
      void startScanner()
    }, 150)
    return () => window.clearTimeout(timerId)
  }, [scannerState.isOpen, scannerState.isScanning, scannerState.isLoading, isDecoding, startScanner])

  // Open scanner from driver pickup modal (Add Slip) or native-camera landing page.
  useEffect(() => {
    const handleOpenScannerRequest = () => {
      const restoredBatch = loadDriverScanBatch()
      if (restoredBatch) {
        setQrScanData(restoredBatch)
        qrScanDataRef.current = restoredBatch
      }
      setShowDriverHistoryModal(false)
      openScanner()
    }
    window.addEventListener(DRIVER_QR_SCANNER_OPEN_EVENT, handleOpenScannerRequest)
    return () => window.removeEventListener(DRIVER_QR_SCANNER_OPEN_EVENT, handleOpenScannerRequest)
  }, [openScanner])

  // Effect to ensure camera is stopped when dialog closes
  useEffect(() => {
    if (!scannerState.isOpen) {
      // Dialog is closed, ensure camera is turned off
      if (videoRef.current && videoRef.current.srcObject) {
        const mediaStream = videoRef.current.srcObject as MediaStream
        mediaStream.getTracks().forEach((track) => {
          track.stop()
          track.enabled = false
        })
        videoRef.current.pause()
        videoRef.current.srcObject = null
        videoRef.current.load()
      }
      
      // Also stop any stream in state
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop()
          track.enabled = false
        })
        setStream(null)
      }

      // Stop code reader
      if (codeReaderRef.current) {
        try {
          ;(codeReaderRef.current as any)?.reset?.()
          codeReaderRef.current = null
        } catch (error) {
          // Ignore errors
        }
      }
    }
  }, [scannerState.isOpen, stream])

  // Debug effect to track modal state changes
  useEffect(() => {
  }, [showDriverHistoryModal, qrScanData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear timeouts
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
        scanTimeoutRef.current = null
      }
      
      // Stop code reader
      if (codeReaderRef.current) {
        try {
          ;(codeReaderRef.current as any)?.reset?.()
          codeReaderRef.current = null
        } catch (error) {
          // Ignore errors
        }
      }
      
      // Stop camera from video element
      if (videoRef.current && videoRef.current.srcObject) {
        const mediaStream = videoRef.current.srcObject as MediaStream
        mediaStream.getTracks().forEach((track) => {
          track.stop()
          track.enabled = false
        })
        videoRef.current.pause()
        videoRef.current.srcObject = null
      }
      
      // Stop stream from state
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop()
          track.enabled = false
        })
      }
    }
  }, [stream])

  // Copy to clipboard
  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        toast({
          title: "Copied to clipboard",
          description: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
        })
      } catch (error) {
        console.error("Failed to copy:", error)
      }
    },
    [toast],
  )

  // Clear scan history
  const clearScanHistory = useCallback(() => {
    setScanHistory([])
    localStorage.removeItem("qr-scan-history")
    toast({
      title: "History cleared",
      description: "All scan history has been removed.",
    })
  }, [toast])

  const getPrimaryRole = () => {
    if (!isActingAsLabAdmin && userRoles.includes("superadmin")) return "Super Admin"
    if (isActingAsLabAdmin || userRoles.includes("lab_admin")) return "Lab Admin"
    if (userRoles.includes("office_admin")) return "Office Admin"
    if (userRoles.includes("doctor_admin")) return "Doctor Admin"
    if (userRoles.includes("lab_user")) return "Lab User"
    if (userRoles.includes("office_user")) return "Office User"
    if (userRoles.includes("doctor")) return "Doctor"
    return "User"
  }

  const getInitials = (name: string) => {
    if (!name) return "U"
    const names = name.split(" ")
    if (names.length === 1) return names[0].charAt(0).toUpperCase()
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
  }

  // Add a type guard for Location
  function isLocation(obj: any): obj is Location {
    return obj && (typeof obj.id === 'number' || typeof obj.id === 'string') && typeof obj.name === 'string';
  }

  // Ensure safeLocations is only valid Location objects
  const safeLocations = Array.isArray(locations) ? locations.filter(isLocation) : []

  const handleLocationChange = async (value: string) => {
    const locationId = Number(value)
    if (!Number.isFinite(locationId) || locationId === selectedLocation) return

    if (!isSuperAdmin) {
      const location = safeLocations.find((loc) => loc.id === locationId)
      if (!location) return
    }

    setIsSwitchingProfile(true)
    try {
      await setCustomerId(locationId, { reload: true })
    } catch (error) {
      console.error("Failed to switch location:", error)
      setIsSwitchingProfile(false)
      toast({
        title: "Error",
        description: "Failed to switch location. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <TrialBanner />
      <LoadingOverlay
        isLoading={isSwitchingProfile}
        title="Switching location..."
        message="Loading your profile"
        zIndex={99999}
      />
      <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur-sm shadow-sm dark:bg-gray-900/95 dark:border-gray-800">
        <div className=" mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          {/* Main Header Row */}
          <div className="flex items-center justify-between gap-3 sm:gap-4 md:gap-6 py-1">
            {/* Left Section - Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 flex-shrink-0">
              <HeaderWaffleLauncher />
              <Image
                src="/images/rxn3d-latest.png"
                alt="RXN3D"
                width={195}
                height={76}
                priority
                className="hidden sm:block h-10 sm:h-12 md:h-14 lg:h-16 w-auto object-contain flex-shrink-0"
              />
              {!isSuperAdmin && canCreateSlip && (
                <Button
                  className={`${NEW_SLIP_BUTTON_CLASS} hidden sm:inline-flex`}
                  onClick={() => {
                    clearSlipCreationStorage();
                    clearCaseDesignCenterStateMutation.mutate();
                    router.replace("/case-design-center");
                  }}
                >
                  <span>{t("header.newSlip", "+ New Slip")}</span>
                </Button>
              )}
              {canCreateOffice && (
                <Button
                  size="sm"
                  className={`${HEADER_ACTION_BUTTON_CLASS} hidden sm:inline-flex`}
                  onClick={() => setShowNewOfficeModal(true)}
                >
                  <span>{t("header.newOffice", "New Office")}</span>
                </Button>
              )}
              {isSuperAdmin && (
                <Button
                  size="sm"
                  className={`${HEADER_ACTION_BUTTON_CLASS} hidden sm:inline-flex`}
                  onClick={() => setShowNewLabModal(true)}
                >
                  <span>{t("header.newLab", "New Lab")}</span>
                </Button>
              )}
              {canScanCode && (
                <Button
                  variant="ghost"
                  className={`${SCAN_CODE_BUTTON_CLASS} hidden sm:inline-flex`}
                  onClick={openScanner}
                  aria-label={t("header.openScanner", "Open QR code scanner")}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mr-2.5">
                    <defs>
                      <linearGradient id="qr-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#C9539F" />
                        <stop offset="51.11%" stopColor="#82298D" />
                        <stop offset="100%" stopColor="#2AA6DE" />
                      </linearGradient>
                    </defs>
                    <path d="M3 3h7v7H3V3zm1 1v5h5V4H4zm1 1h3v3H5V5zm8-2h7v7h-7V3zm1 1v5h5V4h-5zm1 1h3v3h-3V5zM3 13h7v7H3v-7zm1 1v5h5v-5H4zm1 1h3v3H5v-3zm9-1h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm-4-6h2v2h-2v-2zm0 4h2v2h-2v-2zm4-2h2v2h-2v-2z" fill="url(#qr-grad)" />
                  </svg>
                  <span style={{
                    background: "linear-gradient(231.46deg, #2AA6DE -14.5%, #82298D 51.11%, #C9539F 116.71%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    fontWeight: 700,
                    fontSize: "18px",
                    lineHeight: "21px",
                    fontFamily: "Inter, sans-serif",
                  }}>{t("header.scanCode", "Scan Code")}</span>
                  {scanHistory.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-[#82298D] text-white font-semibold rounded-full"
                    >
                      {scanHistory.length}
                    </Badge>
                  )}
                </Button>
              )}
            </div>

            {/* Center Section - Logo or Search */}
            <div className="flex-1 flex items-center justify-center min-w-0 mx-2 sm:mx-4 md:mx-6">
              {isSuperAdmin ? (
                <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="search"
                      placeholder={t("header.searchLab", "Search Lab")}
                      className="w-full pl-10 pr-4 h-8 sm:h-9 md:h-10 text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1162a8] focus:border-[#1162a8] dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>
                </div>
              ) : (
                <div className="hidden 2xl:flex [body[data-sidebar-expanded='false']_&]:flex items-center justify-center max-w-full">
                  {(() => {
                    const selectedLocationObj = typeof window !== 'undefined'
                      ? JSON.parse(localStorage.getItem("selectedLocation") || "null")
                      : null
                    const customerId = selectedLocation || selectedLocationObj?.id || null
                    return customerId ? (
                      <CustomerLogo
                        customerId={customerId}
                        alt="Company Logo"
                        className="h-10 sm:h-14 md:h-16 lg:h-[72px] w-auto object-contain max-w-[240px] sm:max-w-[280px] md:max-w-[320px] lg:max-w-[360px]"
                      />
                    ) : null
                  })()}
                </div>
              )}
            </div>

            {/* Right Section - Controls & User */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
              {/* Location Selector - Desktop */}
              {(isSuperAdmin || isActingAsLabAdmin) && superAdminLabs.length > 0 && (
                <div className="hidden md:block min-w-0">
                  <Select
                    value={selectedCustomerId !== null ? selectedCustomerId!.toString() : ""}
                    onValueChange={handleLocationChange}
                  >
                    <SelectTrigger className="w-[140px] lg:w-[180px] xl:w-[220px] h-8 sm:h-9 md:h-10 text-xs sm:text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1162a8] dark:bg-gray-800 dark:border-gray-700">
                      <Building2 className="h-4 w-4 mr-1 flex-shrink-0 text-gray-500" />
                      <SelectValue placeholder={t("header.selectLab", "Select Lab")} />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg">
                      <SelectGroup>
                        <SelectLabel className="font-medium text-gray-700 dark:text-gray-300">Labs</SelectLabel>
                        {superAdminLabs.map((lab) => (
                          <SelectItem
                            key={lab.id}
                            value={lab.id.toString()}
                            className="hover:bg-blue-50 dark:hover:bg-gray-800"
                          >
                            {lab.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {!isSuperAdmin && safeLocations.length > 0 && (
                <div className="hidden md:block min-w-0">
                  <Select
                    value={selectedLocation !== null ? selectedLocation.toString() : ""}
                    onValueChange={handleLocationChange}
                  >
                    <SelectTrigger className="w-[140px] lg:w-[180px] xl:w-[220px] h-8 sm:h-9 md:h-10 text-xs sm:text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1162a8] dark:bg-gray-800 dark:border-gray-700">
                      <SelectValue placeholder={t("header.selectLocation", "Location")} />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg">
                      <SelectGroup>
                        <SelectLabel className="font-medium text-gray-700 dark:text-gray-300">Locations</SelectLabel>
                        {safeLocations.map((location) => (
                          <SelectItem
                            key={location.id}
                            value={location.id.toString()}
                            className="hover:bg-blue-50 dark:hover:bg-gray-800"
                          >
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}


              {/* Language Switcher - Desktop */}
              {/* <div className="hidden lg:block">
                <LanguageSwitcher />
              </div> */}

              {/* Exit Lab View - shown when superadmin is acting as lab admin */}
              {isActingAsLabAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex h-8 sm:h-9 text-xs border-orange-400 text-orange-600 hover:bg-orange-50 dark:border-orange-500 dark:text-orange-400 dark:hover:bg-orange-950"
                  onClick={exitLabContext}
                >
                  Exit Lab View
                </Button>
              )}

              {/* Settings Icon */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 sm:h-9 sm:w-9 p-0 hidden sm:inline-flex"
                aria-label="Settings"
                onClick={() => router.push("/dashboard/settings")}
              >
                <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400 hover:text-[#1162a8] dark:hover:text-[#1162a8]" />
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 lg:h-14 lg:w-14 p-0 rounded-full hover:ring-2 hover:ring-[#1162a8] transition-all"
                  >
                    <Avatar className="h-full w-full ring-2 ring-gray-200 dark:ring-gray-700">
                      <AvatarImage
                        src={getUserAvatar(getUserProfileImageUrl(user) || null)}
                        alt={user?.first_name || t("header.user")}
                      />
                      <AvatarFallback className="bg-[#1162a8] text-white font-medium text-sm sm:text-base">
                        {getInitials(user?.first_name || "")}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-56 rounded-lg shadow-lg border-gray-200 dark:border-gray-700" 
                  align="end" 
                  sideOffset={8}
                >
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.first_name || t("header.user")}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email || "user@example.com"}</p>
                      <p className="text-xs text-muted-foreground">{getPrimaryRole()}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={async () => {
                      setIsLoadingProfile(true)
                      setShowUserProfileModal(true)
                      try {
                        const profileData = await fetchCurrentUserProfile()
                        setUserProfileData(profileData)
                      } catch (error) {
                        console.error("Failed to fetch user profile:", error)
                        setShowUserProfileModal(false)
                        toast({
                          title: "Error",
                          description: "Failed to load user profile",
                          variant: "destructive",
                        })
                      } finally {
                        setIsLoadingProfile(false)
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400 cursor-pointer">
                    {t("header.signOut", "Sign Out")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Secondary Row - Mobile Only */}
          <div className="flex flex-col gap-2 pb-2 sm:hidden border-t border-gray-200 dark:border-gray-800 pt-2">
            {/* Mobile action buttons: New Slip + Scan Code */}
            {!isSuperAdmin && (
              <div className="flex gap-2">
                {canCreateSlip && (
                  <Button
                    className={`${NEW_SLIP_BUTTON_CLASS} flex-1 w-auto`}
                    onClick={() => {
                      clearSlipCreationStorage();
                      clearCaseDesignCenterStateMutation.mutate();
                      router.replace("/case-design-center");
                    }}
                  >
                    <span>{t("header.newSlip", "+ New Slip")}</span>
                  </Button>
                )}
                {canScanCode && (
                  <Button
                    variant="ghost"
                    className={`${SCAN_CODE_BUTTON_CLASS} flex-1 w-auto`}
                    onClick={openScanner}
                    aria-label={t("header.openScanner", "Open QR code scanner")}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mr-1.5">
                      <defs>
                        <linearGradient id="qr-grad-mobile" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#C9539F" />
                          <stop offset="51.11%" stopColor="#82298D" />
                          <stop offset="100%" stopColor="#2AA6DE" />
                        </linearGradient>
                      </defs>
                      <path d="M3 3h7v7H3V3zm1 1v5h5V4H4zm1 1h3v3H5V5zm8-2h7v7h-7V3zm1 1v5h5V4h-5zm1 1h3v3h-3V5zM3 13h7v7H3v-7zm1 1v5h5v-5H4zm1 1h3v3H5v-3zm9-1h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm-4-6h2v2h-2v-2zm0 4h2v2h-2v-2zm4-2h2v2h-2v-2z" fill="url(#qr-grad-mobile)" />
                    </svg>
                    <span style={{
                      background: "linear-gradient(231.46deg, #2AA6DE -14.5%, #82298D 51.11%, #C9539F 116.71%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      fontWeight: 700,
                      fontSize: "16px",
                      lineHeight: "21px",
                      fontFamily: "Inter, sans-serif",
                    }}>{t("header.scanCode", "Scan Code")}</span>
                    {scanHistory.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-[#82298D] text-white font-semibold rounded-full"
                      >
                        {scanHistory.length}
                      </Badge>
                    )}
                  </Button>
                )}
              </div>
            )}
            {/* Location Selector - Mobile */}
            {(isSuperAdmin || isActingAsLabAdmin) && superAdminLabs.length > 0 && (
              <Select
                value={selectedCustomerId !== null ? selectedCustomerId!.toString() : ""}
                onValueChange={handleLocationChange}
              >
                <SelectTrigger className="w-full h-8 text-xs border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1162a8]">
                  <SelectValue placeholder={t("header.selectLab", "Select Lab")} />
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg">
                  <SelectGroup>
                    <SelectLabel className="font-medium text-gray-700">Labs</SelectLabel>
                    {superAdminLabs.map((lab) => (
                      <SelectItem
                        key={lab.id}
                        value={lab.id.toString()}
                        className="hover:bg-blue-50"
                      >
                        {lab.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
            {!isSuperAdmin && safeLocations.length > 0 && (
              <Select
                value={selectedLocation !== null ? selectedLocation.toString() : ""}
                onValueChange={handleLocationChange}
              >
                <SelectTrigger className="w-full h-8 text-xs border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1162a8]">
                  <SelectValue placeholder={t("header.selectLocation", "Select location")} />
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg">
                  <SelectGroup>
                    <SelectLabel className="font-medium text-gray-700">Locations</SelectLabel>
                    {safeLocations.map((location) => (
                      <SelectItem
                        key={location.id}
                        value={location.id.toString()}
                        className="hover:bg-blue-50"
                      >
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </header>

      <DashboardInviteModal
        type="Office"
        title="Invite Your Practice"
        description="Connect with dental practices to start receiving cases and managing your digital workflow."
        isOpen={showNewOfficeModal}
        forceOpen
        onClose={() => setShowNewOfficeModal(false)}
      />

      <DashboardInviteModal
        type="Lab"
        title="Invite a Lab"
        description="Connect with dental labs to start sending cases and managing your digital workflow."
        searchPlaceholder="Search by lab name, city or email..."
        isOpen={showNewLabModal}
        forceOpen
        onClose={() => setShowNewLabModal(false)}
      />

      {/* Enhanced Scanner Dialog with maintained functionality */}
      <Dialog
        open={scannerState.isOpen}
        onOpenChange={(open) => {
          if (!open) closeScanner()
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[600px] lg:max-w-[700px] xl:max-w-[800px] 2xl:max-w-[900px] max-w-[95vw] w-full mx-auto overflow-hidden"
        >
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center text-sm sm:text-base lg:text-lg xl:text-xl">
              <span>QR Code Scanner: Position QR code in the frame</span>
              <Button variant="ghost" size="icon" onClick={closeScanner} className="h-6 w-6 sm:h-8 sm:w-8 lg:h-9 lg:w-9 xl:h-10 xl:w-10">
                <X className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Scanner view */}
          <div className="space-y-3 sm:space-y-4 lg:space-y-5 xl:space-y-6">
            <LoadingOverlay
              isLoading={scannerState.isLoading}
              title="Loading camera..."
              message="Please wait while we initialize the camera"
              zIndex={99999}
            />

            {scannerState.error && (
              <div className="text-center p-3 sm:p-4 lg:p-5 xl:p-6 bg-red-50 rounded-lg lg:rounded-xl transform transition-all duration-300">
                <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 xl:h-12 xl:w-12 mx-auto mb-2 text-red-500" />
                <p className="text-red-700 text-sm sm:text-base lg:text-lg xl:text-xl mb-3">{scannerState.error}</p>
                {scannerState.error.includes("permission") && (
                  <div className="mb-3 text-xs sm:text-sm text-red-600 bg-red-100 p-2 rounded">
                    <p className="font-semibold mb-1">How to enable camera access:</p>
                    <ul className="text-left list-disc list-inside space-y-1">
                      <li>Click the camera icon in your browser's address bar</li>
                      <li>Select "Allow" for camera permissions</li>
                      <li>Refresh the page and try again</li>
                    </ul>
                  </div>
                )}
                <Button className="mt-2 lg:mt-3 xl:mt-4 transform transition-transform hover:scale-105 text-xs sm:text-sm lg:text-base xl:text-lg px-4 lg:px-6 xl:px-8 py-2 lg:py-2.5 xl:py-3" onClick={() => {
                  scannerStartAttemptedRef.current = true
                  void startScanner()
                }}>
                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 mr-2" />
                  Retry
                </Button>
              </div>
            )}

            <div className="relative aspect-video bg-black rounded-lg lg:rounded-xl overflow-hidden shadow-2xl">
              <video
                ref={videoRef}
                className="w-full h-full object-cover bg-black"
                autoPlay
                muted
                playsInline
              />

              {scannerState.isScanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Larger, more visible scanning frame */}
                  <div className="w-48 h-48 sm:w-56 sm:h-56 lg:w-72 lg:h-72 xl:w-80 xl:h-80 2xl:w-96 2xl:h-96 relative">
                    {/* Main scanning frame */}
                    <div className="w-full h-full border-4 border-white/30 rounded-2xl relative">
                      {/* Corner brackets for better visibility */}
                      <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-2xl"></div>
                      <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-2xl"></div>
                      <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-2xl"></div>
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-2xl"></div>
                      
                      {/* Scanning line animation */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse"></div>
                      <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-green-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-ping opacity-75"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Overlay to help with focus */}
              <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
            </div>

            {/* Recent scans */}
            {scanHistory.length > 0 && (
              <div className="space-y-2 lg:space-y-3 xl:space-y-4">
                <h4 className="text-sm sm:text-base lg:text-lg xl:text-xl font-medium">Recent Scans</h4>
                <div className="space-y-1 lg:space-y-2 max-h-24 sm:max-h-32 lg:max-h-40 xl:max-h-48 overflow-y-auto">
                  {scanHistory.slice(0, 3).map((scan, index) => (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between p-2 sm:p-2.5 lg:p-3 xl:p-4 bg-muted rounded-lg lg:rounded-xl text-xs sm:text-sm lg:text-base transform transition-all duration-300 hover:scale-105 hover:shadow-md"
                    >
                      <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                        <span className="font-mono truncate">{scan.text.substring(0, 20)}...</span>
                        <Badge variant="outline" className="text-xs sm:text-sm lg:text-base flex-shrink-0">
                          {scan.format}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(scan.text)}
                        className="transform transition-transform hover:scale-110 flex-shrink-0 text-xs sm:text-sm lg:text-base px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2"
                      >
                        Copy
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-2 sm:gap-3 lg:gap-4 xl:gap-5 flex-wrap">
              <Button
                onClick={() => {
                  scannerStartAttemptedRef.current = true
                  void startScanner()
                }}
                disabled={scannerState.isScanning || isDecoding}
                className="transform transition-all duration-200 hover:scale-105 hover:shadow-lg text-xs sm:text-sm lg:text-base xl:text-lg px-3 sm:px-4 lg:px-6 xl:px-8 py-2 sm:py-2.5 lg:py-3 xl:py-3.5 flex-1 sm:flex-none"
              >
                {scannerState.isScanning ? (
                  <>
                    <div className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span className="hidden sm:inline">Scanning...</span>
                    <span className="sm:hidden">Scan...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Start Scanner</span>
                    <span className="sm:hidden">Start</span>
                  </>
                )}
              </Button>
              <Button
                onClick={closeScanner}
                variant="outline"
                className="transform transition-all duration-200 hover:scale-105 text-xs sm:text-sm lg:text-base xl:text-lg px-3 sm:px-4 lg:px-6 xl:px-8 py-2 sm:py-2.5 lg:py-3 xl:py-3.5"
              >
                Close
              </Button>
              <Button
                onClick={clearScanHistory}
                variant="outline"
                disabled={scanHistory.length === 0}
                className="transform transition-all duration-200 hover:scale-105 disabled:hover:scale-100 text-xs sm:text-sm lg:text-base xl:text-lg px-3 sm:px-4 lg:px-6 xl:px-8 py-2 sm:py-2.5 lg:py-3 xl:py-3.5 hidden sm:inline-flex"
              >
                Clear History
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Driver History Modal */}
      {qrScanData && Array.isArray(qrScanData.data) && qrScanData.data.length > 0 && (
        <DriverHistoryModal
          isOpen={showDriverHistoryModal}
          onClose={() => {
            setShowDriverHistoryModal(false);
            setQrScanData(null);
            scannedQrTextsRef.current.clear();
            if (qrSessionRef.current) {
              void clearDriverSession(qrSessionRef.current);
              qrSessionRef.current = null;
            }
            saveDriverSessionKey(null);
            clearDriverScanBatch();
          }}
          qrScanData={qrScanData.data}
          onRequestScan={() => {
            persistDriverScanBatch(qrScanData)
            setShowDriverHistoryModal(false);
            openScanner();
          }}
          onSubmitted={() => {
            if (qrSessionRef.current) {
              void clearDriverSession(qrSessionRef.current);
              qrSessionRef.current = null;
            }
            scannedQrTextsRef.current.clear();
            saveDriverSessionKey(null);
            clearDriverScanBatch();
          }}
        />
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showUserProfileModal}
        onClose={() => {
          setShowUserProfileModal(false);
          setUserProfileData(null);
        }}
        userData={userProfileData}
        isLoading={isLoadingProfile}
        onSave={async (input: UpdateMeProfileInput) => {
          try {
            const updated = await updateCurrentUserProfile(input)
            setUserProfileData(updated)
            const imageUrl = updated.image ?? updated.avatar
            updateSessionUser({
              first_name: updated.first_name,
              last_name: updated.last_name,
              mobile: updated.phone ?? updated.mobile,
              ...(imageUrl ? { image: imageUrl, avatar: imageUrl } : {}),
            })
            toast({
              title: "Profile updated",
              description: "Your profile has been saved.",
            })
            return updated
          } catch (error) {
            console.error("Failed to update profile:", error)
            toast({
              title: "Error",
              description:
                error instanceof Error ? error.message : "Failed to update profile",
              variant: "destructive",
            })
            throw error
          }
        }}
      />

    </>
  )
}
