// app/components/DriverHistoryModal.tsx

"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Plus, Loader2, AlertCircle, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDriverSlip, QRScanResponseData } from "@/contexts/DriverSlipContext"
import { useSlipContext } from "../app/lab-case-management/SlipContext"
import { useToast } from "@/hooks/use-toast"
import {
  buildPickupDeliveryEntryFromSlip,
  type PickupDeliveryEntry,
} from "@/lib/virtual-slip-pickup-entry"
import {
  slipPickupDropoffAction,
  slipNextLocationIdFromRef,
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
}

export default function DriverHistoryModal({
  isOpen,
  onClose,
  slip,
  qrScanData,
  singleSlipMode = false,
  onRequestScan,
  onSubmitted,
}: DriverHistoryModalProps) {
  const [deliveryEntries, setDeliveryEntries] = useState<DeliveryEntry[]>([])
  const [signature, setSignature] = useState("")
  const [image, setImage] = useState<UploadedImage | null>(null)
  const { qrScanData: contextQrScanData, qrScanLoading, qrScanError, sessionKey } = useDriverSlip()
  const { submitScannedSlips, fetchPickupDeliverySlips } = useSlipContext()
  const { toast } = useToast()
  const [loadingPickup, setLoadingPickup] = useState(false)
  const [pickupError, setPickupError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const lastFetchedSlipIdRef = useRef<number | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Convert QR scan data to delivery entries
  const convertQRDataToDeliveryEntries = (qrData: QRScanResponseData[]): DeliveryEntry[] => {
    return qrData.map((item, index) => ({
      id: `qr-${item.slip_id}-${index}`,
      office: item.customer_code || "Unknown Office",
      patientName: item.patient_name,
      location: item.location || item.current_driver_location,
      isChecked: true, // Auto-select QR scanned items
      case_id: item.case_id,
      slip_id: item.slip_id,
      case_number: item.case_number,
      slip_number: item.slip_number,
      casepan_number: item.casepan_number,
      location_id: item.location_id,
      customer_code: item.customer_code,
      customer_id: item.customer_id,
    }))
  }

  // Update delivery entries when QR scan data is available (listing / header scan flows)
  useEffect(() => {
    if (singleSlipMode) return
    const activeQrData = qrScanData || contextQrScanData?.data
    if (activeQrData && activeQrData.length > 0) {
      const qrEntries = convertQRDataToDeliveryEntries(activeQrData)
      setDeliveryEntries(qrEntries)
    }
  }, [qrScanData, contextQrScanData, singleSlipMode])

  // Derive a stable primitive slipId from the slip prop to avoid effect loops
  const slipId = useMemo(() => {
    if (!slip) return null
    return typeof slip === 'number' ? slip : slip.slip_id || slip.id || null
  }, [slip])

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

  // Per-lab signature requirement settings (loaded while the modal is open).
  const { driverSettings } = useSignatureRequirementSettings(isOpen)

  // Whether a manual signature is required for this submit, per the lab's
  // settings mapped from each selected slip's current location. Single-slip
  // drop-off auto-signs with the current user's name, so it never requires one.
  const signatureRequired = useMemo(() => {
    if (isDropoff) return false
    const relevant = singleSlipMode
      ? deliveryEntries
      : deliveryEntries.filter((entry) => entry.isChecked)
    return relevant.some((entry) =>
      driverActionRequiresSignature(
        { locationId: entry.location_id, location: entry.location },
        driverSettings
      )
    )
  }, [isDropoff, singleSlipMode, deliveryEntries, driverSettings])

  const modalCopy = useMemo(
    () => pickupDropoffModalCopy(singleSlipMode ? pickupDropoffAction : null),
    [singleSlipMode, pickupDropoffAction]
  )

  // Logged-in user's name — used as the drop-off signature (captured automatically).
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
          const entries = convertQRDataToDeliveryEntries(res.data)
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
  }, [isOpen, slipId, fetchPickupDeliverySlips, singleSlipMode])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDeliveryEntries([])
      setSignature("")
      setImage(null)
      setPickupError(null)
      setSubmitting(false)
      lastFetchedSlipIdRef.current = null
    }
  }, [isOpen])

  // Header checkbox: check if all are selected
  const allChecked = deliveryEntries.length > 0 && deliveryEntries.every(entry => entry.isChecked)

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

  const handleAddCase = () => {
    const newId = String(Date.now())
    const newEntry: DeliveryEntry = {
      id: newId,
      office: "",
      patientName: "",
      location: "",
      isChecked: false,
    }
    setDeliveryEntries((prevEntries) => [...prevEntries, newEntry])
  }

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

    // Drop off captures the current user's signature automatically; pick up needs a
    // manual signature only when the lab's settings require it for the slip's location.
    const effectiveSignature = isDropoff ? currentUserName : signature.trim()
    if (!isDropoff && signatureRequired && !effectiveSignature) {
      toast({ title: "Signature required", description: "Please enter your signature.", variant: "destructive" })
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
            // Drop-off proof photo (one per slip). Optional; pick up sends none.
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

        const result = await submitScannedSlips(slipIds, effectiveSignature)
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
    ? deliveryEntries.length === 0 || (isPickup && signatureRequired && !signature.trim())
    : deliveryEntries.filter((e) => e.isChecked).length === 0 || (signatureRequired && !signature.trim())

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="flex w-[min(96vw,1080px)] max-w-none flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-0 shadow-xl max-h-[90dvh]"
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

        <div ref={scrollContainerRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-2 sm:px-8">
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
                  />
                  <p className="text-center text-sm text-[#6B7280]">
                    Signed automatically as{" "}
                    <span className="font-semibold text-[#111827]">
                      {currentUserName || "current user"}
                    </span>
                  </p>
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

              <div
                className={cn(
                  "w-full overflow-x-auto",
                  tableScrollable && "max-h-[min(42dvh,320px)] overflow-y-auto",
                )}
              >
                <table className="w-full min-w-[640px] border-collapse text-left">
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
                      <th className="w-[88px] px-3 py-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280] sm:px-4">Office</th>
                      <th className="min-w-[140px] px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280] sm:px-5">Patient Name</th>
                      <th className="w-[52px] px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {loadingPickup ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={`skeleton-${i}`} className="border-b border-dashed border-[#E5E7EB]">
                          <td colSpan={6} className="px-5 py-4">
                            <div className="h-4 w-full max-w-md animate-pulse rounded bg-gray-200" />
                          </td>
                        </tr>
                      ))
                    ) : deliveryEntries.length === 0 ? (
                      <tr className="border-b border-dashed border-[#E5E7EB]">
                        <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-600">
                          No entries available. Click &quot;Add Slip&quot; to add one manually or scan a QR code.
                        </td>
                      </tr>
                    ) : (
                      deliveryEntries.map((entry) => {
                        const isManual = !entry.slip_id
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
                                <span className="block max-w-[280px] leading-snug">{entry.location}</span>
                              )}
                            </td>
                            <td className="px-2 py-4 text-center align-middle">
                              {!isManual ? <DirectionsIcon /> : null}
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
                              ) : null}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  className="border-[#1162A8] text-[#1162A8] hover:bg-blue-50"
                  onClick={onRequestScan ?? handleAddCase}
                  type="button"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Slip
                </Button>
              </div>

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
          submitting={submitting}
        />
      </DialogContent>
    </Dialog>
  )
}
