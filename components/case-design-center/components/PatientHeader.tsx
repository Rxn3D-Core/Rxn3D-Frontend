import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { FieldInput, SelectField } from "./fields";
import type { SlipCreationResponse } from "@/services/slip-creation-service";
import { caseDesignInter } from "../case-design-inter-font";
import { useCreatedByUser } from "@/hooks/use-created-by-user";
import { isLabCustomerContext } from "@/lib/role-utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api";

export interface PatientHeaderProps {
  /** Selected doctor image URL (from wizard). Falls back to placeholder when not provided. */
  doctorImageUrl?: string | null;
  /** Selected doctor display name (from wizard). Falls back to placeholder when not provided. */
  doctorName?: string | null;
  /** Patient name from the selected user in the patient name section. Updates dynamically when selection changes. */
  patientName?: string | null;
  /** Gender from the selected user in the patient name section. Updates dynamically when selection changes. */
  gender?: string | null;
  /** Age from the selected user in the patient name section. Updates dynamically when selection changes. */
  age?: number | string | null;
  /** When true, show case-related fields (slip number, case number, etc.). Hidden until case is submitted. */
  caseSubmitted?: boolean;
  /** When true, show skeleton placeholders while slip response is loading. */
  slipHeaderLoading?: boolean;
  /** Slip creation response data used to populate the submitted header fields. */
  slipResponseData?: SlipCreationResponse["data"] | null;
  /** Called when the user clicks the pencil to change doctor selection. */
  onEditDoctorClick?: () => void;
  /** When false, hide doctor edit (e.g. only one doctor available). */
  canEditDoctor?: boolean;
  /** Called when the user edits the patient name inline. */
  onPatientNameChange?: (value: string) => void;
  /** Called when the user edits the gender inline. */
  onGenderChange?: (value: string) => void;
  /** Called when the user edits the age inline. */
  onAgeChange?: (value: string) => void;
  /** Selected lab/office logo URL (the wizard selection). */
  labLogoUrl?: string | null;
  /** Selected lab/office name (fallback when no logo). */
  labName?: string | null;
  /** Called when the user clicks the pencil to change the lab/office selection. */
  onEditLab?: () => void;
  /**
   * @deprecated No longer drives a hover layout — kept for call-site compatibility.
   * The header now always renders the unified virtual-slip-style layout.
   */
  compactLayout?: boolean;
  /** Override the "Created By" name (falls back to localStorage user). */
  createdByName?: string | null;
  /** Override the "Created By" image URL (falls back to localStorage user). */
  createdByImageUrl?: string | null;
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

const DEFAULT_DOCTOR_NAME = "Cody Mugglestone, DDS";
const DEFAULT_PATIENT_NAME = "Jose Protacio Rizal Mercado y Alonzo";
const DEFAULT_GENDER = "Male";

/** Matches the virtual-slip header avatar treatment (big circle, name below). */
const AVATAR_SIZE = "w-[clamp(87px,9vw,117px)] h-[clamp(87px,9vw,117px)]";
const AVATAR_COLUMN_WIDTH = "w-[clamp(91px,9vw,137px)]";
const AVATAR_NAME_MAX = "max-w-[clamp(91px,9vw,137px)]";

/** One logo cell in the center top row (office on the left, lab on the right). */
function LogoCell({
  logo,
  name,
  prominent = false,
  editable = false,
  onEdit,
  alignEnd = false,
}: {
  logo: string | null;
  name?: string | null;
  prominent?: boolean;
  editable?: boolean;
  onEdit?: () => void;
  alignEnd?: boolean;
}) {
  const hasContent = Boolean((logo && logo.trim() !== "") || (name && name.trim() !== ""));
  if (!hasContent) return <div className="min-w-0 flex-1" aria-hidden />;

  const imgClass = prominent
    ? "h-[clamp(34px,4vw,52px)] max-w-[clamp(120px,16vw,200px)] object-contain"
    : "h-[clamp(24px,3vw,40px)] max-w-[clamp(64px,8vw,110px)] object-contain";

  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${alignEnd ? "justify-end" : ""}`}>
      {logo && logo.trim() !== "" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={name ? `${name} logo` : "Logo"}
          className={imgClass}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span className="truncate text-sm font-semibold text-[#1d1d1b] sm:text-base">{name}</span>
      )}
      {editable && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 rounded p-1 text-[#7f7f7f] transition-colors hover:bg-[#e5e7eb] hover:text-[#1d1d1b]"
          aria-label="Change lab or office"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function PatientHeader({
  doctorImageUrl,
  doctorName,
  patientName,
  gender,
  age,
  caseSubmitted = false,
  slipHeaderLoading = false,
  slipResponseData,
  onEditDoctorClick,
  canEditDoctor = false,
  onPatientNameChange,
  onGenderChange,
  onAgeChange,
  labLogoUrl,
  labName,
  onEditLab,
  createdByName: createdByNameProp,
  createdByImageUrl: createdByImageUrlProp,
}: PatientHeaderProps = {}) {
  const hasDoctorImage = Boolean(doctorImageUrl && doctorImageUrl.trim() !== "");
  const displayName = doctorName && doctorName.trim() !== "" ? doctorName : DEFAULT_DOCTOR_NAME;
  const doctorInitials = displayName
    .replace(/,?\s*DDS$/i, "")
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const isEditable = !caseSubmitted;
  const displayPatientName = isEditable ? (patientName ?? "") : (patientName && patientName.trim() !== "" ? patientName : DEFAULT_PATIENT_NAME);
  const displayGender = gender && gender.trim() !== "" ? gender : (isEditable ? "" : DEFAULT_GENDER);
  const displayAge = age !== undefined && age !== null && String(age).trim() !== "" ? String(age) : "";

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

  const useSessionCreatedBy =
    createdByNameProp === undefined && createdByImageUrlProp === undefined;
  const { createdByName: sessionCreatedByName, createdByImageUrl: sessionCreatedByImageUrl } =
    useCreatedByUser(useSessionCreatedBy);

  const createdByName = createdByNameProp ?? sessionCreatedByName;
  const createdByImage =
    createdByImageUrlProp !== undefined ? createdByImageUrlProp : sessionCreatedByImageUrl;

  // Office logo = the user's own customer (practice/lab) logo, fetched from the API.
  // Lab logo = the wizard-selected counterpart (`labLogoUrl`). Roles flip with context
  // so the office always renders on the left and the lab on the right (virtual-slip layout).
  const [profileLogoUrl, setProfileLogoUrl] = useState<string | null>(null);
  const [isLabCtx, setIsLabCtx] = useState(false);

  useEffect(() => {
    setIsLabCtx(isLabCustomerContext());
  }, []);

  useEffect(() => {
    const fetchProfileLogo = async () => {
      try {
        const token = localStorage.getItem("token");
        const customerId = localStorage.getItem("customerId");
        if (!token || !customerId) return;

        const cached =
          localStorage.getItem(`customerLogo_${customerId}`) || localStorage.getItem("customerLogo");
        if (cached) setProfileLogoUrl(cached);

        const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) return;
        const data = await response.json();
        const logo = data?.logo_url || data?.data?.logo_url || null;
        if (logo) {
          setProfileLogoUrl(logo);
          localStorage.setItem(`customerLogo_${customerId}`, logo);
          localStorage.setItem("customerLogo", logo);
        }
      } catch {
        // silently fall back to cached value
      }
    };
    fetchProfileLogo();
  }, []);

  const selectedLogo = labLogoUrl && labLogoUrl.trim() !== "" ? labLogoUrl : null;
  // In lab-customer context, "self" is the lab → the wizard selection is the office.
  const officeLogo = isLabCtx ? selectedLogo : profileLogoUrl;
  const officeName = isLabCtx ? labName : null;
  const officeEditable = isLabCtx;
  const labLogo = isLabCtx ? profileLogoUrl : selectedLogo;
  const labNameDisplay = isLabCtx ? null : labName;
  const labEditable = !isLabCtx;

  const createdInitials = (createdByName || "")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className={`${caseDesignInter.className} bg-white border-b border-[#d9d9d9] px-3 sm:px-5`}>
      <div className="flex items-stretch gap-3 py-2 sm:gap-4 lg:gap-6">
        {/* Doctor — avatar + name (spans the logo + fields rows) */}
        <div className={`flex ${AVATAR_COLUMN_WIDTH} shrink-0 flex-col items-center justify-center gap-1 self-stretch`}>
          <div className="relative">
            <div className={`${AVATAR_SIZE} rounded-full overflow-hidden bg-gray-200 flex items-center justify-center`}>
              <span className="absolute inset-0 flex items-center justify-center font-bold text-gray-500 text-lg">{doctorInitials || "?"}</span>
              {hasDoctorImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={doctorImageUrl!}
                  onError={(e) => {
                    e.currentTarget.remove();
                  }}
                  alt="Doctor"
                  className="relative w-full h-full object-cover"
                />
              )}
            </div>
            {!caseSubmitted && canEditDoctor && onEditDoctorClick && (
              <button
                type="button"
                onClick={onEditDoctorClick}
                className="absolute bottom-0 right-0 z-10 p-1 rounded-full bg-white shadow border border-[#d9d9d9] hover:bg-[#e5e7eb] transition-colors text-[#7f7f7f] hover:text-[#1d1d1b]"
                aria-label="Change doctor"
              >
                <Pencil size={12} />
              </button>
            )}
          </div>
          <div className="flex flex-col items-center gap-[2px] text-center">
            <span className="text-xs leading-none text-[#7F7F7F]">Doctor:</span>
            <span className={`${AVATAR_NAME_MAX} truncate text-sm font-semibold leading-tight text-[#4C4D55]`} title={displayName}>
              {displayName}
            </span>
          </div>
        </div>

        {/* Center: office/lab logos row over the patient fields row */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-[#d9d9d9] px-1 py-[6px]">
            <LogoCell
              logo={officeLogo ?? null}
              name={officeName}
              prominent
              editable={officeEditable && !caseSubmitted}
              onEdit={onEditLab}
            />
            <LogoCell
              logo={labLogo ?? null}
              name={labNameDisplay}
              editable={labEditable && !caseSubmitted}
              onEdit={onEditLab}
              alignEnd
            />
          </div>

          <div className="flex min-w-0 flex-1 items-center py-[6px]">
            {!caseSubmitted ? (
              <div className="flex w-full min-w-0 items-center gap-3">
                <FieldInput
                  label="Patient name"
                  value={displayPatientName}
                  submitted={false}
                  onChange={onPatientNameChange}
                  className="min-w-0 flex-1 max-w-[360px]"
                  smartPatientLabel
                />
                {onGenderChange ? (
                  <SelectField
                    label="Gender"
                    value={displayGender}
                    options={["Male", "Female"]}
                    onChange={onGenderChange}
                    caseSubmitted={false}
                    className="w-[140px] shrink-0"
                  />
                ) : (
                  <FieldInput
                    label="Gender"
                    value={displayGender}
                    submitted={false}
                    className="w-[140px] shrink-0"
                  />
                )}
                <FieldInput
                  label="Age"
                  value={displayAge}
                  submitted={false}
                  onChange={onAgeChange}
                  className="w-[90px] shrink-0"
                  type="number"
                />
              </div>
            ) : (
              <div className="flex w-full flex-col gap-3">
                <div className="flex flex-wrap gap-3 sm:gap-4 items-start">
                  <FieldInput
                    label="Patient name"
                    value={displayPatientName}
                    submitted
                    className="flex-1 min-w-[140px]"
                  />
                  {slipHeaderLoading ? (
                    <>
                      <SkeletonField label="Slip number" width="flex-1 min-w-[110px]" />
                      <SkeletonField label="Case number" width="flex-1 min-w-[110px]" />
                      <SkeletonField label="Pan number" width="flex-1 min-w-[90px]" />
                      <SkeletonField label="Status" width="flex-1 min-w-[100px]" />
                    </>
                  ) : (
                    <>
                      <FieldInput label="Slip number" value={slipNumber} submitted className="flex-1 min-w-[110px]" />
                      <FieldInput label="Case number" value={caseNumber} submitted className="flex-1 min-w-[110px]" />
                      <FieldInput label="Pan number" value={panNumber} submitted className="flex-1 min-w-[90px]" />
                      <FieldInput label="Status" value={status} submitted className="flex-1 min-w-[100px]" />
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 sm:gap-4 items-start">
                  <FieldInput label="Gender" value={displayGender} submitted className="flex-1 min-w-[90px]" />
                  <FieldInput label="Age" value={displayAge} submitted className="flex-1 min-w-[70px]" />
                  {slipHeaderLoading ? (
                    <>
                      <SkeletonField label="Pick up Date" width="flex-1 min-w-[110px]" />
                      <SkeletonField label="Due Date" width="flex-1 min-w-[110px]" />
                      <SkeletonField label="Delivery Time" width="flex-1 min-w-[100px]" />
                      <SkeletonField label="Location" width="flex-1 min-w-[120px]" />
                    </>
                  ) : (
                    <>
                      <FieldInput label="Pick up Date" value={pickupDate} submitted className="flex-1 min-w-[110px]" />
                      <FieldInput label="Due Date" value={dueDate} submitted className="flex-1 min-w-[110px]" />
                      <FieldInput label="Delivery Time" value={deliveryTime} submitted className="flex-1 min-w-[100px]" />
                      <FieldInput label="Location" value={location} submitted className="flex-1 min-w-[120px]" />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Created By — avatar + name (spans both center rows) */}
        {(createdByName || createdByImage) && (
          <div className={`flex ${AVATAR_COLUMN_WIDTH} shrink-0 flex-col items-center justify-center gap-1 self-stretch`}>
            <div className={`relative ${AVATAR_SIZE} rounded-full overflow-hidden bg-gray-200 flex items-center justify-center`}>
              <span className="absolute inset-0 flex items-center justify-center font-bold text-gray-500 text-lg">{createdInitials || "?"}</span>
              {createdByImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={createdByImage}
                  onError={(e) => {
                    e.currentTarget.remove();
                  }}
                  alt="Creator"
                  className="relative w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex flex-col items-center gap-[2px] text-center">
              <span className="text-xs leading-none text-[#7F7F7F]">Created By:</span>
              <span className={`${AVATAR_NAME_MAX} truncate text-sm font-semibold leading-tight text-[#4C4D55]`} title={createdByName || undefined}>
                {createdByName || "—"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
