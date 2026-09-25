// app/components/DriverHistoryModal.tsx

"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Plus, Loader2, AlertCircle, Trash2, QrCode } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDriverSlip, QRScanResponseData } from "@/contexts/DriverSlipContext"
import { useSlipContext } from "../app/lab-case-management/SlipContext"
import { useToast } from "@/hooks/use-toast"
import {
  loadDriverSessionKey,
  beginPickupAddSlipScan,
  DRIVER_QR_PICKUP_SLIP_SCANNED_EVENT,
  DRIVER_QR_SCANNER_CLOSED_EVENT,
} from "@/lib/driver-qr-scan"
import { apiClient } from "@/lib/api/client"
import {
  buildPickupDeliveryEntryFromSlip,
  type PickupDeliveryEntry,
} from "@/lib/virtual-slip-pickup-entry"
import {
  slipPickupDropoffAction,
  slipNextLocationIdFromRef,
  filterValidQrScanSlips,
  slipLocationsMatch,
  slipIsOfficeDropoff,
  slipIsLabDropoff,
  slipHasPhysicalImpression,
  googleMapsSearchUrl,
  slipDirectionsAddress,
  type SlipPickupDropoffAction,
} from "@/lib/slip-location"
import { postSlipDriverHistoryChangeLocation } from "@/lib/api/slip-driver-history"
import { getCurrentUserName } from "@/lib/current-user"
import { useSignatureRequirementSettings } from "@/hooks/use-signature-requirement-settings"
import { driverActionRequiresSignature } from "@/lib/slip-settings-utils"
import type { UploadedImage } from "@/lib/image-to-base64"
import {
  CaseDriverHistorySection,
  DeliveryInfoBar,
  DeliveryModalFooter,
  DeliveryModalHeader,
  ImageDropzone,
  SignaturePad,
  type DeliveryInfoField,
} from "@/components/driver-delivery/delivery-parts"

/** First non-empty, trimmed string among the given values (or "" if none). */
function firstNonEmpty(...values: unknown[]): string {
  for (const v of values) {
    if (v != null && String(v).trim() !== "") return String(v).trim()
  }
  return ""
}

function pickupDropoffModalCopy(action: SlipPickupDropoffAction | null) {
  if (action === "dropoff") {
    return { title: "Drop off", confirmLabel: "Drop off" }
  }
  if (action === "pickup") {
    return { title: "Pick up", confirmLabel: "Pick up" }
  }
  return { title: "Pick up / Drop off", confirmLabel: "Confirm" }
}

type DeliveryEntry = PickupDeliveryEntry

function DirectionsIcon() {
  return (
    <svg width="30" height="26" viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M8.33761 17.114C8.33761 17.6369 8.13442 18.1383 7.77275 18.508C7.41107 18.8777 6.92053 19.0854 6.40904 19.0854C5.89755 19.0854 5.40701 18.8777 5.04533 18.508C4.68366 18.1383 4.48047 17.6369 4.48047 17.114C4.48047 16.5912 4.68366 16.0897 5.04533 15.72C5.40701 15.3503 5.89755 15.1426 6.40904 15.1426C6.92053 15.1426 7.41107 15.3503 7.77275 15.72C8.13442 16.0897 8.33761 16.5912 8.33761 17.114Z" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.2307 17.1141C11.2307 21.8074 6.40932 24.507 6.40932 24.507C6.40932 24.507 1.58789 21.8074 1.58789 17.1141C1.58789 15.807 2.09586 14.5534 3.00005 13.6291C3.90425 12.7048 5.1306 12.1855 6.40932 12.1855C7.68804 12.1855 8.91439 12.7048 9.81858 13.6291C10.7228 14.5534 11.2307 15.807 11.2307 17.1141Z" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M25.695 6.60033C25.695 7.12319 25.4918 7.62463 25.1302 7.99435C24.7685 8.36406 24.278 8.57176 23.7665 8.57176C23.255 8.57176 22.7644 8.36406 22.4028 7.99435C22.0411 7.62463 21.8379 7.12319 21.8379 6.60033C21.8379 6.07748 22.0411 5.57604 22.4028 5.20632C22.7644 4.83661 23.255 4.62891 23.7665 4.62891C24.278 4.62891 24.7685 4.83661 25.1302 5.20632C25.4918 5.57604 25.695 6.07748 25.695 6.60033Z" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28.5882 6.60045C28.5882 11.2938 23.7667 13.9933 23.7667 13.9933C23.7667 13.9933 18.9453 11.2938 18.9453 6.60045C18.9453 5.29331 19.4533 4.03971 20.3575 3.11542C21.2617 2.19113 22.488 1.67188 23.7667 1.67188C25.0455 1.67188 26.2718 2.19113 27.176 3.11542C28.0802 4.03971 28.5882 5.29331 28.5882 6.60045Z" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.08789 24.6725H25.1412C26.6897 24.6725 27.945 23.4172 27.945 21.8687V21.8687C27.945 20.3202 26.6897 19.0649 25.1412 19.0649H20.3172C18.9623 19.0649 17.8639 17.9665 17.8639 16.6115V16.6115C17.8639 15.2566 18.9623 14.1582 20.3172 14.1582H24.2486" stroke="#1162A8" strokeWidth="1.5" />
    </svg>
  )
}

