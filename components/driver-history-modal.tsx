// app/components/DriverHistoryModal.tsx

"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Truck, X, Check, Plus, UserRoundCog, MapPin, UserCheck, Loader2, AlertCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import clsx from "clsx"
import { useDriverSlip, QRScanResponseData } from "@/contexts/DriverSlipContext"
import { useSlipContext } from "../app/lab-case-management/SlipContext"
import { useToast } from "@/hooks/use-toast"

interface DeliveryEntry {
  id: string
  office: string
  patientName: string
  location: string
  isChecked: boolean
  case_id?: number
  slip_id?: number
  case_number?: string
  slip_number?: string
  casepan_number?: string
  location_id?: number
  customer_code?: string
  customer_id?: number
}

interface DriverHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  slip?: any
  qrScanData?: QRScanResponseData[] // Optional QR scan data to pre-populate
}

export default function DriverHistoryModal({ isOpen, onClose, slip, qrScanData }: DriverHistoryModalProps) {
  const [deliveryEntries, setDeliveryEntries] = useState<DeliveryEntry[]>([])
  const [signature, setSignature] = useState("")
  const { qrScanData: contextQrScanData, qrScanLoading, qrScanError, sessionKey } = useDriverSlip()
  const { submitScannedSlips, fetchPickupDeliverySlips } = useSlipContext()
  const { toast } = useToast()
  const [loadingPickup, setLoadingPickup] = useState(false)
  const [pickupError, setPickupError] = useState<string | null>(null)
  const lastFetchedSlipIdRef = useRef<number | null>(null)

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

  // Update delivery entries when QR scan data is available
  useEffect(() => {
    const activeQrData = qrScanData || contextQrScanData?.data
    if (activeQrData && activeQrData.length > 0) {
      const qrEntries = convertQRDataToDeliveryEntries(activeQrData)
      setDeliveryEntries(qrEntries)
      // move toast out of here to prevent duplicates. Header will show it.
    }
  }, [qrScanData, contextQrScanData])

  // Derive a stable primitive slipId from the slip prop to avoid effect loops
  const slipId = useMemo(() => {
    if (!slip) return null
    return typeof slip === 'number' ? slip : slip.slip_id || slip.id || null
  }, [slip])

  // Fetch pickup/delivery slips when modal opens (if slipId provided)
  useEffect(() => {
    const loadPickup = async () => {
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
  }, [isOpen, slipId, fetchPickupDeliverySlips])

  // Reset entries when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDeliveryEntries([])
      setSignature("")
      setPickupError(null)
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

  const handleSubmit = async () => {
    const selectedCases = deliveryEntries.filter((entry) => entry.isChecked)
    const slipIds = selectedCases.map((entry) => entry.slip_id).filter((id): id is number => typeof id === 'number')
    if (slipIds.length === 0) {
      toast({ title: "No slips selected", description: "Please select at least one slip.", variant: "destructive" })
      return
    }
    if (!signature.trim()) {
      toast({ title: "Signature required", description: "Please enter your signature.", variant: "destructive" })
      return
    }
    const result = await submitScannedSlips(slipIds, signature)
    if (result && result.success) {
      toast({ title: "Submission Successful", description: result.message || "Scanned slips submitted successfully", duration: 3000 })
      onClose()
    } else {
      toast({ title: "Submission Failed", description: result?.message || "Failed to submit scanned slips", variant: "destructive", duration: 5000 })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 bg-white rounded-2xl shadow-2xl">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 pt-6 pb-2 border-b">
          <div className="flex items-center gap-3">
            <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.128906" y="0.527344" width="41.2246" height="41.2246" rx="6" fill="#1162A8" />
              <path d="M16.522 13.4141H11.1292C10.21 13.4141 9.46484 14.0882 9.46484 14.9197V20.7657C9.46484 21.5973 10.21 22.2714 11.1292 22.2714H16.522C17.4412 22.2714 18.1864 21.5973 18.1864 20.7657V14.9197C18.1864 14.0882 17.4412 13.4141 16.522 13.4141Z" stroke="white" strokeMiterlimit="10" />
              <path d="M13.826 22.7246L10.3672 26.4173H17.2942L13.826 22.7246Z" stroke="white" strokeMiterlimit="10" />
              <path d="M13.8252 26.418V33.8706" stroke="white" strokeMiterlimit="10" />
              <path d="M25.3268 13.0691C26.703 13.0691 27.8187 12.0598 27.8187 10.8148C27.8187 9.56983 26.703 8.56055 25.3268 8.56055C23.9506 8.56055 22.835 9.56983 22.835 10.8148C22.835 12.0598 23.9506 13.0691 25.3268 13.0691Z" stroke="white" strokeMiterlimit="10" />
              <path d="M20.0084 19.9078L24.7968 14.8945H26.1729C26.5356 14.8945 26.8703 15.0544 27.112 15.3319L27.7629 16.089C28.0139 16.3834 28.1534 16.7451 28.1534 17.1152V23.3733L23.0767 28.496V31.6419C23.0767 32.2895 22.8814 32.9372 22.463 33.4335C22.3887 33.5176 22.3236 33.5849 22.2678 33.6186C22.0074 33.77 21.3473 33.7363 21.0683 33.6186C21.0125 33.5933 20.9382 33.5429 20.8545 33.4756C20.3896 33.0718 20.1478 32.4662 20.1478 31.8437V28.681L24.6574 23.5584L24.4807 19.4031L21.7006 22.406H13.8252" stroke="white" strokeMiterlimit="10" />
              <path d="M28.535 25.2734V31.3381C28.535 31.9858 28.3769 32.6335 28.0422 33.1298C27.9864 33.2139 27.9306 33.2812 27.8842 33.3148C27.6796 33.4663 27.1403 33.4326 26.9172 33.3148C26.8707 33.2896 26.8149 33.2391 26.7498 33.1719C26.3779 32.7681 26.1826 32.1625 26.1826 31.54V28.3773" stroke="white" strokeMiterlimit="10" />
            </svg>



            <DialogTitle className="text-2xl font-semibold">
              Pick up and Drop off
            </DialogTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="w-6 h-6 text-gray-500" />
          </Button>
        </div>

        {/* Subtitle & Description */}
        <div className="px-6 pt-4 pb-2">
          <div className="font-semibold text-base flex items-center gap-2">
            Delivery Entries
            {contextQrScanData && (
              <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full font-normal">
                QR Scanned ({contextQrScanData.scanned_cases_count} cases)
              </span>
            )}
          </div>
          <div className="text-gray-600 text-sm mt-1">
            Select cases to confirm pick up or drop off.
            {sessionKey && (
              <div className="text-xs text-blue-600 mt-1">
                Session: {sessionKey.substring(0, 8)}...
              </div>
            )}
          </div>
        </div>

        {/* Loading and Error States for QR */}
        {loadingPickup && (
          <div className="px-6 py-4">
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing QR scan...</span>
            </div>
          </div>
        )}

        {pickupError && (
          <div className="px-6 py-2">
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{pickupError}</span>
            </div>
          </div>
        )}

        {/* Case Info Section */}
        {/* {slip && (
          <div className="px-6 pt-4 pb-2">
            <div className="font-semibold text-base">Case Information</div>
            <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
              <div>
                <span className="text-gray-600">Patient:</span>
                <span className="ml-2 font-medium">{slip.patient}</span>
              </div>
              <div>
                <span className="text-gray-600">Office:</span>
                <span className="ml-2 font-medium">{slip.officeCode}</span>
              </div>
              <div>
                <span className="text-gray-600">Product:</span>
                <span className="ml-2 font-medium">{slip.product}</span>
              </div>
              <div>
                <span className="text-gray-600">Current Status:</span>
                <span className="ml-2 font-medium">{slip.status}</span>
              </div>
            </div>
          </div>
        )} */}

        {/* Table */}
        <div className="px-6 pb-0">
          <div className="grid grid-cols-[40px_120px_1.5fr_2fr_60px] items-center py-2 border-b text-sm font-semibold bg-gray-50 rounded-t-md">
            <Checkbox
              checked={allChecked}
              onCheckedChange={handleAllToggle}
              className="mx-auto"
              aria-label="Select all"
            />
            <div>Office</div>
            <div>Patient name</div>
            <div>Location</div>
            <div className="text-center">Action</div>
          </div>

          <div className="divide-y">
            {loadingPickup ? (
              // Skeleton placeholders while loading
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="grid grid-cols-[40px_120px_1.5fr_2fr_60px] items-center py-3 text-sm bg-white"
                >
                  <div className="mx-auto w-4 h-4 rounded-full bg-gray-200/70 animate-pulse" />
                  <div className="h-4 w-28 bg-gray-200/70 rounded animate-pulse" />
                  <div className="h-4 w-full bg-gray-200/70 rounded animate-pulse" />
                  <div className="h-4 w-48 bg-gray-200/70 rounded animate-pulse" />
                  <div className="flex items-center justify-center">
                    <div className="h-6 w-6 bg-gray-200/70 rounded animate-pulse" />
                  </div>
                </div>
              ))
            ) : (
              deliveryEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-[40px_120px_1.5fr_2fr_60px] items-center py-3 text-sm bg-white"
                >
                  <Checkbox
                    id={`entry-${entry.id}`}
                    checked={entry.isChecked}
                    onCheckedChange={() => handleCheckboxToggle(entry.id)}
                    className="mx-auto"
                    aria-label={`Select ${entry.patientName}`}
                  />
                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                    {/* small office icon */}
                    <svg width="30" height="26" viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8.33761 17.114C8.33761 17.6369 8.13442 18.1383 7.77275 18.508C7.41107 18.8777 6.92053 19.0854 6.40904 19.0854C5.89755 19.0854 5.40701 18.8777 5.04533 18.508C4.68366 18.1383 4.48047 17.6369 4.48047 17.114C4.48047 16.5912 4.68366 16.0897 5.04533 15.72C5.40701 15.3503 5.89755 15.1426 6.40904 15.1426C6.92053 15.1426 7.41107 15.3503 7.77275 15.72C8.13442 16.0897 8.33761 16.5912 8.33761 17.114Z" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M11.2307 17.1141C11.2307 21.8074 6.40932 24.507 6.40932 24.507C6.40932 24.507 1.58789 21.8074 1.58789 17.1141C1.58789 15.807 2.09586 14.5534 3.00005 13.6291C3.90425 12.7048 5.1306 12.1855 6.40932 12.1855C7.68804 12.1855 8.91439 12.7048 9.81858 13.6291C10.7228 14.5534 11.2307 15.807 11.2307 17.1141Z" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M25.695 6.60033C25.695 7.12319 25.4918 7.62463 25.1302 7.99435C24.7685 8.36406 24.278 8.57176 23.7665 8.57176C23.255 8.57176 22.7644 8.36406 22.4028 7.99435C22.0411 7.62463 21.8379 7.12319 21.8379 6.60033C21.8379 6.07748 22.0411 5.57604 22.4028 5.20632C22.7644 4.83661 23.255 4.62891 23.7665 4.62891C24.278 4.62891 24.7685 4.83661 25.1302 5.20632C25.4918 5.57604 25.695 6.07748 25.695 6.60033Z" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M28.5882 6.60045C28.5882 11.2938 23.7667 13.9933 23.7667 13.9933C23.7667 13.9933 18.9453 11.2938 18.9453 6.60045C18.9453 5.29331 19.4533 4.03971 20.3575 3.11542C21.2617 2.19113 22.488 1.67188 23.7667 1.67188C25.0455 1.67188 26.2718 2.19113 27.176 3.11542C28.0802 4.03971 28.5882 5.29331 28.5882 6.60045Z" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6.08789 24.6725H25.1412C26.6897 24.6725 27.945 23.4172 27.945 21.8687V21.8687C27.945 20.3202 26.6897 19.0649 25.1412 19.0649H20.3172C18.9623 19.0649 17.8639 17.9665 17.8639 16.6115V16.6115C17.8639 15.2566 18.9623 14.1582 20.3172 14.1582H24.2486" stroke="#1162A8" strokeWidth="1.5" />
                    </svg>

                  </div>
                  <div className="text-gray-800">{entry.patientName}</div>
                  <div className="text-gray-800 flex items-center gap-1">
                    {entry.location}
                    {entry.slip_number && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                        {entry.slip_number}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 justify-center">
                    {/* action icon placeholder */}
                    <svg width="24" height="34" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clipPath="url(#clip0_4154_20833)">
                        <path d="M8.95658 6.95117H2.75481C1.69774 6.95117 0.84082 7.80677 0.84082 8.8622V16.2821C0.84082 17.3376 1.69774 18.1932 2.75481 18.1932H8.95658C10.0136 18.1932 10.8706 17.3376 10.8706 16.2821V8.8622C10.8706 7.80677 10.0136 6.95117 8.95658 6.95117Z" stroke="#34C759" strokeWidth="1.5" strokeMiterlimit="10" />
                        <path d="M5.85561 18.7695L1.87793 23.4564H9.84399L5.85561 18.7695Z" stroke="#34C759" strokeWidth="1.5" strokeMiterlimit="10" />
                        <path d="M5.85547 23.457V32.9161" stroke="#34C759" strokeWidth="1.5" strokeMiterlimit="10" />
                        <path d="M19.0824 6.51344C20.6651 6.51344 21.9481 5.23243 21.9481 3.65223C21.9481 2.07202 20.6651 0.791016 19.0824 0.791016C17.4998 0.791016 16.2168 2.07202 16.2168 3.65223C16.2168 5.23243 17.4998 6.51344 19.0824 6.51344Z" stroke="#34C759" strokeWidth="1.5" strokeMiterlimit="10" />
                        <path d="M12.9661 15.1931L18.4729 8.83008H20.0554C20.4724 8.83008 20.8573 9.03293 21.1353 9.38524L21.8838 10.3461C22.1725 10.7198 22.3329 11.1788 22.3329 11.6486V19.5916L16.4947 26.0934V30.0863C16.4947 30.9084 16.2702 31.7304 15.789 32.3603C15.7034 32.4671 15.6286 32.5525 15.5644 32.5952C15.265 32.7874 14.5059 32.7447 14.1851 32.5952C14.1209 32.5632 14.0354 32.4991 13.9392 32.4137C13.4045 31.9013 13.1265 31.1326 13.1265 30.3425V26.3283L18.3125 19.8265L18.1093 14.5525L14.9122 18.3639H5.85547" stroke="#34C759" strokeWidth="1.5" strokeMiterlimit="10" />
                        <path d="M22.7717 22.0039V29.7014C22.7717 30.5235 22.5899 31.3455 22.2049 31.9754C22.1408 32.0822 22.0766 32.1676 22.0232 32.2103C21.7879 32.4025 21.1678 32.3598 20.9111 32.2103C20.8577 32.1783 20.7935 32.1142 20.7187 32.0288C20.291 31.5164 20.0664 30.7477 20.0664 29.9576V25.9434" stroke="#34C759" strokeWidth="1.5" strokeMiterlimit="10" />
                      </g>
                      <defs>
                        <clipPath id="clip0_4154_20833">
                          <rect width="23" height="33" fill="white" transform="translate(0.306641 0.257812)" />
                        </clipPath>
                      </defs>
                    </svg>
                  </div>
                </div>
              ))
            )}
           </div>
        </div>

        {/* Add Case */}
        <div className="px-6 py-4 flex justify-center">
          <Button
            variant="outline"
            className="border border-blue-500 text-blue-600 font-medium rounded-lg flex items-center gap-2 px-6 py-2 hover:bg-blue-50"
            onClick={handleAddCase}
            type="button"
          >
            <Plus className="w-5 h-5" />
            Add Case
          </Button>
        </div>

        {/* Signature */}
        <div className="px-6 pb-1">
          <Label htmlFor="signature" className="block text-gray-800 text-sm font-medium mb-1">
            Signature *
          </Label>
          <Textarea
            id="signature"
            placeholder="Signature *"
            rows={2}
            className="resize-none rounded-lg border-gray-300"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 px-6 py-5 bg-white rounded-b-2xl">
          <Button
            variant="outline"
            className="rounded-lg border-gray-300"
            onClick={onClose}
            type="button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!signature.trim()}
            className="rounded-lg bg-blue-600 text-white px-7 hover:bg-blue-700"
            type="submit"
          >
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
