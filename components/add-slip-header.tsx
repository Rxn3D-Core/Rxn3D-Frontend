"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, Zap, X, RefreshCw, Eye, EyeOff, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Lightbulb } from "lucide-react"
import React, { useEffect, useState, useRef } from "react"
import dayjs from "dayjs"
import { useRouter } from "next/navigation"
import { useSlipCreation } from "@/contexts/slip-creation-context"
import FocusedSpotlight from "@/components/focused-spotlight"
import { useFocusedSpotlight } from "@/hooks/use-focused-spotlight"
import { CustomerLogo } from "@/components/customer-logo"
interface AddSlipHeaderProps {
  formData: {
    office?: string
    office_id?: string
    doctor: string
    doctor_id?: string
    patient: string
    panNumber: string
    caseNumber: string
    slipNumber: string
    createdBy: string
    location: string
    caseStatus: string
    pickupDate: string
    deliveryDate: string
    deliveryTime: string
    lab?: string
    lab_id?: string
  }
  setFormData: (fn: (prev: any) => any) => void
  selectedLabObj?: any
  selectedOfficeObj?: any
  doctorOptions?: any[]
  officeOptions?: any[]
  createdBy?: string
  onOpenDeliveryDateModal: () => void
  onClose?: () => void
  formErrors?: { [key: string]: string }
  doctorDropdownOpen?: boolean
  setDoctorDropdownOpen?: (open: boolean) => void
  isSubmitted?: boolean // NEW: disables all fields if true
  onContinue?: () => void // Called when user presses Enter in patient input
  onOfficeSelect?: (officeId: string, officeName: string) => void
  onRefreshOffices?: () => void
}