/** Opens Google Maps for the lab/office address where the slip is going. */
function DirectionsLink({
  locationId,
  location,
  labAddress,
  officeAddress,
  className,
}: {
  locationId?: number
  location: string
  labAddress?: string
  officeAddress?: string
  className?: string
}) {
  const address = slipDirectionsAddress(
    { locationId, location },
    { labAddress, officeAddress }
  )
  const href = googleMapsSearchUrl(address)
  if (!href || !address) {
    return (
      <span
        className={cn("inline-flex opacity-40", className)}
        title="Address unavailable"
        aria-label="Directions unavailable"
      >
        <DirectionsIcon />
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex rounded-md p-0.5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162A8]",
        className
      )}
      title={`Open directions to ${address}`}
      aria-label={`Open Google Maps directions to ${address}`}
      onClick={(e) => e.stopPropagation()}
    >
      <DirectionsIcon />
    </a>
  )
}

interface DriverHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  slip?: any
  qrScanData?: QRScanResponseData[] // Optional QR scan data to pre-populate
  /** Virtual slip: use loaded slip details only — do not POST /slip/pickup-delivery-slips */
  singleSlipMode?: boolean
  /** QR flow: reopen the scanner to add another case (keeps the session). */
  onRequestScan?: () => void
  /** QR flow: called after scanned slips are submitted successfully (clear session). */
  onSubmitted?: () => void
  /** QR flow: parent sync after removing a case (or emptying the batch). */
  onQrBatchChange?: (remaining: QRScanResponseData[]) => void
  /** QR flow: clear entire batch + session (parent closes / resets). */
  onClearBatch?: () => void
}

