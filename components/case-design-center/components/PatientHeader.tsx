import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { FieldInput } from "./fields";

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
  /** Called when the user clicks the pencil to change doctor selection. */
  onEditDoctorClick?: () => void;
}

const DEFAULT_DOCTOR_IMAGE = "/images/doctor-image.png";
const DEFAULT_DOCTOR_NAME = "Cody Mugglestone, DDS";
const DEFAULT_PATIENT_NAME = "Jose Protacio Rizal Mercado y Alonzo";
const DEFAULT_GENDER = "Male";

export function PatientHeader({ doctorImageUrl, doctorName, patientName, gender, caseSubmitted = false, onEditDoctorClick }: PatientHeaderProps = {}) {
  const imgSrc = doctorImageUrl && doctorImageUrl.trim() !== "" ? doctorImageUrl : DEFAULT_DOCTOR_IMAGE;
  const displayName = doctorName && doctorName.trim() !== "" ? doctorName : DEFAULT_DOCTOR_NAME;
  const displayPatientName = patientName && patientName.trim() !== "" ? patientName : DEFAULT_PATIENT_NAME;
  const displayGender = gender && gender.trim() !== "" ? gender : DEFAULT_GENDER;

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
    <div className="bg-[#fdfdfd] border-b border-[#d9d9d9] px-4 sm:px-6 py-2">
      <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 lg:gap-8">
        {/* Doctor photo + name (selected doctor from wizard) */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="w-[70px] h-[70px] sm:w-[90px] sm:h-[90px] rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            <img
              src={imgSrc}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_DOCTOR_IMAGE;
              }}
              alt="Doctor"
              className="w-full h-full object-cover"
            />
          </div>
          {!caseSubmitted && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onEditDoctorClick}
                className="p-0.5 rounded hover:bg-[#e5e7eb] transition-colors text-[#b4b0b0] hover:text-[#1d1d1b]"
                aria-label="Change doctor"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
          <p className="text-lg font-medium text-[#1d1d1b] whitespace-nowrap">
            {displayName}
          </p>
        </div>

        {/* Form fields - Two-row layout */}
        <div className="flex-1 w-full lg:w-auto flex flex-col gap-3 justify-center lg:justify-start">
          {/* Row 1: Patient name, Slip number, Case number, Pan number, Status */}
          <div className="flex flex-wrap gap-3 sm:gap-4 items-start justify-center lg:justify-start">
            <FieldInput
              label="Patient name"
              value={displayPatientName}
              submitted={caseSubmitted}
            />
            {caseSubmitted && (
              <>
                <FieldInput label="Slip number" value="S687954" submitted />
                <FieldInput label="Case number" value="C125489" submitted />
                <FieldInput label="Pan number" value="A68" submitted />
                <FieldInput label="Status" value="In process" submitted />
              </>
            )}
          </div>
          {/* Row 2: Gender, Pick up Date, Due Date, Delivery Time, Location */}
          <div className="flex flex-wrap gap-3 sm:gap-4 items-start justify-center lg:justify-start">
            <FieldInput label="Gender" value={displayGender} submitted={caseSubmitted} />
            {caseSubmitted && (
              <>
                <FieldInput label="Pick up Date" value="01/ 01/ 25" submitted />
                <FieldInput label="Due Date" value="01/ 01/ 25" submitted />
                <FieldInput label="Delivery Time" value="5 pm" submitted />
                <FieldInput label="Location" value="In office ready to pick up" submitted />
              </>
            )}
          </div>
        </div>

        {/* Created By */}
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
      </div>
    </div>
  );
}
