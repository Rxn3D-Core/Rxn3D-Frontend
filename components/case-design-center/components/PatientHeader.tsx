import { useState, useRef, useEffect, useLayoutEffect, useCallback, type FocusEvent, type MouseEvent } from "react";
import { Pencil } from "lucide-react";
import { FieldInput, SelectField } from "./fields";
import type { SlipCreationResponse } from "@/services/slip-creation-service";
import { caseDesignInter } from "../case-design-inter-font";
import { useCreatedByUser } from "@/hooks/use-created-by-user";

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
  /** When true, show Patient name + Gender + Age in one row and compact Created By (during product field selection). */
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

const DEFAULT_DOCTOR_IMAGE = "/images/doctor-image.png";
const DEFAULT_DOCTOR_NAME = "Cody Mugglestone, DDS";
const DEFAULT_PATIENT_NAME = "Jose Protacio Rizal Mercado y Alonzo";
const DEFAULT_GENDER = "Male";

/** Slow, smooth hover expand — height + opacity only (avoid animating layout props). */
const HEADER_ANIM_MS = 1000;
const HEADER_EASE = "ease-in-out";
const HEADER_HEIGHT_TRANSITION = `transition-[height] duration-[${HEADER_ANIM_MS}ms] ${HEADER_EASE}`;
const HEADER_FADE_TRANSITION = `transition-opacity duration-[${HEADER_ANIM_MS}ms] ${HEADER_EASE}`;
const HEADER_SHELL_PADDING_Y_PX = 12; // pt-2 (8) + pb-1 (4)

const PATIENT_NAME_FIELD_WIDTH = "w-[330px] max-w-[330px] shrink-0";
/** Compact product-mode header: keep avatars small on collapse and hover expand. */
const COMPACT_DOCTOR_AVATAR = "w-[48px] h-[48px] sm:w-[50px] sm:h-[50px]";
const COMPACT_CREATED_BY_AVATAR = "w-[45px] h-[45px] sm:w-[48px] sm:h-[48px]";

