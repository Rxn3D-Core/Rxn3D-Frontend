import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { FieldInput, SelectField } from "./fields";
import type { SlipCreationResponse } from "@/services/slip-creation-service";

export interface PatientHeaderProps {
  /** Selected doctor image URL (from wizard). Falls back to placeholder when not provided. */
  doctorImageUrl?: string | null;
  /** Selected doctor display name (from wizard). Falls back to placeholder when not provided. */
  doctorName?: string | null;
  /** Patient name from the selected user in the patient name section. Updates dynamically when selection changes. */
  patientName?: string | null;
  /** Gender from the selected user in the patient name section. Updates dynamically when selection changes. */
  gender?: string | null;
  /** When true, show case-related fields (slip number, case number, etc.). Hidden until case is submitted. */
  caseSubmitted?: boolean;
  /** When true, show skeleton placeholders while slip response is loading. */
  slipHeaderLoading?: boolean;
  /** Slip creation response data used to populate the submitted header fields. */
  slipResponseData?: SlipCreationResponse["data"] | null;
  /** Called when the user clicks the pencil to change doctor selection. */
  onEditDoctorClick?: () => void;
  /** Called when the user edits the patient name inline. */
  onPatientNameChange?: (value: string) => void;
  /** Called when the user edits the gender inline. */
  onGenderChange?: (value: string) => void;
  /** When true, show Patient name + Gender in one row (for removable restoration / orthodontics with products). */
  compactLayout?: boolean;
}

function SkeletonField({ label, width = "w-[160px]" }: { label: string; width?: string }) {
  return (
    <fieldset className={`border rounded px-3 py-0 relative h-[42px] flex items-center border-[#b4b0b0] ${width}`}>
      <legend className="text-sm px-1 leading-none whitespace-nowrap text-[#7f7f7f]">
        {label}
      </legend>
      <span className="inline-block w-full h-4 bg-gray-200 rounded animate-pulse" />
    </fieldset>
  );
}

const DEFAULT_DOCTOR_IMAGE = "/images/doctor-image.png";
const DEFAULT_DOCTOR_NAME = "Cody Mugglestone, DDS";
const DEFAULT_PATIENT_NAME = "Jose Protacio Rizal Mercado y Alonzo";
const DEFAULT_GENDER = "Male";