export default function DriverHistoryModal({
  isOpen,
  onClose,
  slip,
  qrScanData,
  singleSlipMode = false,
  onRequestScan,
  onSubmitted,
  onQrBatchChange,
  onClearBatch,
}: DriverHistoryModalProps) {
  const [deliveryEntries, setDeliveryEntries] = useState<DeliveryEntry[]>([])
  const [signature, setSignature] = useState("")
  const [image, setImage] = useState<UploadedImage | null>(null)
  const { qrScanData: contextQrScanData, qrScanLoading, qrScanError, sessionKey } = useDriverSlip()
  const { submitScannedSlips, fetchPickupDeliverySlips, removeScannedCase, clearDriverSession } = useSlipContext()
  const { toast } = useToast()
  const [loadingPickup, setLoadingPickup] = useState(false)
  const [pickupError, setPickupError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [removingCaseId, setRemovingCaseId] = useState<number | null>(null)
  const [clearingBatch, setClearingBatch] = useState(false)
  const [addingByScan, setAddingByScan] = useState(false)
  const lastFetchedSlipIdRef = useRef<number | null>(null)
  const addingByScanRef = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Convert QR scan data to delivery entries (valid pick-up / drop-off locations only)
  const convertQRDataToDeliveryEntries = (qrData: QRScanResponseData[]): DeliveryEntry[] => {
    return filterValidQrScanSlips(qrData).map((item, index) => ({
      id: `qr-${item.slip_id}-${index}`,
      // Show the code when the backend provides one, otherwise the full name.
      // Note: customer_code is the lab's code here, so it must not feed office.
      office: firstNonEmpty(item.office_code, item.office_name),
      labName: firstNonEmpty(item.lab_code, item.lab_name),
      patientName: item.patient_name,
      // Prefer real slip location (not current_driver_location display alias).
      location: item.location || item.current_driver_location,
      isChecked: true, // Auto-select QR scanned items
      case_id: item.case_id,
      slip_id: item.slip_id,
      case_number: item.case_number,
      slip_number: item.slip_number,
      casepan_number: item.casepan_number,
      location_id:
        typeof item.location_id === "number"
          ? item.location_id
          : Number(item.location_id) || undefined,
      customer_code: item.customer_code,
      customer_id: item.customer_id,
      lab_address: firstNonEmpty(item.lab_address) || undefined,
      office_address: firstNonEmpty(item.office_address) || undefined,
      // Missing flag ⇒ assume physical so lab drop-off still requires a photo.
      has_physical_impression:
        typeof item.has_physical_impression === "boolean"
          ? item.has_physical_impression
          : true,
    }))
  }

  // Update delivery entries when QR scan data is available (listing / header scan flows)
  useEffect(() => {
    if (singleSlipMode) return
    const activeQrData = qrScanData || contextQrScanData?.data
    const validQrData = activeQrData ? filterValidQrScanSlips(activeQrData) : []
    if (validQrData.length > 0) {
      const qrEntries = convertQRDataToDeliveryEntries(validQrData)
      setDeliveryEntries(qrEntries)
    } else if (activeQrData && activeQrData.length > 0) {
      setDeliveryEntries([])
      setPickupError("No slips in a valid pick-up or drop-off location.")
    }
  }, [qrScanData, contextQrScanData, singleSlipMode])

  // Derive a stable primitive slipId from the slip prop to avoid effect loops
  const slipId = useMemo(() => {
    if (!slip) return null
    return typeof slip === 'number' ? slip : slip.slip_id || slip.id || null
  }, [slip])

  /** Location of the slip that opened this modal. The list stays on this location only. */
  const anchorLocation = useMemo(() => {
    if (!slip || typeof slip === "number") return null
    const raw = slip as Record<string, unknown>
    const locationObj = raw.location
    const locationName =
      typeof locationObj === "string"
        ? locationObj
        : firstNonEmpty(
            (locationObj as { current?: { name?: string }; name?: string } | null)?.current?.name,
            (locationObj as { name?: string } | null)?.name,
          )
    const locationIdRaw = raw.locationId ?? raw.location_id
    const locationId =
      typeof locationIdRaw === "number"
        ? locationIdRaw
        : Number(locationIdRaw)
    if (!locationName && !(Number.isFinite(locationId) && locationId > 0)) return null
    return {
      locationId: Number.isFinite(locationId) && locationId > 0 ? locationId : undefined,
      location: locationName,
    }
  }, [slip])

  const keepSameLocation = useCallback(
    (entries: DeliveryEntry[]) => {
      if (!anchorLocation) return entries
      return entries.filter((entry) =>
        slipLocationsMatch(
          { locationId: entry.location_id, location: entry.location },
          anchorLocation,
        ),
      )
    },
    [anchorLocation],
  )

  const pickupDropoffAction = useMemo((): SlipPickupDropoffAction | null => {
    if (!singleSlipMode || !slip) return null
    const entry = buildPickupDeliveryEntryFromSlip(slip)
    if (!entry) return null
    return slipPickupDropoffAction({
      locationId: entry.location_id,
      location: entry.location,
    })
  }, [singleSlipMode, slip])

  const isDropoff = singleSlipMode && pickupDropoffAction === "dropoff"
  const isPickup = singleSlipMode && pickupDropoffAction === "pickup"
  const isOfficeDropoff = useMemo(() => {
    if (!singleSlipMode || !slip) return false
    const entry = buildPickupDeliveryEntryFromSlip(slip)
    if (!entry) return false
    return slipIsOfficeDropoff({
      locationId: entry.location_id,
      location: entry.location,
    })
  }, [singleSlipMode, slip])

  const isLabDropoff = useMemo(() => {
    if (!singleSlipMode || !slip) return false
    const entry = buildPickupDeliveryEntryFromSlip(slip)
    if (!entry) return false
    return slipIsLabDropoff({
      locationId: entry.location_id,
      location: entry.location,
    })
  }, [singleSlipMode, slip])

  /** Single-slip: physical tray present (default true when unknown). */
  const singleSlipHasPhysicalImpression = useMemo(() => {
    if (!singleSlipMode || !slip) return true
    return slipHasPhysicalImpression(slip)
  }, [singleSlipMode, slip])

  // Per-lab signature requirement settings (loaded while the modal is open).
  const { driverSettings } = useSignatureRequirementSettings(isOpen)

  const entryHasPhysicalImpression = useCallback((entry: DeliveryEntry): boolean => {
    if (typeof entry.has_physical_impression === "boolean") {
      return entry.has_physical_impression
    }
    // Unknown (e.g. listing without products) — require photo/signature.
    return true
  }, [])

  // Whether a manual signature is required for this submit, per the lab's
  // settings mapped from each selected slip's current location (pickup and drop-off).
  // Fully digital lab drop-offs skip signature even when the lab setting is on.
  const signatureRequired = useMemo(() => {
    const relevant = singleSlipMode
      ? deliveryEntries
      : deliveryEntries.filter((entry) => entry.isChecked)
    return relevant.some((entry) => {
      const ref = { locationId: entry.location_id, location: entry.location }
      if (
        slipIsLabDropoff(ref) &&
        !entryHasPhysicalImpression(entry)
      ) {
        return false
      }
      return driverActionRequiresSignature(ref, driverSettings)
    })
  }, [singleSlipMode, deliveryEntries, driverSettings, entryHasPhysicalImpression])

  /** Selected slips that need a drop-off proof photo. */
  const photoRequiredSlipIds = useMemo(() => {
    const relevant = singleSlipMode
      ? deliveryEntries
      : deliveryEntries.filter((entry) => entry.isChecked)
    return relevant
      .filter((entry) => {
        if (typeof entry.slip_id !== "number") return false
        const ref = { locationId: entry.location_id, location: entry.location }
        if (slipIsOfficeDropoff(ref)) return true
        if (slipIsLabDropoff(ref) && entryHasPhysicalImpression(entry)) return true
        return false
      })
      .map((entry) => entry.slip_id as number)
  }, [singleSlipMode, deliveryEntries, entryHasPhysicalImpression])

  const dropoffPhotoRequired = photoRequiredSlipIds.length > 0
  const dropoffPhotoMissing = dropoffPhotoRequired && !image

  const modalCopy = useMemo(
    () => pickupDropoffModalCopy(singleSlipMode ? pickupDropoffAction : null),
    [singleSlipMode, pickupDropoffAction]
  )

  /** QR driver batch (header scanner / deep link) — Add Slip opens camera, not manual rows. */
  const isQrScanFlow = !singleSlipMode && ((qrScanData?.length ?? 0) > 0 || Boolean(onRequestScan))

  const tableEntries = useMemo(
    () =>
      isQrScanFlow
        ? deliveryEntries.filter((entry) => typeof entry.slip_id === "number")
        : deliveryEntries,
    [deliveryEntries, isQrScanFlow]
  )

  // Logged-in user's name — used as the drop-off signature when settings do not require one.
  const currentUserName = useMemo(() => getCurrentUserName(), [isOpen])

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [])

  // Virtual slip: one row from details already on the page (no pickup-delivery-slips API)
  useEffect(() => {
    if (!singleSlipMode || !isOpen || !slip) return
    const entry = buildPickupDeliveryEntryFromSlip(slip)
    if (!entry) {
      setPickupError(`Could not load slip details for ${modalCopy.title.toLowerCase()}.`)
      setDeliveryEntries([])
      return
    }
    setPickupError(null)
    setDeliveryEntries([entry])
    if (slipId) lastFetchedSlipIdRef.current = Number(slipId)
  }, [singleSlipMode, isOpen, slip, slipId, modalCopy.title])

  // Fetch pickup/delivery slips when modal opens (listing / multi-slip flows)
  useEffect(() => {
    const loadPickup = async () => {
      if (singleSlipMode) return
      if (!isOpen) return
      if (!slipId) return
      if (lastFetchedSlipIdRef.current === Number(slipId)) return // already fetched

      setLoadingPickup(true)
      setPickupError(null)
      try {
        const res = await fetchPickupDeliverySlips(Number(slipId))
        if (res && res.success && Array.isArray(res.data)) {
          const entries = keepSameLocation(convertQRDataToDeliveryEntries(res.data))
          setDeliveryEntries(entries)
          lastFetchedSlipIdRef.current = Number(slipId)
        } else {
          setPickupError(res?.message || 'Failed to load pickup slips')
        }
      } catch (error) {
        console.error('Error loading pickup slips:', error)
        setPickupError('Failed to load pickup slips')
      } finally {
        setLoadingPickup(false)
      }
    }

    void loadPickup()
  }, [isOpen, slipId, fetchPickupDeliverySlips, singleSlipMode, keepSameLocation])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDeliveryEntries([])
      setSignature("")
      setImage(null)
      setPickupError(null)
      setSubmitting(false)
      lastFetchedSlipIdRef.current = null
      setAddingByScan(false)
      addingByScanRef.current = false
    }
  }, [isOpen])

  // Header checkbox: check if all are selected
  const allChecked = tableEntries.length > 0 && tableEntries.every(entry => entry.isChecked)

  const handleCheckboxToggle = (id: string) => {
    setDeliveryEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry.id === id ? { ...entry, isChecked: !entry.isChecked } : entry,
      ),
    )
  }

  // Select/deselect all
  const handleAllToggle = () => {
    setDeliveryEntries((prevEntries) =>
      prevEntries.map((entry) => ({ ...entry, isChecked: !allChecked })),
    )
  }

  const handleAddSlipClick = () => {
    if (isQrScanFlow) {
      onRequestScan?.()
      return
    }
    const lock = anchorLocation ?? (
      deliveryEntries.find((entry) => entry.location || entry.location_id)
        ? {
            locationId: deliveryEntries.find((entry) => entry.location_id)?.location_id,
            location: deliveryEntries.find((entry) => entry.location)?.location || "",
          }
        : null
    )
    if (!lock || (!lock.location && !lock.locationId)) {
      toast({
        title: "No location",
        description: "Open a slip that is ready to pick up or drop off first.",
        variant: "destructive",
      })
      return
    }
    addingByScanRef.current = true
    setAddingByScan(true)
    beginPickupAddSlipScan({
      locationId: lock.locationId,
      location: lock.location,
    })
  }

  const finishAddByScan = useCallback(() => {
    addingByScanRef.current = false
    setAddingByScan(false)
  }, [])

  useEffect(() => {
    if (!isOpen || singleSlipMode) return

    const onScanned = (event: Event) => {
      const detail = (event as CustomEvent<{ slipIds?: number[] }>).detail
      const scannedSlipId = detail?.slipIds?.[0]
      finishAddByScan()
      if (typeof scannedSlipId !== "number") return

      void (async () => {
        try {
          const { data } = await apiClient.get<unknown>(`/slip/slip/${scannedSlipId}/details`)
          const root = data && typeof data === "object" ? (data as Record<string, unknown>) : null
          const details =
            root?.data && typeof root.data === "object" && !Array.isArray(root.data)
              ? root.data
              : data
          const entry = buildPickupDeliveryEntryFromSlip(details)
          if (!entry) {
            toast({
              title: "Could not add slip",
              description: "This QR code did not match a slip.",
              variant: "destructive",
            })
            return
          }
          const lock = anchorLocation
          if (
            lock &&
            !slipLocationsMatch(
              { locationId: entry.location_id, location: entry.location },
              lock,
            )
          ) {
            toast({
              title: "Different location",
              description: `That slip is “${entry.location || "another location"}”. Only slips at “${lock.location}” can be added.`,
              variant: "destructive",
            })
            return
          }
          let alreadyListed = false
          setDeliveryEntries((prev) => {
            if (prev.some((row) => row.slip_id === entry.slip_id)) {
              alreadyListed = true
              return prev
            }
            return [...prev, { ...entry, id: `scan-${entry.slip_id}`, isChecked: true }]
          })
          if (alreadyListed) {
            toast({ title: "Already added", description: "This slip is already in the list." })
          }
        } catch {
          toast({
            title: "Could not add slip",
            description: "Failed to look up the scanned slip.",
            variant: "destructive",
          })
        }
      })()
    }

    const onClosed = () => finishAddByScan()

    window.addEventListener(DRIVER_QR_PICKUP_SLIP_SCANNED_EVENT, onScanned)
    window.addEventListener(DRIVER_QR_SCANNER_CLOSED_EVENT, onClosed)
    return () => {
      window.removeEventListener(DRIVER_QR_PICKUP_SLIP_SCANNED_EVENT, onScanned)
      window.removeEventListener(DRIVER_QR_SCANNER_CLOSED_EVENT, onClosed)
    }
  }, [isOpen, singleSlipMode, anchorLocation, finishAddByScan, toast])

  const handleUpdateManualEntry = (id: string, field: keyof DeliveryEntry, value: string) => {
    setDeliveryEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    )
  }

  const handleDeleteManualEntry = (id: string) => {
    setDeliveryEntries((prevEntries) => prevEntries.filter((entry) => entry.id !== id))
  }

  /** Build remaining QR slips after removing a case (all slips for that case_id). */
  const remainingQrSlipsAfterCaseRemoval = useCallback(
    (caseId: number): QRScanResponseData[] => {
      const source = (qrScanData || contextQrScanData?.data || []) as QRScanResponseData[]
      return filterValidQrScanSlips(source.filter((s) => s.case_id !== caseId))
    },
    [qrScanData, contextQrScanData],
  )

  const handleRemoveQrCase = useCallback(
    async (caseId: number) => {
      if (!isQrScanFlow || removingCaseId != null) return
      setRemovingCaseId(caseId)
      try {
        const key = loadDriverSessionKey() || sessionKey
        if (key) {
          const res = await removeScannedCase(key, caseId)
          if (res && res.success === false) {
            toast({
              title: "Could not remove case",
              description: res.message || "Please try again.",
              variant: "destructive",
            })
            return
          }
        }

        const remaining = remainingQrSlipsAfterCaseRemoval(caseId)
        setDeliveryEntries((prev) => prev.filter((e) => e.case_id !== caseId))
        onQrBatchChange?.(remaining)

        if (remaining.length === 0) {
          toast({ title: "Batch cleared", description: "All scanned cases were removed.", duration: 3000 })
          onClearBatch?.()
          return
        }

        toast({
          title: "Case removed",
          description: "Removed from this pickup batch. You can scan it again if needed.",
          duration: 3000,
        })
      } catch {
        toast({
          title: "Could not remove case",
          description: "Please try again.",
          variant: "destructive",
        })
      } finally {
        setRemovingCaseId(null)
      }
    },
    [
      isQrScanFlow,
      removingCaseId,
      sessionKey,
      removeScannedCase,
      remainingQrSlipsAfterCaseRemoval,
      onQrBatchChange,
      onClearBatch,
      toast,
    ],
  )

  const handleClearBatch = useCallback(async () => {
    if (!isQrScanFlow || clearingBatch) return
    setClearingBatch(true)
    try {
      const key = loadDriverSessionKey() || sessionKey
      if (key) {
        await clearDriverSession(key)
      }
      setDeliveryEntries([])
      onQrBatchChange?.([])
      toast({ title: "Batch cleared", description: "All scanned cases were removed.", duration: 3000 })
      onClearBatch?.()
    } catch {
      toast({
        title: "Could not clear batch",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setClearingBatch(false)
    }
  }, [
    isQrScanFlow,
    clearingBatch,
    sessionKey,
    clearDriverSession,
    onQrBatchChange,
    onClearBatch,
    toast,
  ])

  const handleRejectedImages = (names: string[]) => {
    toast({
      title: "Only images are allowed",
      description: `Skipped: ${names.join(", ")}`,
      variant: "destructive",
    })
  }

  const handleSubmit = async () => {
    const selectedCases = deliveryEntries.filter((entry) => entry.isChecked)
    const slipIds = selectedCases.map((entry) => entry.slip_id).filter((id): id is number => typeof id === 'number')

    if (selectedCases.length === 0) {
      toast({ title: "No slips selected", description: "Please select at least one slip.", variant: "destructive" })
      return
    }

    // When slip settings require a signature for this location, use the pad input.
    // Drop-off with signature disabled still auto-signs with the current user's name,
    // except fully digital lab drop-offs (no physical tray) skip signature entirely.
    const skipSignatureForDigitalLabDropoff =
      isLabDropoff && !singleSlipHasPhysicalImpression
    const effectiveSignature = signatureRequired
      ? signature.trim()
      : isDropoff && !skipSignatureForDigitalLabDropoff
        ? currentUserName
        : signature.trim()
    if (signatureRequired && !effectiveSignature) {
      toast({ title: "Signature required", description: "Please enter your signature.", variant: "destructive" })
      return
    }

    if (dropoffPhotoMissing) {
      toast({
        title: "Photo required",
        description: "Please attach a photo before completing this drop-off.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      if (slipIds.length > 0) {
        if (singleSlipMode && slipIds.length === 1) {
          const entry = selectedCases[0]
          const fromLocationId = entry.location_id
          const toLocationId =
            typeof fromLocationId === "number"
              ? slipNextLocationIdFromRef({
                  locationId: fromLocationId,
                  location: entry.location,
                })
              : slipNextLocationIdFromRef({ location: entry.location })

          if (toLocationId == null) {
            toast({
              title: "Invalid location",
              description: "This slip cannot be moved from its current location.",
              variant: "destructive",
            })
            return
          }

          const result = await postSlipDriverHistoryChangeLocation({
            slip_ids: slipIds,
            to_location_id: toLocationId,
            notes: effectiveSignature || undefined,
            // Drop-off proof photo when present (required for office / physical lab drop-off).
            images:
              isDropoff && image
                ? { [slipIds[0]]: image.file }
                : undefined,
          })
          if (result.success) {
            toast({
              title: "Submission Successful",
              description: result.message || "Location updated successfully",
              duration: 3000,
            })
            onClose()
          } else {
            toast({
              title: "Submission Failed",
              description: result.message || "Failed to update location",
              variant: "destructive",
              duration: 5000,
            })
          }
          return
        }

        const dropoffImages =
          photoRequiredSlipIds.length > 0 && image
            ? Object.fromEntries(photoRequiredSlipIds.map((id) => [id, image.file]))
            : undefined

        const result = await submitScannedSlips(slipIds, effectiveSignature, {
          images: dropoffImages,
        })
        if (result && result.success) {
          toast({ title: "Submission Successful", description: result.message || "Scanned slips submitted successfully", duration: 3000 })
          onSubmitted?.()
          onClose()
        } else {
          toast({ title: "Submission Failed", description: result?.message || "Failed to submit scanned slips", variant: "destructive", duration: 5000 })
        }
      } else {
        toast({ title: "Submission Successful", description: "Manual entries processed successfully", duration: 3000 })
        onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const tableScrollable = deliveryEntries.length > 5
  const singleEntry = singleSlipMode ? deliveryEntries[0] : undefined

  const headerIcon = (
    <Image
      src={
        isDropoff
          ? "/icons/virtual-slip-center/drop-off.svg"
          : "/icons/virtual-slip-center/pick-up.svg"
      }
      alt=""
      width={32}
      height={32}
      className="h-8 w-8"
    />
  )

  const infoFields: DeliveryInfoField[] = singleEntry
    ? [
        { label: "Office", value: singleEntry.office },
        { label: "Pt name", value: singleEntry.patientName },
        { label: "Location", value: singleEntry.location },
        { label: "Slip #", value: singleEntry.slip_number },
      ].filter((f) => Boolean(f.value))
    : []

  const confirmDisabled = singleSlipMode
    ? deliveryEntries.length === 0 || (signatureRequired && !signature.trim()) || dropoffPhotoMissing
    : deliveryEntries.filter((e) => e.isChecked).length === 0 ||
      (signatureRequired && !signature.trim()) ||
      dropoffPhotoMissing

  const singleSlipPhotoRequired =
    isOfficeDropoff || (isLabDropoff && singleSlipHasPhysicalImpression)
  const singleSlipPhotoHint = isOfficeDropoff
    ? "Photo required for office drop-off"
    : isLabDropoff && singleSlipHasPhysicalImpression
      ? "Photo required for lab drop-off (physical impression)"
      : undefined

  return (
    <Dialog
      open={isOpen}
      modal={!addingByScan}
      onOpenChange={(open) => {
        if (!open && !addingByScanRef.current) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden rounded-none border-0 bg-white p-0 shadow-xl sm:h-auto sm:max-h-[90dvh] sm:w-[min(96vw,1080px)] sm:rounded-xl sm:border sm:border-[#E5E7EB]"
      >
        <DialogTitle className="sr-only">{modalCopy.title}</DialogTitle>

        <DeliveryModalHeader
          icon={headerIcon}
          title={
            isPickup && singleEntry?.office
              ? `Pick up - ${singleEntry.office}`
              : modalCopy.title
          }
          onClose={onClose}
        />

        <div ref={scrollContainerRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-2 sm:px-8">
          {!singleSlipMode && contextQrScanData ? (
            <p className="mb-3 text-xs text-green-700">
              QR scanned ({contextQrScanData.scanned_cases_count} cases)
              {sessionKey ? ` · session ${sessionKey.substring(0, 8)}…` : ""}
            </p>
          ) : null}

          {pickupError ? (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{pickupError}</span>
            </div>
          ) : null}

          {singleSlipMode ? (
            /* ----------------------- Single slip ----------------------- */
            <div className="space-y-1">
              {infoFields.length > 0 ? <DeliveryInfoBar fields={infoFields} sticky /> : null}

              <CaseDriverHistorySection
                caseId={singleEntry?.case_id}
                open={isOpen}
                onLoaded={scrollToBottom}
              />

              {isDropoff ? (
                <div className="space-y-3 pt-2">
                  <ImageDropzone
                    image={image}
                    onChange={setImage}
                    onRejected={handleRejectedImages}
                    required={singleSlipPhotoRequired}
                    hint={singleSlipPhotoHint}
                  />
                  {signatureRequired ? (
                    <SignaturePad
                      value={signature}
                      onChange={setSignature}
                      onSubmit={() => {
                        if (!confirmDisabled && !submitting) void handleSubmit();
                      }}
                      placeholder="Receiver's Signature"
                    />
                  ) : (
                    <p className="text-center text-sm text-[#6B7280]">
                      {isLabDropoff && !singleSlipHasPhysicalImpression
                        ? "Digital case — signature not required"
                        : (
                          <>
                            Signed automatically as{" "}
                            <span className="font-semibold text-[#111827]">
                              {currentUserName || "current user"}
                            </span>
                          </>
                        )}
                    </p>
                  )}
                </div>
              ) : signatureRequired ? (
                <div className="pt-2">
                  <SignaturePad
                    value={signature}
                    onChange={setSignature}
                    onSubmit={() => {
                      if (!confirmDisabled && !submitting) void handleSubmit();
                    }}
                    placeholder="Receiver's Signature"
                  />
                </div>
              ) : null}
            </div>
          ) : (
            /* ----------------------- Multi slip ------------------------ */
            <>
              {loadingPickup ? (
                <div className="mb-4 flex items-center justify-center gap-2 py-6 text-[#1162A8]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading entries…</span>
                </div>
              ) : null}

              {/* Mobile: card list (QR / multi-slip) */}
              <div className="space-y-3 md:hidden">
                {loadingPickup ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={`m-skel-${i}`}
                      className="h-24 animate-pulse rounded-xl border border-[#E5E7EB] bg-gray-100"
                    />
                  ))
                ) : tableEntries.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#E5E7EB] px-4 py-8 text-center text-sm text-gray-600">
                    {isQrScanFlow
                      ? 'No slips scanned yet. Tap "Scan Slip" to scan a QR code.'
                      : 'No slips at this location. Click "Add Slip" to scan a QR code.'}
                  </p>
                ) : (
                  tableEntries.map((entry) => {
                    const isManual = !entry.slip_id
                    const rowAction = slipPickupDropoffAction({
                      locationId: entry.location_id,
                      location: entry.location,
                    })
                    return (
                      <div
                        key={`m-${entry.id}`}
                        className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold text-[#111827]">
                              {entry.patientName || "—"}
                            </p>
                            <p className="mt-0.5 text-sm text-[#6B7280]">
                              {[entry.office, entry.labName].filter(Boolean).join(" · ") || "—"}
                            </p>
                          </div>
                          <Checkbox
                            checked={entry.isChecked}
                            onCheckedChange={() => handleCheckboxToggle(entry.id)}
                            className="mt-1 h-5 w-5 border-[#1162A8] data-[state=checked]:border-[#1162A8] data-[state=checked]:bg-[#1162A8]"
                            aria-label={`Select ${entry.patientName || "entry"}`}
                          />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#374151]">
                          {rowAction ? (
                            <Image
                              src={
                                rowAction === "dropoff"
                                  ? "/icons/virtual-slip-center/drop-off.svg"
                                  : "/icons/virtual-slip-center/pick-up.svg"
                              }
                              alt={rowAction === "dropoff" ? "Drop off" : "Pick up"}
                              width={20}
                              height={20}
                              className="h-5 w-5 shrink-0"
                            />
                          ) : null}
                          <span className="min-w-0 flex-1 leading-snug">{entry.location || "—"}</span>
                          {!isManual ? (
                            <DirectionsLink
                              locationId={entry.location_id}
                              location={entry.location}
                              labAddress={entry.lab_address}
                              officeAddress={entry.office_address}
                              className="shrink-0"
                            />
                          ) : null}
                        </div>
                        <div className="mt-3 flex justify-end">
                          {isManual ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-10 text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteManualEntry(entry.id)}
                              type="button"
                            >
                              <Trash2 className="mr-1.5 h-4 w-4" />
                              Remove
                            </Button>
                          ) : isQrScanFlow && typeof entry.case_id === "number" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-10 text-red-600 hover:bg-red-50"
                              onClick={() => void handleRemoveQrCase(entry.case_id as number)}
                              type="button"
                              disabled={removingCaseId === entry.case_id || clearingBatch}
                            >
                              {removingCaseId === entry.case_id ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-1.5 h-4 w-4" />
                              )}
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Desktop: table */}
              <div
                className={cn(
                  "hidden w-full overflow-x-auto md:block",
                  tableScrollable && "max-h-[min(42dvh,320px)] overflow-y-auto",
                )}
              >
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#E5E7EB]">
                      <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280] sm:px-5">Location</th>
                      <th className="w-[72px] px-2 py-3 text-center text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">Directions</th>
                      <th className="w-[52px] px-2 py-3 text-center">
                        <Checkbox
                          checked={allChecked}
                          onCheckedChange={handleAllToggle}
                          className="mx-auto border-[#1162A8] data-[state=checked]:border-[#1162A8] data-[state=checked]:bg-[#1162A8] data-[state=checked]:text-white"
                          aria-label="Select all"
                        />
                      </th>
                      <th className="w-[88px] px-3 py-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280] sm:px-4">Lab</th>
                      <th className="w-[88px] px-3 py-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280] sm:px-4">Office</th>
                      <th className="min-w-[140px] px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280] sm:px-5">Patient Name</th>
                      <th className="w-[52px] px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {loadingPickup ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={`skeleton-${i}`} className="border-b border-dashed border-[#E5E7EB]">
                          <td colSpan={7} className="px-5 py-4">
                            <div className="h-4 w-full max-w-md animate-pulse rounded bg-gray-200" />
                          </td>
                        </tr>
                      ))
                    ) : tableEntries.length === 0 ? (
                      <tr className="border-b border-dashed border-[#E5E7EB]">
                        <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-600">
                          {isQrScanFlow
                            ? 'No slips scanned yet. Tap "Scan Slip" to scan a QR code.'
                            : 'No slips at this location. Click "Add Slip" to scan a QR code.'}
                        </td>
                      </tr>
                    ) : (
                      tableEntries.map((entry) => {
                        const isManual = !entry.slip_id
                        const rowAction = slipPickupDropoffAction({
                          locationId: entry.location_id,
                          location: entry.location,
                        })
                        return (
                          <tr key={entry.id} className="border-b border-dashed border-[#E5E7EB] text-[14px] text-[#374151] last:border-b-0">
                            <td className="px-4 py-4 align-middle sm:px-5">
                              {isManual ? (
                                <Input
                                  value={entry.location}
                                  onChange={(e) => handleUpdateManualEntry(entry.id, "location", e.target.value)}
                                  placeholder="Location"
                                  className="h-9 border-[#D9D9D9] bg-white text-sm"
                                />
                              ) : (
                                <span className="flex items-center gap-2 max-w-[280px] leading-snug">
                                  {rowAction ? (
                                    <Image
                                      src={
                                        rowAction === "dropoff"
                                          ? "/icons/virtual-slip-center/drop-off.svg"
                                          : "/icons/virtual-slip-center/pick-up.svg"
                                      }
                                      alt={rowAction === "dropoff" ? "Drop off" : "Pick up"}
                                      title={rowAction === "dropoff" ? "Drop off" : "Pick up"}
                                      width={20}
                                      height={20}
                                      className="h-5 w-5 shrink-0"
                                    />
                                  ) : null}
                                  <span>{entry.location}</span>
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-4 text-center align-middle">
                              {!isManual ? (
                                <DirectionsLink
                                  locationId={entry.location_id}
                                  location={entry.location}
                                  labAddress={entry.lab_address}
                                  officeAddress={entry.office_address}
                                />
                              ) : null}
                            </td>
                            <td className="px-2 py-4 text-center align-middle">
                              <Checkbox
                                id={`entry-${entry.id}`}
                                checked={entry.isChecked}
                                onCheckedChange={() => handleCheckboxToggle(entry.id)}
                                className="mx-auto border-[#1162A8] data-[state=checked]:bg-[#1162A8] data-[state=checked]:text-white"
                                aria-label={`Select ${entry.patientName || "entry"}`}
                              />
                            </td>
                            <td className="px-3 py-4 align-middle sm:px-4">
                              {isManual ? (
                                <Input
                                  value={entry.labName}
                                  onChange={(e) => handleUpdateManualEntry(entry.id, "labName", e.target.value)}
                                  placeholder="Lab"
                                  className="h-9 w-full min-w-[72px] border-[#D9D9D9] bg-white text-sm"
                                />
                              ) : (
                                <span className="font-medium">{entry.labName || "—"}</span>
                              )}
                            </td>
                            <td className="px-3 py-4 align-middle sm:px-4">
                              {isManual ? (
                                <Input
                                  value={entry.office}
                                  onChange={(e) => handleUpdateManualEntry(entry.id, "office", e.target.value)}
                                  placeholder="Office"
                                  className="h-9 w-full min-w-[72px] border-[#D9D9D9] bg-white text-sm"
                                />
                              ) : (
                                <span className="font-medium">{entry.office || "—"}</span>
                              )}
                            </td>
                            <td className="px-4 py-4 align-middle sm:px-5">
                              {isManual ? (
                                <Input
                                  value={entry.patientName}
                                  onChange={(e) => handleUpdateManualEntry(entry.id, "patientName", e.target.value)}
                                  placeholder="Patient Name"
                                  className="h-9 border-[#D9D9D9] bg-white text-sm"
                                />
                              ) : (
                                <span>{entry.patientName}</span>
                              )}
                            </td>
                            <td className="px-2 py-4 text-center align-middle">
                              {isManual ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                  onClick={() => handleDeleteManualEntry(entry.id)}
                                  title="Delete manual entry"
                                  type="button"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : isQrScanFlow && typeof entry.case_id === "number" ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                  onClick={() => void handleRemoveQrCase(entry.case_id as number)}
                                  title="Remove from batch"
                                  type="button"
                                  disabled={removingCaseId === entry.case_id || clearingBatch}
                                >
                                  {removingCaseId === entry.case_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              ) : null}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
                <Button
                  variant="outline"
                  className="h-12 w-full border-[#1162A8] text-base text-[#1162A8] hover:bg-blue-50 sm:h-10 sm:w-auto sm:text-sm"
                  onClick={handleAddSlipClick}
                  type="button"
                  disabled={
                    (isQrScanFlow && !onRequestScan) || clearingBatch || removingCaseId != null
                  }
                >
                  {isQrScanFlow ? (
                    <QrCode className="mr-2 h-4 w-4" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {isQrScanFlow ? "Scan Slip" : "Add Slip"}
                </Button>
                {isQrScanFlow && tableEntries.length > 0 ? (
                  <Button
                    variant="outline"
                    className="h-12 w-full border-red-300 text-base text-red-700 hover:bg-red-50 sm:h-10 sm:w-auto sm:text-sm"
                    onClick={() => void handleClearBatch()}
                    type="button"
                    disabled={clearingBatch || removingCaseId != null}
                  >
                    {clearingBatch ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Clear batch
                  </Button>
                ) : null}
              </div>

              {dropoffPhotoRequired ? (
                <div className="mt-5 space-y-2">
                  <ImageDropzone
                    image={image}
                    onChange={setImage}
                    onRejected={handleRejectedImages}
                    required
                    hint="Photo required for this drop-off"
                  />
                </div>
              ) : null}

              {signatureRequired && (
                <div className="mt-5">
                  <SignaturePad
                    value={signature}
                    onChange={setSignature}
                    onSubmit={() => {
                      if (!confirmDisabled && !submitting) void handleSubmit();
                    }}
                    placeholder="Receiver's Signature"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DeliveryModalFooter
          onCancel={onClose}
          onConfirm={handleSubmit}
          confirmLabel={modalCopy.confirmLabel}
          confirmDisabled={confirmDisabled}
          // Drop-off: only show Confirm once required photo (and signature when needed) are done.
          hideConfirmUntilReady={isDropoff || dropoffPhotoRequired || signatureRequired}
          submitting={submitting}
        />
      </DialogContent>
    </Dialog>
  )
}