export default function AddSlipHeader({
  formData,
  setFormData = () => { },
  selectedLabObj,
  selectedOfficeObj,
  doctorOptions = [],
  officeOptions = [],
  createdBy,
  onOpenDeliveryDateModal,
  onClose,
  formErrors = {},
  doctorDropdownOpen,
  setDoctorDropdownOpen,
  isSubmitted = false,
  onContinue,
  onOfficeSelect,
  onRefreshOffices,
}: AddSlipHeaderProps) {
  // Focused spotlight functionality
  const {
    isSpotlightActive,
    targetElement,
    activateSpotlight,
    deactivateSpotlight
  } = useFocusedSpotlight()

  const [showSpotlight, setShowSpotlight] = useState(false)

  // Get selected entity for logo display
  const selectedEntity = selectedOfficeObj || selectedLabObj
  const customerId = selectedEntity?.id

  // Handler for Enter key on patient input (now inside the component)
  const handlePatientInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && typeof onContinue === "function") {
      e.preventDefault(); // Prevent default form submission
      
      // Add visual feedback
      const input = e.currentTarget;
      input.style.backgroundColor = '#f0f9ff'; // Light blue background
      setTimeout(() => {
        input.style.backgroundColor = '';
      }, 200);
      
      // Call the continue function
      onContinue();
      
      // Remove focus from the input after Enter
      if (patientInputRef.current) {
        patientInputRef.current.blur();
      }
    }
  };

  const router = useRouter()
  const { fetchOfficeDoctors } = useSlipCreation()
  const patientInputRef = useRef<HTMLInputElement>(null)

  // Focus patient input when doctor changes (and not submitted)
  useEffect(() => {
    if (!isSubmitted && formData.doctor) {
      // Use setTimeout to ensure focus after dropdown closes and DOM is stable
      const timeout = setTimeout(() => {
        patientInputRef.current?.focus();
        patientInputRef.current?.select();
      }, 100);
      return () => clearTimeout(timeout);
    }
    // Only run when doctor changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.doctor, isSubmitted]);

  // Auto-select doctor if only one is available (without opening dropdown)
  useEffect(() => {
    if (!isSubmitted && doctorOptions && doctorOptions.length === 1 && !formData.doctor) {
      const singleDoctor = doctorOptions[0];
      const doctorName = singleDoctor.full_name || `${singleDoctor.first_name || ""} ${singleDoctor.last_name || ""}`.trim() || "Unknown Doctor";
      const doctorId = String(singleDoctor.id);
      
      setFormData((prev: any) => ({
        ...prev,
        doctor: doctorName,
        doctor_id: doctorId,
      }));
      
      // Ensure dropdown is closed when auto-selecting
      if (setDoctorDropdownOpen) {
        setDoctorDropdownOpen(false);
      }
    }
  }, [doctorOptions, isSubmitted, formData.doctor, setDoctorDropdownOpen]);

  // Helper to get doctor id from doctorOptions by name
  const getDoctorIdByName = (doctorName: string) => {
    if (!doctorOptions || doctorOptions.length === 0) return ""
    const foundDoc = doctorOptions.find(
      (doc: any) =>
        doc.full_name === doctorName ||
        `${doc.first_name} ${doc.last_name}` === doctorName
    )
    return foundDoc ? String(foundDoc.id) : ""
  }

  return (
    <div className="w-full max-w-7xl">
      {/* Compact Header Design - Show when doctor is selected */}
      {!isSubmitted && formData.doctor && (formData.office || formData.lab) && (
        <div className="bg-gray-50 py-3 flex items-center justify-center">
          <div className="w-full max-w-4xl px-3 mr-auto">
            {/* Information Section */}
            <div className="flex gap-3">
              {/* Doctor Profile Image - Left Edge */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-100">
                  {(() => {
                    const selectedDoctor = doctorOptions?.find((doc: any) =>
                      String(doc.id) === formData.doctor_id
                    )

                    return selectedDoctor?.profile_image ? (
                      <img
                        src={selectedDoctor.profile_image}
                        alt={formData.doctor}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src="/images/doctor-image.png"
                        alt="Default Doctor"
                        className="w-full h-full object-cover"
                      />
                    )
                  })()}
                </div>
              </div>

              {/* Right Side Content */}
              <div className="flex-1 space-y-1.5">
                {/* Office/Lab Logo and Name */}
                <div className="flex items-center gap-2">
                  <CustomerLogo
                    customerId={customerId}
                    fallbackLogo={selectedEntity?.logo_url}
                    alt={formData.office || formData.lab}
                    className="w-8 h-8 rounded"
                  />
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide" style={{ color: '#2E5C8A' }}>
                      {(() => {
                        // Try to get the customer name from localStorage user variable
                        if (typeof window !== "undefined") {
                          try {
                            const userStr = localStorage.getItem("user");
                            if (userStr) {
                              const userObj = JSON.parse(userStr);
                              // Find the first customer (or primary if needed)
                              if (Array.isArray(userObj.customers) && userObj.customers.length > 0) {
                                // If there is a primary, use it, else use the first
                                const primary = userObj.customers.find((c: any) => c.is_primary === 1);
                                return (primary ? primary.name : userObj.customers[0].name) || (formData.office || formData.lab);
                              }
                            }
                          } catch (e) {
                            // fallback to formData.office || formData.lab
                          }
                        }
                        return formData.office || formData.lab;
                      })()}
                    </h2>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Modern Dentistry</p>
                  </div>
                </div>

                {/* Doctor Name with Edit */}
                <div className="relative" style={{ width: "50%" }}>
                  <Input
                    value={formData.doctor}
                    readOnly
                    className="h-7 text-sm font-medium bg-gray-50 border-gray-300 pr-10 w-full"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormData((prev: any) => ({
                        ...prev,
                        doctor: "",
                        doctor_id: "",
                        patient: "",
                      }))
                      if (setDoctorDropdownOpen) setDoctorDropdownOpen(true)
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>

                {/* Lab Field */}
                <div className="flex items-center gap-2" style={{ width: "50%" }}>
                  <Label className="font-semibold text-xs text-gray-700 min-w-[35px]">Lab:</Label>
                  <div className="relative flex-1" style={{ width: "50%" }}>
                    <Input
                      value={formData.office || formData.lab}
                      readOnly
                      className="h-7 text-sm font-medium bg-gray-50 border-gray-300 pr-10 w-full"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData((prev: any) => ({
                          ...prev,
                          office: "",
                          office_id: "",
                          lab: "",
                          lab_id: "",
                          doctor: "",
                          doctor_id: "",
                          patient: "",
                        }))
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Patient Field */}
                <div className="flex items-center gap-2" style={{ width: "50%" }}>
                  <Label className="font-semibold text-xs text-gray-700 min-w-[35px]">Patient:</Label>
                  <div className="relative flex-1" style={{ width: "50%" }}>
                    <div className="relative">
                      <Input
                        value={formData.patient}
                        readOnly
                        onClick={() => {
                          setFormData((prev: any) => ({
                            ...prev,
                            patient: "",
                          }))
                          setTimeout(() => patientInputRef.current?.focus(), 100)
                        }}
                        className="h-7 text-sm font-medium bg-gray-50 border-gray-300 pr-10 cursor-pointer w-full"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFormData((prev: any) => ({
                            ...prev,
                            patient: "",
                          }))
                          setTimeout(() => patientInputRef.current?.focus(), 100)
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selection UI - Show when nothing is selected yet */}
      {!isSubmitted && !(formData.lab || formData.office) && (
        <div className="px-4 py-3">
          <h2 className="text-base font-bold mb-2">Add Slip</h2>
          <div className="flex items-center gap-2">
            {/* Company Logo */}
            {(selectedOfficeObj || selectedLabObj || formData.office || formData.lab) && (
              <CustomerLogo
                customerId={customerId}
                fallbackLogo={selectedOfficeObj?.logo_url || selectedLabObj?.logo_url}
                alt={selectedOfficeObj?.name || selectedLabObj?.name || formData.office || formData.lab}
                className="w-8 h-8 rounded object-contain border bg-white"
              />
            )}
            {/* Company Dropdown */}
            <div
              onFocus={() => showSpotlight && activateSpotlight(document.activeElement as HTMLElement)}
              onBlur={() => showSpotlight && deactivateSpotlight()}
              className="flex-1"
            >
              <Select
                value={formData.office || formData.lab}
                onValueChange={(value) => {
                  if (isSubmitted) return;

                  // Handle office/lab selection
                  if (officeOptions && officeOptions.length > 0) {
                    // Check if it's an office (has office property) or lab (has lab property)
                    const selectedItem = officeOptions.find((item: any) =>
                      item.name === value ||
                      item.office?.name === value ||
                      item.lab?.name === value
                    );

                    if (selectedItem) {
                      let itemId: string | number = "";
                      let itemName: string = "";

                      if (selectedItem.office) {
                        // It's an office
                        itemId = selectedItem.office.id;
                        itemName = selectedItem.office.name || "";
                        setFormData((prev: any) => ({
                          ...prev,
                          office: itemName,
                          office_id: itemId,
                          lab: itemName, // Set lab to office name for lab admins
                          lab_id: itemId,
                        }))
                      } else if (selectedItem.lab) {
                        // It's a lab
                        itemId = selectedItem.lab.id;
                        itemName = selectedItem.lab.name || "";
                        setFormData((prev: any) => ({
                          ...prev,
                          lab: itemName,
                          lab_id: itemId,
                        }))
                      } else {
                        // Direct name/id (fallback)
                        itemId = selectedItem.id;
                        itemName = selectedItem.name || "";
                        setFormData((prev: any) => ({
                          ...prev,
                          lab: itemName,
                          lab_id: itemId,
                        }))
                      }

                      if (onOfficeSelect && itemId) {
                        onOfficeSelect(String(itemId), itemName);
                      }
                      return;
                    }
                  }

                  // Fallback for direct value
                  setFormData((prev: any) => ({
                    ...prev,
                    lab: value || "",
                    lab_id: value || "",
                  }))
                }}
                disabled={isSubmitted}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={selectedOfficeObj ? "Select Office" : "Select Lab"} />
                </SelectTrigger>
                <SelectContent>
                  {officeOptions && officeOptions.length > 0 ? (
                    officeOptions.map((item: any) => {
                      // Handle both office and lab structures
                      const itemId = item.id || item.office?.id || item.lab?.id || "";
                      const itemName = item.name || item.office?.name || item.lab?.name || "";
                      return (
                        <SelectItem
                          key={itemId}
                          value={itemName}
                        >
                          {itemName}
                        </SelectItem>
                      );
                    })
                  ) : (
                    formData.office || formData.lab ? (
                      <SelectItem key={formData.office || formData.lab || "default"} value={formData.office || formData.lab || ""}>
                        {formData.office || formData.lab}
                      </SelectItem>
                    ) : (
                      <SelectItem value="no-options" disabled>
                        No {selectedOfficeObj ? "offices" : "labs"} available
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            {/* Refresh Button */}
            {onRefreshOffices && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefreshOffices}
                className="h-9 w-9 p-0"
              >
                <RefreshCw className="h-4 w-4 text-blue-600" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Doctor Selection - Show when lab/office selected but no doctor */}
      {!isSubmitted && (formData.lab || formData.office) && !formData.doctor && (
        <div className="px-4 py-3">
          <div className="space-y-1.5">
            <Label className="font-semibold text-xs text-gray-700">Select Doctor</Label>
            <Select
              open={doctorDropdownOpen}
              onOpenChange={setDoctorDropdownOpen}
              value={formData.doctor}
              onValueChange={(value) => {
                if (isSubmitted) return;
                // Get doctor id from doctorOptions
                const doctorId = getDoctorIdByName(value)
                setFormData((prev: any) => ({
                  ...prev,
                  doctor: value,
                  doctor_id: doctorId,
                }))
                if (setDoctorDropdownOpen) setDoctorDropdownOpen(false) // Close after selection
              }}
              disabled={isSubmitted || (!selectedLabObj && !formData.lab)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Choose your doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctorOptions && doctorOptions.length > 0 ? (
                  doctorOptions.map((doc: any) => (
                    <SelectItem key={doc.id} value={doc.full_name || `${doc.first_name} ${doc.last_name}`}>
                      {doc.full_name || `${doc.first_name} ${doc.last_name}`}
                    </SelectItem>
                  ))
                ) : (
                  formData.doctor ? (
                    <SelectItem key={formData.doctor} value={formData.doctor}>
                      {formData.doctor}
                    </SelectItem>
                  ) : (
                    <SelectItem value="no-doctors" disabled>
                      No doctors available
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            {formErrors.doctor && (
              <span className="text-red-500 text-xs">{formErrors.doctor}</span>
            )}
          </div>
        </div>
      )}

      {/* Patient Input - Show when doctor selected but no patient */}
      {!isSubmitted && formData.doctor && !formData.patient && (
        <div className="px-4 py-3">
          <div
            onFocus={() => showSpotlight && activateSpotlight(document.activeElement as HTMLElement)}
            onBlur={() => showSpotlight && deactivateSpotlight()}
          >
            <Input
              ref={patientInputRef}
              label="Patient Name"
              value={formData.patient}
              onChange={(e) => {
                if (isSubmitted) return;
                setFormData((prev: any) => ({ ...prev, patient: e.target.value }))
              }}
              onKeyDown={handlePatientInputKeyDown}
              placeholder="Enter patient name"
              validationState={formErrors.patient ? "error" : formData.patient ? "valid" : "default"}
              errorMessage={formErrors.patient}
              disabled={isSubmitted}
            />
          </div>
        </div>
      )}

      {/* Old Three Column Layout - Only show for submitted slips */}
      {isSubmitted && (
        <>
          <div className="px-3 mb-1 text-center sm:text-left">
            <h2 className="text-xs font-bold">Virtual Slip</h2>
          </div>
          <div className="px-3 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:gap-8 items-start w-full">
            {/* Left Column */}
            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center gap-2 w-full">
                <Label className="font-semibold min-w-[50px] text-xs">Doctor</Label>
                <span className="h-5 flex items-center px-2 text-xs font-normal text-gray-800 rounded w-full">
                  {formData.doctor || "-"}
                </span>
              </div>
              <div className="flex items-center gap-2 w-full">
                <Label className="font-semibold min-w-[50px] text-xs">Patient</Label>
                <span className="h-5 flex items-center px-2 text-xs font-normal text-gray-800 rounded w-full">
                  {formData.patient || "-"}
                </span>
              </div>
            </div>
            {/* Middle Column - IDs, Created By, Location, Case Status */}
            <div className="flex flex-col gap-1.5 w-full">
              {/* Pan #, Case #, Slip # - Only show when case is submitted */}
              <div className="flex items-center justify-between gap-2">
                <Label className="font-semibold whitespace-nowrap text-xs">Pan #:</Label>
                <span className="h-5 flex items-center px-2 text-xs font-normal text-gray-800 rounded w-full">
                  {formData.panNumber || "-"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="font-semibold whitespace-nowrap text-xs">Case #</Label>
                <span className="h-5 flex items-center px-2 text-xs font-normal text-gray-800 rounded w-full">
                  {formData.caseNumber || "-"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="font-semibold whitespace-nowrap text-xs">Slip #:</Label>
                <span className="h-5 flex items-center px-2 text-xs font-normal text-gray-800 rounded w-full">
                  {formData.slipNumber || "-"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="font-semibold whitespace-nowrap text-xs">Created By</Label>
                <span className="h-5 flex items-center px-2 text-xs font-normal text-gray-800 rounded w-full">
                  {createdBy || formData.createdBy || "-"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="font-semibold whitespace-nowrap text-xs">Location</Label>
                <span className="h-5 flex items-center px-2 text-xs font-normal text-gray-800 rounded w-full">
                  {formData.location || "Draft"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="font-semibold whitespace-nowrap text-xs">Case Status</Label>
                <span className="h-5 flex items-center px-2 text-xs font-normal text-gray-800 rounded w-full">
                  {formData.caseStatus || "-"}
                </span>
              </div>
            </div>
            {/* Right Column - Dates and Time */}
            <div className="flex flex-col gap-1.5 w-full">
              {/* Pick up Date */}
              <div className="flex items-center justify-between gap-2">
                <Label className="font-semibold whitespace-nowrap text-xs">Pick up Date</Label>
                <div className="flex items-center">
                  <span className="h-5 flex items-center px-2 text-xs font-normal text-gray-800 rounded w-full min-w-[80px]">
                    {formData.pickupDate ? dayjs(formData.pickupDate).format("MM/DD/YYYY") : "-----"}
                  </span>
                </div>
              </div>
              {/* Delivery Date */}
              <div className="flex items-center justify-between gap-2">
                <Label className="font-semibold whitespace-nowrap text-xs">Delivery Date</Label>
                <div className="flex items-center">
                  <span className="h-5 flex items-center px-2 text-xs font-normal text-gray-800 rounded w-full min-w-[80px]">
                    {formData.deliveryDate ? dayjs(formData.deliveryDate).format("MM/DD/YYYY") : "-----"}
                  </span>
                </div>
              </div>
              {/* Delivery Time */}
              <div className="flex items-center justify-between gap-2">
                <Label className="font-semibold whitespace-nowrap text-xs">Delivery Time</Label>
                <div className="flex items-center">
                  <span className="h-5 flex items-center px-2 text-xs font-normal text-gray-800 rounded w-full min-w-[80px]">
                    {formData.deliveryTime && dayjs(formData.deliveryTime, ["HH:mm", "h:mm A"], true).isValid()
                      ? dayjs(formData.deliveryTime, ["HH:mm", "h:mm A"]).format("h:mm A")
                      : "-----"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