export function PatientHeader({ doctorImageUrl, doctorName, patientName, gender, caseSubmitted = false, slipHeaderLoading = false, slipResponseData, onEditDoctorClick, onPatientNameChange, onGenderChange, compactLayout = false }: PatientHeaderProps = {}) {
  const imgSrc = doctorImageUrl && doctorImageUrl.trim() !== "" ? doctorImageUrl : DEFAULT_DOCTOR_IMAGE;
  const displayName = doctorName && doctorName.trim() !== "" ? doctorName : DEFAULT_DOCTOR_NAME;
  const isEditable = !caseSubmitted;
  const displayPatientName = isEditable ? (patientName ?? "") : (patientName && patientName.trim() !== "" ? patientName : DEFAULT_PATIENT_NAME);
  const displayGender = gender && gender.trim() !== "" ? gender : (isEditable ? "" : DEFAULT_GENDER);

  const firstSlip = slipResponseData?.slips?.[0];

  const slipNumber = firstSlip?.slip_number ?? "";
  const caseNumber = slipResponseData?.case_number ?? "";
  const panNumber = firstSlip?.casepan?.number ?? "";
  const status = firstSlip?.status ?? slipResponseData?.case_status ?? "";
  const location = firstSlip?.location?.name ?? "";

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return `${String(d.getMonth() + 1).padStart(2, "0")}/ ${String(d.getDate()).padStart(2, "0")}/ ${String(d.getFullYear()).slice(2)}`;
  };

  const formatTime = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "pm" : "am";
    const hour = h % 12 || 12;
    return m === 0 ? `${hour} ${ampm}` : `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const pickupDate = formatDate(firstSlip?.delivery?.pickup_date);
  const dueDate = formatDate(firstSlip?.delivery?.delivery_date);
  const deliveryTime = formatTime(firstSlip?.delivery?.delivery_time);

  const [createdByName, setCreatedByName] = useState("");
  const [createdByImage, setCreatedByImage] = useState("");

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setCreatedByName(`${user.first_name || ""} ${user.last_name || ""}`.trim());
        if (user.image) setCreatedByImage(user.image);
      }
    } catch {}
  }, []);

  return (
    <div className={`bg-[#fdfdfd] border-b border-[#d9d9d9] px-4 sm:px-6 ${compactLayout && !caseSubmitted ? "py-1" : "py-2"}`}>
      <div className={`flex flex-col lg:flex-row items-center ${compactLayout && !caseSubmitted ? "gap-2 lg:gap-4" : "lg:items-start gap-4 lg:gap-8"}`}>
        {/* Doctor photo + name */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className={`${caseSubmitted ? "w-[90px] h-[90px] sm:w-[130px] sm:h-[130px]" : compactLayout ? "w-[40px] h-[40px] sm:w-[50px] sm:h-[50px] hover:w-[70px] hover:h-[70px] sm:hover:w-[100px] sm:hover:h-[100px] transition-all duration-300 ease-in-out cursor-pointer" : "w-[70px] h-[70px] sm:w-[100px] sm:h-[100px]"} rounded-full overflow-hidden bg-gray-200 flex items-center justify-center relative`}>
            <img
              src={imgSrc}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_DOCTOR_IMAGE;
              }}
              alt="Doctor"
              className="w-full h-full object-cover"
            />
            {!caseSubmitted && (
              <button
                type="button"
                onClick={onEditDoctorClick}
                className="absolute bottom-0 right-0 p-1 rounded-full bg-white shadow border border-[#d9d9d9] hover:bg-[#e5e7eb] transition-colors text-[#b4b0b0] hover:text-[#1d1d1b]"
                aria-label="Change doctor"
              >
                <Pencil size={10} />
              </button>
            )}
          </div>
          {caseSubmitted && (
            <p className="text-lg font-medium text-[#1d1d1b] whitespace-nowrap">
              {displayName}
            </p>
          )}
        </div>

        {/* Form fields */}
        <div className="flex-1 w-full lg:w-auto flex flex-col gap-3 justify-center lg:justify-start">
          {!caseSubmitted ? (
            compactLayout ? (
              /* Compact: Patient name + Gender in one row (removable/orthodontics with products) */
              <div className="flex gap-3 sm:gap-4 items-start justify-center lg:justify-start">
                <FieldInput
                  label="Patient name"
                  value={displayPatientName}
                  submitted={false}
                  onChange={onPatientNameChange}
                  className="w-[330px]"
                />
                {onGenderChange ? (
                  <SelectField
                    label="Gender"
                    value={displayGender}
                    options={["Male", "Female"]}
                    onChange={onGenderChange}
                    caseSubmitted={false}
                    className="w-[330px]"
                  />
                ) : (
                  <FieldInput label="Gender" value={displayGender} submitted={false} className="w-[330px]" />
                )}
              </div>
            ) : (
              /* Default: Patient name and Gender stacked (fixed restoration) */
              <>
                <div className="flex gap-3 sm:gap-4 items-start justify-center lg:justify-start">
                  <FieldInput
                    label="Patient name"
                    value={displayPatientName}
                    submitted={false}
                    onChange={onPatientNameChange}
                    className="w-[330px]"
                  />
                </div>
                <div className="flex gap-3 sm:gap-4 items-start justify-center lg:justify-start">
                  {onGenderChange ? (
                    <SelectField
                      label="Gender"
                      value={displayGender}
                      options={["Male", "Female"]}
                      onChange={onGenderChange}
                      caseSubmitted={false}
                      className="w-[330px]"
                    />
                  ) : (
                    <FieldInput label="Gender" value={displayGender} submitted={false} className="w-[330px]" />
                  )}
                </div>
              </>
            )
          ) : (
            <>
              {/* Row 1: Patient name, Slip number, Case number, Pan number, Status */}
              <div className="flex flex-nowrap gap-3 sm:gap-4 items-start justify-center lg:justify-start">
                <FieldInput
                  label="Patient name"
                  value={displayPatientName}
                  submitted
                  className="flex-1 min-w-0"
                />
                {slipHeaderLoading ? (
                  <>
                    <SkeletonField label="Slip number" width="flex-1 min-w-0" />
                    <SkeletonField label="Case number" width="flex-1 min-w-0" />
                    <SkeletonField label="Pan number" width="flex-1 min-w-0" />
                    <SkeletonField label="Status" width="flex-1 min-w-0" />
                  </>
                ) : (
                  <>
                    <FieldInput label="Slip number" value={slipNumber} submitted className="flex-1 min-w-0" />
                    <FieldInput label="Case number" value={caseNumber} submitted className="flex-1 min-w-0" />
                    <FieldInput label="Pan number" value={panNumber} submitted className="flex-1 min-w-0" />
                    <FieldInput label="Status" value={status} submitted className="flex-1 min-w-0" />
                  </>
                )}
              </div>
              {/* Row 2: Gender, Pick up Date, Due Date, Delivery Time, Location */}
              <div className="flex flex-nowrap gap-3 sm:gap-4 items-start justify-center lg:justify-start">
                <FieldInput label="Gender" value={displayGender} submitted className="flex-1 min-w-0" />
                {slipHeaderLoading ? (
                  <>
                    <SkeletonField label="Pick up Date" width="flex-1 min-w-0" />
                    <SkeletonField label="Due Date" width="flex-1 min-w-0" />
                    <SkeletonField label="Delivery Time" width="flex-1 min-w-0" />
                    <SkeletonField label="Location" width="flex-1 min-w-0" />
                  </>
                ) : (
                  <>
                    <FieldInput label="Pick up Date" value={pickupDate} submitted className="flex-1 min-w-0" />
                    <FieldInput label="Due Date" value={dueDate} submitted className="flex-1 min-w-0" />
                    <FieldInput label="Delivery Time" value={deliveryTime} submitted className="flex-1 min-w-0" />
                    <FieldInput label="Location" value={location} submitted className="flex-1 min-w-0" />
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Created By - only show after submission */}
        {caseSubmitted && (
          <div className="flex flex-col justify-center items-center gap-[15px] w-[170px] flex-shrink-0 lg:ml-2">
            <div className="w-[60px] h-[60px] sm:w-[72.74px] sm:h-[72.74px] rounded-full overflow-hidden flex-shrink-0 bg-gray-200 flex items-center justify-center">
              {createdByImage ? (
                <img
                  src={createdByImage}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/images/created-by.png";
                  }}
                  alt="Creator"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-gray-500">
                  {createdByName.split(" ").map(n => n[0]).join("").toUpperCase()}
                </span>
              )}
            </div>
            <fieldset className="w-[170px] h-[38px] border border-[#7f7f7f] rounded-[7px] bg-white px-[11.2px] py-0 flex items-center">
              <legend className="text-sm text-[#7f7f7f] px-1 leading-[15px]">
                Created By
              </legend>
              <span className="text-lg leading-[20px] text-[#000000] whitespace-nowrap">
                {createdByName || "—"}
              </span>
            </fieldset>
          </div>
        )}
      </div>
    </div>
  );
}