export function PatientHeader({ doctorImageUrl, doctorName, patientName, gender, age, caseSubmitted = false, slipHeaderLoading = false, slipResponseData, onEditDoctorClick, canEditDoctor = false, onPatientNameChange, onGenderChange, onAgeChange, compactLayout = false, createdByName: createdByNameProp, createdByImageUrl: createdByImageUrlProp }: PatientHeaderProps = {}) {
  const imgSrc = doctorImageUrl && doctorImageUrl.trim() !== "" ? doctorImageUrl : DEFAULT_DOCTOR_IMAGE;
  const displayName = doctorName && doctorName.trim() !== "" ? doctorName : DEFAULT_DOCTOR_NAME;
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
  const canUseCompactLayout = compactLayout && !caseSubmitted;
  const [headerExpanded, setHeaderExpanded] = useState(false);

  const compactLayerRef = useRef<HTMLDivElement>(null);
  const expandedLayerRef = useRef<HTMLDivElement>(null);
  const [shellContentHeight, setShellContentHeight] = useState(56);

  const measureShellContentHeight = useCallback(() => {
    if (!canUseCompactLayout) return;
    const layer = headerExpanded ? expandedLayerRef.current : compactLayerRef.current;
    if (layer) setShellContentHeight(layer.offsetHeight);
  }, [canUseCompactLayout, headerExpanded]);

  useLayoutEffect(() => {
    measureShellContentHeight();
  }, [
    measureShellContentHeight,
    displayPatientName,
    displayGender,
    displayAge,
    displayName,
    createdByName,
    canEditDoctor,
  ]);

  useEffect(() => {
    if (!canUseCompactLayout) return;
    const layers = [compactLayerRef.current, expandedLayerRef.current].filter(
      (node): node is HTMLDivElement => node != null,
    );
    if (layers.length === 0) return;
    const observer = new ResizeObserver(measureShellContentHeight);
    layers.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [canUseCompactLayout, measureShellContentHeight]);

  const renderHeaderBody = (forceCompact: boolean) => {
    const compact = forceCompact;

    const avatarSizeClass = caseSubmitted
      ? "w-[90px] h-[90px] sm:w-[130px] sm:h-[130px]"
      : canUseCompactLayout
        ? COMPACT_DOCTOR_AVATAR
        : "w-[70px] h-[70px] sm:w-[100px] sm:h-[100px]";

    const createdByAvatarSizeClass = caseSubmitted
      ? avatarSizeClass
      : canUseCompactLayout
        ? COMPACT_CREATED_BY_AVATAR
        : "w-[70px] h-[70px] sm:w-[100px] sm:h-[100px]";

    const createdByNameClass = `font-medium text-[#1d1d1b] ${
      compact
        ? "text-sm leading-tight truncate max-w-[88px] sm:max-w-[120px] text-left"
        : caseSubmitted
          ? "text-lg text-center whitespace-nowrap"
          : "text-[18px] text-center whitespace-nowrap"
    }`;

    const editablePatientFields = (
      <div
        className={`grid min-w-0 shrink-0 ${
          compact
            ? "[grid-template-areas:'patient_gender_age'] grid-cols-[330px_minmax(88px,120px)_72px] grid-rows-1 gap-x-2 sm:gap-x-3 items-center w-auto"
            : "[grid-template-areas:'patient_patient'_'gender_age'] grid-cols-2 grid-rows-[auto_auto] gap-y-3 w-[330px]"
        }`}
      >
        <FieldInput
          label="Patient name"
          value={displayPatientName}
          submitted={false}
          onChange={onPatientNameChange}
          className={`[grid-area:patient] ${PATIENT_NAME_FIELD_WIDTH} ${!compact ? "col-span-2" : ""}`}
          smartPatientLabel
        />
        {onGenderChange ? (
          <SelectField
            label="Gender"
            value={displayGender}
            options={["Male", "Female"]}
            onChange={onGenderChange}
            caseSubmitted={false}
            className={`[grid-area:gender] ${compact ? "w-full min-w-0" : "min-w-0"}`}
          />
        ) : (
          <FieldInput
            label="Gender"
            value={displayGender}
            submitted={false}
            className={`[grid-area:gender] ${compact ? "w-full min-w-0" : "min-w-0"}`}
          />
        )}
        <FieldInput
          label="Age"
          value={displayAge}
          submitted={false}
          onChange={onAgeChange}
          className={`[grid-area:age] ${compact ? "w-full min-w-0" : "min-w-0"}`}
          type="number"
        />
      </div>
    );

    const createdBySection = (
      <div
        className={`flex flex-shrink-0 ml-auto ${
          compact
            ? "flex-row items-center gap-2"
            : "flex-col items-center gap-1 w-[160px] min-w-[160px] sm:w-[170px] sm:min-w-[170px]"
        }`}
      >
        <div
          className={`rounded-full overflow-hidden flex-shrink-0 bg-gray-200 flex items-center justify-center ${createdByAvatarSizeClass}`}
        >
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
            <span
              className={`font-medium text-gray-500 ${compact ? "text-xs" : "text-xl font-bold"}`}
            >
              {createdByName.split(" ").map((n) => n[0]).join("").toUpperCase()}
            </span>
          )}
        </div>
        <p className={createdByNameClass}>{createdByName || "—"}</p>
      </div>
    );

    return (
      <div
        className={`flex min-w-0 w-full ${
          compact
            ? "flex-row items-center gap-2 sm:gap-3"
            : "flex-col lg:flex-row lg:items-start items-center gap-4 lg:gap-6"
        }`}
      >
        <div
          className={`flex flex-shrink-0 ${
            compact ? "flex-row items-center gap-2" : "flex-col items-center gap-1"
          }`}
        >
          <div className={`${avatarSizeClass} rounded-full overflow-hidden bg-gray-200 flex items-center justify-center relative`}>
            <img
              src={imgSrc}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_DOCTOR_IMAGE;
              }}
              alt="Doctor"
              className="w-full h-full object-cover"
            />
            {!caseSubmitted && canEditDoctor && onEditDoctorClick && (
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
          <p
            className={`font-medium text-[#1d1d1b] ${
              compact
                ? "text-sm leading-tight truncate max-w-[88px] sm:max-w-[120px] text-left"
                : caseSubmitted
                  ? "text-lg text-center whitespace-nowrap"
                  : "text-[18px] text-center whitespace-nowrap"
            }`}
          >
            {displayName}
          </p>
        </div>

        <div
          className={`min-w-0 flex justify-center lg:justify-start ${
            compact ? "shrink-0" : "flex-col gap-3 flex-1 w-full lg:w-auto"
          }`}
        >
          {!caseSubmitted ? (
            editablePatientFields
          ) : (
            <>
              <div className="flex flex-wrap gap-3 sm:gap-4 items-start justify-center lg:justify-start">
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
              <div className="flex flex-wrap gap-3 sm:gap-4 items-start justify-center lg:justify-start">
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
            </>
          )}
        </div>

        {createdBySection}
      </div>
    );
  };

  const compactHoverHandlers = canUseCompactLayout
    ? {
        onMouseEnter: () => setHeaderExpanded(true),
        onMouseLeave: (e: MouseEvent<HTMLDivElement>) => {
          if (e.currentTarget.contains(document.activeElement)) return;
          setHeaderExpanded(false);
        },
        onFocusCapture: () => setHeaderExpanded(true),
        onBlurCapture: (e: FocusEvent<HTMLDivElement>) => {
          const next = e.relatedTarget;
          if (next instanceof Node && e.currentTarget.contains(next)) return;
          if (e.currentTarget.contains(document.activeElement)) return;
          setHeaderExpanded(false);
        },
      }
    : {};

  return (
    <div
      className={`${caseDesignInter.className} bg-white border-b border-[#d9d9d9] px-4 sm:px-6 overflow-hidden ${
        canUseCompactLayout ? "" : "pt-2 pb-2"
      }`}
      {...compactHoverHandlers}
    >
      {canUseCompactLayout ? (
        <div
          className={`relative pt-2 pb-1 overflow-hidden ${HEADER_HEIGHT_TRANSITION}`}
          style={{ height: shellContentHeight + HEADER_SHELL_PADDING_Y_PX }}
        >
          <div
            ref={compactLayerRef}
            aria-hidden={headerExpanded}
            className={`absolute inset-x-0 top-2 transform-gpu ${HEADER_FADE_TRANSITION} ${
              headerExpanded ? "opacity-0 pointer-events-none z-0" : "opacity-100 pointer-events-auto z-10"
            }`}
          >
            {renderHeaderBody(true)}
          </div>
          <div
            ref={expandedLayerRef}
            aria-hidden={!headerExpanded}
            className={`absolute inset-x-0 top-2 transform-gpu ${HEADER_FADE_TRANSITION} ${
              headerExpanded ? "opacity-100 pointer-events-auto z-10" : "opacity-0 pointer-events-none z-0"
            }`}
          >
            {renderHeaderBody(false)}
          </div>
        </div>
      ) : (
        renderHeaderBody(false)
      )}
    </div>
  );
}
