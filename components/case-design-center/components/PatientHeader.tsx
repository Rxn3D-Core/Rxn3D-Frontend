import { Pencil } from "lucide-react";
import { FieldInput } from "./fields";

export interface PatientHeaderProps {
  /** Selected doctor image URL (from wizard). Falls back to placeholder when not provided. */
  doctorImageUrl?: string | null;
  /** Selected doctor display name (from wizard). Falls back to placeholder when not provided. */
  doctorName?: string | null;
}

const DEFAULT_DOCTOR_IMAGE = "/images/doctor-image.png";
const DEFAULT_DOCTOR_NAME = "Cody Mugglestone, DDS";

export function PatientHeader({ doctorImageUrl, doctorName }: PatientHeaderProps = {}) {
  const imgSrc = doctorImageUrl && doctorImageUrl.trim() !== "" ? doctorImageUrl : DEFAULT_DOCTOR_IMAGE;
  const displayName = doctorName && doctorName.trim() !== "" ? doctorName : DEFAULT_DOCTOR_NAME;

  return (
    <div className="bg-[#fdfdfd] border-b border-[#d9d9d9] px-4 sm:px-6 py-4">
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
          <div className="flex items-center gap-1">
            <Pencil size={12} className="text-[#b4b0b0]" />
          </div>
          <p className="text-[13px] font-semibold text-[#1d1d1b] whitespace-nowrap">
            {displayName}
          </p>
        </div>

        {/* Form fields - Flexible layout */}
        <div className="flex-1 w-full lg:w-auto flex flex-wrap gap-3 sm:gap-4 items-start content-start justify-center lg:justify-start">
          <FieldInput
            label="Patient name"
            value="Jose Protacio Rizal Mercado y Alonzo"
          />
          <FieldInput label="Slip number" value="S687954" />
          <FieldInput label="Case number" value="C125489" />
          <FieldInput label="Pan number" value="A68" />
          <FieldInput label="Status" value="In process" />
          <FieldInput label="Gender" value="Male" />
          <FieldInput label="Pick up Date" value="01/ 01/ 25" />
          <FieldInput label="Due  Date" value="01/ 01/ 25" />
          <FieldInput label="Delivery Time" value="5 pm" />
          <FieldInput label="Location" value="In office ready to pick up" />
        </div>

        {/* Created By */}
        <div className="flex flex-col justify-center items-center gap-[15px] w-[170px] flex-shrink-0 lg:ml-2">
          <div className="w-[60px] h-[60px] sm:w-[72.74px] sm:h-[72.74px] rounded-full overflow-hidden flex-shrink-0">
            <img
              src="/images/doctor-image.png"
              alt="Creator"
              className="w-full h-full object-cover"
            />
          </div>
          <fieldset className="w-[170px] h-[34px] border border-[#7f7f7f] rounded-[7px] bg-white px-[11.2px] py-0 flex items-center">
            <legend className="text-[12px] text-[#7f7f7f] px-1 leading-[13px]">
              Created By
            </legend>
            <span className="text-[14px] leading-[17px] text-[#1F2937] whitespace-nowrap">
              Cassandra Vega
            </span>
          </fieldset>
        </div>
      </div>
    </div>
  );
}
