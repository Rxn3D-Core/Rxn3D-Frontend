"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Filter, Plus, Search, ChevronDown, Check } from "lucide-react";
import { SlipCreationStepFooter } from "@/components/slip-creation-step-footer";
import { useConnectedOfficesOrLabs } from "@/hooks/use-connected-offices";
import { useOfficeDoctors } from "@/hooks/use-slip-data";
import { useLibraryCategories } from "@/hooks/use-library-categories";
import { useLibraryProducts } from "@/hooks/use-library-products";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import CancelSlipCreationModal from "@/components/cancel-slip-creation-modal";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Role / auth helpers (client-only)                                  */
/* ------------------------------------------------------------------ */
function useWizardRole() {
  const [role, setRole] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setRole(localStorage.getItem("role"));
    const c = localStorage.getItem("customerId");
    setCustomerId(c ? Number(c) : null);
  }, []);
  const isOfficeAdmin = role === "office_admin";
  const isLabAdmin = role === "lab_admin";
  return { role, customerId, isOfficeAdmin, isLabAdmin };
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

/** Multiple fallback images so each doctor gets a different placeholder when they have no avatar */
const DOCTOR_AVATAR_FALLBACKS = [
  "/doctors/doctor-1.jpg",
  "/doctors/doctor-2.jpg",
  "/doctors/doctor-3.jpg",
  "/doctors/doctor-4.jpg",
];

function getDoctorFallbackImg(doctorId: number, index?: number): string {
  const i = index ?? doctorId;
  return DOCTOR_AVATAR_FALLBACKS[Math.abs(i) % DOCTOR_AVATAR_FALLBACKS.length] ?? DOCTOR_AVATAR_FALLBACKS[0];
}

/* ------------------------------------------------------------------ */
/*  Fallback image component – shows name text when image is missing   */
/* ------------------------------------------------------------------ */
function ProductImageWithFallback({
  src,
  alt,
  name,
  className = "rounded-[4px]",
  bgClassName = "bg-[#eef1f4]",
  textClassName = "text-[#7f7f7f]",
}: {
  src: string | null | undefined;
  alt: string;
  name: string;
  className?: string;
  bgClassName?: string;
  textClassName?: string;
}) {
  const [failed, setFailed] = React.useState(!src);
  // Reset failed state when src changes
  React.useEffect(() => { setFailed(!src); }, [src]);

  if (failed) {
    return (
      <div className={`w-full aspect-square ${className} overflow-hidden flex-shrink-0 ${bgClassName} flex items-center justify-center p-3`}>
        <span
          className={`text-[13px] font-semibold ${textClassName} text-center leading-tight`}
          style={{ fontFamily: "Verdana, sans-serif" }}
        >
          {name}
        </span>
      </div>
    );
  }

  return (
    <div className={`w-full aspect-square ${className} overflow-hidden flex-shrink-0 ${bgClassName}`}>
      <img
        src={src!}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface WizardDoctorShape {
  id: number;
  name: string;
  img: string;
}

export interface WizardLabShape {
  id: number;
  name: string;
  location: string;
  logo: string | null;
}

interface WizardResult {
  doctor: WizardDoctorShape;
  lab: WizardLabShape;
  patientName: string;
  gender: string;
  category: string;
  product: string;
  material: string;
  arch?: "maxillary" | "mandibular" | "both";
}

/* ------------------------------------------------------------------ */
/*  Step – Choose a Doctor (from API by office_id / customer_id)       */
/* ------------------------------------------------------------------ */
function StepDoctor({
  doctors,
  selected,
  onSelect,
  isLoading,
  error,
}: {
  doctors: WizardDoctorShape[];
  selected: number | null;
  onSelect: (id: number) => void;
  isLoading?: boolean;
  error?: Error | null;
}) {
  if (error) {
    return (
      <div className="flex-1 flex flex-col px-6 py-6 items-center justify-center">
        <p className="text-[#7f7f7f] text-center mb-4">
          Unable to load doctors. Please try again.
        </p>
        <p className="text-sm text-[#b4b0b0]">{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col px-6 py-6">
        <h2 className="text-[16px] font-bold text-[#1d1d1b] text-center mb-6">
          Choose a Doctor
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6 justify-items-center max-w-[1600px] mx-auto w-full">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="w-full max-w-[219.68px] aspect-square rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-6">
      <h2 className="text-[16px] font-bold text-[#1d1d1b] text-center mb-6">
        Choose a Doctor
      </h2>

      <div className="flex items-center justify-between mb-2">
        <button className="p-2 hover:bg-[#eef1f4] rounded transition-colors">
          <Filter size={18} className="text-[#7f7f7f]" />
        </button>
        <button className="flex items-center gap-1 bg-[#1162a8] hover:bg-[#0d4a85] text-white text-[12px] font-semibold px-4 py-2 rounded transition-colors">
          <Plus size={14} />
          Add Doctor
        </button>
      </div>

      <p className="text-[12px] text-[#9ba5b7] text-right mb-4">
        {doctors.length} doctors found
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6 justify-items-center max-w-[1600px] mx-auto w-full">
        {doctors.map((doc, i) => (
          <button
            key={doc.id}
            onClick={() => onSelect(doc.id)}
            className="group flex flex-col items-center gap-3 p-2 sm:p-4 transition-all w-full max-w-[250px]"
          >
            <div
              className={`w-full aspect-square max-w-[219.68px] rounded-full overflow-hidden flex-shrink-0 transition-all bg-[#eef1f4] ${
                selected === doc.id
                  ? "border-[4px] border-[#1162A8]"
                  : "border-[4px] border-[#d9d9d9] group-hover:border-[#1162a8]/100"
              }`}
            >
              <img
                src={doc.img}
                alt={doc.name}
                className="w-full h-full object-cover"
                data-fallback={getDoctorFallbackImg(doc.id, i)}
                onError={(e) => {
                  const fallback = e.currentTarget.dataset.fallback || DOCTOR_AVATAR_FALLBACKS[0];
                  e.currentTarget.src = fallback;
                }}
              />
            </div>
            <span className="text-[14px] font-weight-700 font-bold text-[#1d1d1b] text-center">
              {doc.name}
            </span>
            <span
              className={`text-[11px] text-[#7f7f7f] transition-opacity ${
                selected === doc.id
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
            >
              Click and select
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2 – Choose a Lab or Office (connected offices from API)       */
/* ------------------------------------------------------------------ */
function StepLab({
  labs,
  selected,
  onSelect,
  isLoading,
  error,
  stepTitle,
  entityLabel = "lab",
}: {
  labs: WizardLabShape[];
  selected: number | null;
  onSelect: (id: number) => void;
  isLoading?: boolean;
  error?: Error | null;
  stepTitle: string;
  entityLabel?: "lab" | "office";
}) {
  const entityPlural = entityLabel === "office" ? "offices" : "labs";
  const loadErrorMsg = entityLabel === "office"
    ? "Unable to load connected offices. Please try again."
    : "Unable to load connected labs. Please try again.";

  if (error) {
    return (
      <div className="flex-1 flex flex-col px-6 py-6 items-center justify-center">
        <p className="text-[#7f7f7f] text-center mb-4">
          {loadErrorMsg}
        </p>
        <p className="text-sm text-[#b4b0b0]">{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col px-6 py-6">
        <h2 className="text-[16px] font-bold text-[#1d1d1b] text-center mb-6">
          {stepTitle}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1400px] mx-auto mb-6 px-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              style={{ height: 215, borderRadius: 6, width: "100%", maxWidth: 307.65 }}
              className="w-full"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-6">
      <h2 className="text-[16px] font-bold text-[#1d1d1b] text-center mb-6">
        {stepTitle}
      </h2>

      {/* Top bar with filter and Add New button */}
      <div className="flex items-center justify-between mb-2">
        <button className="p-2 hover:bg-[#eef1f4] rounded transition-colors">
          <Filter size={18} className="text-[#7f7f7f]" />
        </button>
        <button
          style={{ fontFamily: "Verdana, sans-serif", fontSize: 12, lineHeight: "22px", letterSpacing: "-0.02em", borderRadius: 6, padding: "8px 16px" }}
          className="flex items-center gap-2 bg-[#1162a8] hover:bg-[#0d4a85] text-white font-bold transition-colors whitespace-nowrap"
        >
          Add New {entityLabel}
        </button>
      </div>

      {/* Count */}
      <p
        style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, lineHeight: "22px", letterSpacing: "-0.02em" }}
        className="text-[#b4b0b0] text-right mb-6"
      >
        {labs.length} {entityPlural} found
      </p>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1400px] mx-auto mb-6 px-4">
        {labs.map((lab, i) => (
          <button
            key={`${lab.id}-${i}`}
            onClick={() => onSelect(lab.id)}
            style={{ height: 215, borderRadius: 6, width: 307.65 }}
            className="group relative flex flex-col items-center justify-center transition-all bg-white border-2 border-[#b4b0b0] hover:border-[#1162a8] w-full"
          >
            {/* "Click and select" text - shown on hover */}
            <span className="absolute top-3 text-[11px] text-[#7f7f7f] opacity-0 group-hover:opacity-100 transition-opacity">
              Click and select
            </span>

            {/* Logo area - uses logo_url from API */}
            <div
              style={{ width: 185, height: 117 }}
              className="flex items-center justify-center mb-2 overflow-hidden"
            >
              {lab.logo ? (
                <img
                  src={lab.logo}
                  alt={`${lab.name} logo`}
                  style={{ width: 126, height: 73, objectFit: "contain" }}
                  className="rounded"
                />
              ) : (
                <span
                  style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, lineHeight: "15px", letterSpacing: "-0.02em" }}
                  className="font-bold text-[#1162a8] text-center"
                >
                  {lab.name}
                </span>
              )}
            </div>
            {/* Lab name */}
            <span
              style={{ fontFamily: "Verdana, sans-serif", fontSize: 16, lineHeight: "22px", letterSpacing: "-0.02em" }}
              className="text-[#000000] text-center mb-1"
            >
              {lab.name}
            </span>
            {/* Location */}
            <span
              style={{ fontFamily: "Verdana, sans-serif", fontSize: 12, lineHeight: "22px", letterSpacing: "-0.02em" }}
              className="text-[#b4b0b0] text-center"
            >
              {lab.location}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3 – Patient Info (logic from slip-creation-header)            */
/* ------------------------------------------------------------------ */
function StepPatientInfo({
  doctor,
  patientName,
  setPatientName,
  gender,
  setGender,
  onComplete,
}: {
  doctor: WizardDoctorShape | undefined;
  patientName: string;
  setPatientName: (v: string) => void;
  gender: string;
  setGender: (v: string) => void;
  onComplete?: () => void;
}) {
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isGenderFocused, setIsGenderFocused] = useState(false);
  const patientNameInputRef = useRef<HTMLInputElement>(null);
  const genderTriggerRef = useRef<HTMLDivElement>(null);
  const refocusTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (patientNameInputRef.current && !(patientName ?? "").trim()) {
      const focusTimer = setTimeout(() => patientNameInputRef.current?.focus(), 100);
      return () => clearTimeout(focusTimer);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (refocusTimerRef.current) clearTimeout(refocusTimerRef.current);
    };
  }, []);

  const getGenderDisplay = (g?: string) => {
    if (g === "Male" || g === "male") return "Male";
    if (g === "Female" || g === "female") return "Female";
    return "Select Gender";
  };

  const name = patientName ?? "";
  const showGenderField = (() => {
    const nameParts = name.trim().split(/\s+/).filter((part) => part.length > 0);
    if (nameParts.length < 2) return false;
    const lastPart = nameParts[nameParts.length - 1];
    return nameParts[0].length >= 2 && lastPart.length >= 2;
  })();

  const shouldAutoOpenGender = (inputName: string, inputGender: string): boolean => {
    if (inputGender.trim() !== "") return false;
    const nameParts = inputName.trim().split(/\s+/).filter((part) => part.length > 0);
    if (nameParts.length >= 2) {
      const lastWord = nameParts[nameParts.length - 1];
      return lastWord.length === 2;
    }
    return false;
  };

  const handleNameChange = (value: string) => {
    setPatientName(value);
    if (refocusTimerRef.current) {
      clearTimeout(refocusTimerRef.current);
    }
    const shouldOpen = shouldAutoOpenGender(value, gender);
    if (shouldOpen && !isGenderFocused) {
      setIsGenderFocused(true);
      refocusTimerRef.current = setTimeout(() => patientNameInputRef.current?.focus(), 50);
    }
  };

  const handleGenderSelect = (value: string) => {
    setGender(value);
    setIsGenderFocused(false);
    setTimeout(() => patientNameInputRef.current?.focus(), 50);
    if (name.trim() && onComplete) setTimeout(() => onComplete(), 300);
  };

  const hasNameValue = name.trim() !== "";
  const hasGenderValue = gender.trim() !== "";
  const isValidName = () => {
    if (!hasNameValue) return false;
    const nameParts = name.trim().split(/\s+/).filter((part) => part.length > 0);
    if (nameParts.length < 2) return false;
    const lastPart = nameParts[nameParts.length - 1];
    return nameParts[0].length >= 2 && lastPart.length >= 2;
  };
  const isNameValid = isValidName();
  const isGenderValid = hasGenderValue;

  const getNameBorderColor = () => {
    if (isNameValid) return "border-[#119933]";
    if (hasNameValue) return "border-[#FF9900]";
    return "border-red-500";
  };
  const getGenderBorderColor = () => {
    if (showGenderField && !isGenderValid) return "border-red-500";
    if (isGenderValid) return "border-[#119933]";
    if (isGenderFocused) return "border-[#1162A8]";
    return "border-[#7F7F7F]";
  };
  const getNameLabelColor = () => {
    if (isNameValid) return "text-[#119933]";
    if (hasNameValue) return "text-[#FF9900]";
    return "text-red-500";
  };
  const getGenderLabelColor = () => {
    if (showGenderField && !isGenderValid) return "text-red-500";
    if (isGenderValid) return "text-[#119933]";
    if (isGenderFocused) return "text-[#1162A8]";
    return "text-[#7F7F7F]";
  };
  const getNameRingEffect = () => {
    if (isNameValid) return "ring-2 ring-[#119933] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,153,51,0.15)]";
    if (hasNameValue) return "ring-2 ring-[#FF9900] ring-opacity-20 shadow-[0_0_0_4px_rgba(255,153,0,0.15)]";
    return "ring-2 ring-red-500 ring-opacity-20 shadow-[0_0_0_4px_rgba(239,68,68,0.15)]";
  };
  const getGenderRingEffect = () => {
    if (showGenderField && !isGenderValid) return "ring-2 ring-red-500 ring-opacity-20 shadow-[0_0_0_4px_rgba(239,68,68,0.15)]";
    if (isGenderFocused && isGenderValid) return "ring-2 ring-[#119933] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,153,51,0.15)]";
    if (isGenderFocused) return "ring-2 ring-[#1162A8] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,98,168,0.15)]";
    return "";
  };

  const fieldWidth = 330;
  const fieldHeight = 36.95;
  const fieldGap = 10;
  const containerHeight = showGenderField ? 10 + fieldHeight + fieldGap + fieldHeight + 10 : 10 + fieldHeight + 10;

  return (
    <div className="flex-1 flex flex-col px-6 py-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-5">
          {doctor && (
            <div className="flex flex-col items-center gap-1">
              <div className="w-[80px] h-[80px] rounded-full overflow-hidden border-2 border-[#d9d9d9] bg-[#eef1f4]">
                <img
                  src={doctor.img}
                  alt={doctor.name}
                  className="w-full h-full object-cover"
                  data-fallback={getDoctorFallbackImg(doctor.id)}
                  onError={(e) => {
                    const fallback = e.currentTarget.dataset.fallback || DOCTOR_AVATAR_FALLBACKS[0];
                    e.currentTarget.src = fallback;
                  }}
                />
              </div>
              <span className="text-[11px] font-semibold text-[#1d1d1b]">{doctor.name}</span>
            </div>
          )}

          <div className="relative" style={{ width: `${fieldWidth}px`, height: `${containerHeight}px` }}>
            {/* Patient Name - Rxn3DFloatingInput-style */}
            <div className="absolute" style={{ left: 0, top: 10, width: `${fieldWidth}px`, height: `${fieldHeight}px` }}>
              <div className="relative w-full h-full">
                <input
                  ref={patientNameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onFocus={() => setIsNameFocused(true)}
                  onBlur={() => setIsNameFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Tab" && !e.shiftKey && showGenderField) {
                      e.preventDefault();
                      setIsGenderFocused(true);
                      setTimeout(() => genderTriggerRef.current?.focus(), 0);
                    }
                  }}
                  className={cn(
                    "w-full h-full box-border flex items-center bg-white border border-solid rounded-[7.7px] text-[#1F2937] focus:outline-none transition-all ease-out",
                    getNameBorderColor(),
                    getNameRingEffect(),
                    !isNameFocused && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)]"
                  )}
                  style={{
                    padding: "25px 30.8px 9.24px 12.32px",
                    borderWidth: "0.740384px",
                    fontFamily: "Arial",
                    fontSize: "17px",
                    lineHeight: "18px",
                  }}
                />
                <label
                  className={cn("absolute bg-white pointer-events-none transition-all text-[#7F7F7F]", getNameLabelColor())}
                  style={{ left: "9.23px", top: "-6.15px", fontFamily: "Arial", fontWeight: 400, fontSize: "14px", lineHeight: "14px" }}
                >
                  Patient name
                </label>
                {isNameValid && (
                  <div className="absolute right-[12.32px] top-1/2 -translate-y-1/2">
                    <Check className="h-5 w-5 text-[#119933]" aria-label="Valid" />
                  </div>
                )}
              </div>
            </div>

            {/* Gender - only when name has valid first + last (each ≥2 chars) */}
            {showGenderField && (
              <div
                className="absolute"
                style={{ left: 0, top: 10 + fieldHeight + fieldGap, width: `${fieldWidth}px`, height: `${fieldHeight}px` }}
              >
                <div className="relative w-full h-full">
                  <div
                    ref={genderTriggerRef}
                    role="combobox"
                    aria-expanded={isGenderFocused}
                    aria-haspopup="listbox"
                    aria-label="Gender"
                    tabIndex={0}
                    className={cn(
                      "w-full h-full box-border flex items-center justify-between bg-white border border-solid rounded-[7.7px] text-[#1F2937] cursor-pointer transition-all",
                      getGenderBorderColor(),
                      getGenderRingEffect(),
                      !isGenderFocused && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)]"
                    )}
                    style={{
                      padding: "25px 30.8px 9.24px 12.32px",
                      borderWidth: "0.740384px",
                      fontFamily: "Arial",
                      fontSize: "17px",
                      lineHeight: "18px",
                    }}
                    onFocus={() => setIsGenderFocused(true)}
                    onClick={() => {
                      if (!isGenderFocused) {
                        setIsGenderFocused(true);
                        setTimeout(() => patientNameInputRef.current?.focus(), 50);
                      }
                    }}
                  >
                    <span>{getGenderDisplay(gender)}</span>
                    <ChevronDown className={cn("h-4 w-4 text-[#7F7F7F] transition-transform", isGenderFocused && "rotate-180")} />
                  </div>
                  {isGenderFocused && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-[7.7px] shadow-lg z-50 overflow-hidden">
                      <div
                        className="px-2.5 py-1.5 hover:bg-[#DFEEFB] cursor-pointer text-[#1F2937]"
                        style={{ fontFamily: "Arial", fontSize: "14px", lineHeight: "16px" }}
                        onClick={() => handleGenderSelect("Male")}
                      >
                        Male
                      </div>
                      <div
                        className="px-2.5 py-1.5 hover:bg-[#DFEEFB] cursor-pointer text-[#1F2937]"
                        style={{ fontFamily: "Arial", fontSize: "14px", lineHeight: "16px" }}
                        onClick={() => handleGenderSelect("Female")}
                      >
                        Female
                      </div>
                    </div>
                  )}
                  <label
                    className={cn("absolute bg-white pointer-events-none z-10 transition-all text-[#7F7F7F]", getGenderLabelColor())}
                    style={{ left: "9.23px", top: "-6.15px", fontFamily: "Arial", fontWeight: 400, fontSize: "14px", lineHeight: "14px" }}
                  >
                    Gender
                  </label>
                  {isGenderValid && (
                    <div className="absolute right-[12.32px] top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                      <Check className="h-5 w-5 text-[#119933]" aria-label="Valid" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="w-[60px] h-[60px] rounded-full overflow-hidden border-2 border-[#d9d9d9]">
            <img src="/images/created-by.png" alt="Creator" className="w-full h-full object-cover" />
          </div>
          <fieldset className="border border-[#b4b0b0] rounded px-3 pb-1 pt-0 relative mt-1">
            <legend className="text-[10px] text-[#7f7f7f] px-1 leading-none">Created By</legend>
            <span className="text-[12px] text-[#1d1d1b]">Cassandra Vega</span>
          </fieldset>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 4 – Choose Category (from API /v1/library/categories)         */
/* ------------------------------------------------------------------ */
function StepCategory({
  categories,
  selected,
  onSelect,
  doctor,
  patientName,
  gender,
  isLoading,
  error,
}: {
  categories: { id: number; name: string; img: string }[];
  selected: number | null;
  onSelect: (id: number) => void;
  doctor: WizardDoctorShape | undefined;
  patientName: string;
  gender: string;
  isLoading?: boolean;
  error?: Error | null;
}) {
  if (error) {
    return (
      <div className="flex-1 flex flex-col px-6 py-6 items-center justify-center">
        <p className="text-[#7f7f7f] text-center mb-4">Unable to load categories. Please try again.</p>
        <p className="text-sm text-[#b4b0b0]">{error.message}</p>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col px-6 py-4">
        <PatientMiniHeader doctor={doctor} patientName={patientName} gender={gender} />
        <h2 className="text-[16px] font-bold text-[#1d1d1b] text-center mt-4 mb-2">CASE DESIGN CENTER</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 max-w-[640px] mx-auto w-full">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="w-full aspect-square rounded-[4px]" />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col px-6 py-4">
      <PatientMiniHeader doctor={doctor} patientName={patientName} gender={gender} />

      <h2 className="text-[16px] font-bold text-[#1d1d1b] text-center mt-4 mb-2">
        CASE DESIGN CENTER
      </h2>

      <div className="flex justify-center mb-4">
        <div className="relative w-full max-w-[373px] h-[34px] border border-[#B4B0B0] rounded-[4px] flex items-center px-3 gap-3">
          <input
            type="text"
            placeholder="Search Product"
            className="flex-1 text-[14px] font-normal text-[#1d1d1b] bg-transparent outline-none tracking-[-0.02em] leading-[22px] placeholder:text-[#B4B0B0]"
            style={{ fontFamily: "Verdana, sans-serif" }}
          />
          <Search size={12} className="text-[#B4B0B0] flex-shrink-0" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 max-w-[640px] mx-auto w-full">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`group flex flex-col items-center px-3 sm:px-4 py-[5px] gap-2 rounded-[7px] border-[3px] transition-all hover:border-[#1162A8] hover:bg-[#1162A8]/5 ${
              selected === cat.id
                ? "border-[#1162A8] bg-[#1162A8]/5"
                : "border-[#d9d9d9] bg-white"
            }`}
          >
            <ProductImageWithFallback src={cat.img} alt={cat.name} name={cat.name} />
            <span
              className="text-[14px] font-normal text-black text-center self-stretch tracking-[-0.02em] leading-[15px] pb-1"
              style={{ fontFamily: "Verdana, sans-serif" }}
            >
              {cat.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 5 – Choose Sub-Product (subcategories from API)                */
/* ------------------------------------------------------------------ */
function StepSubProduct({
  categoryId,
  subProducts,
  categoryName,
  selected,
  onSelect,
  onBack,
  doctor,
  patientName,
  gender,
}: {
  categoryId: number;
  subProducts: { id: number; name: string; img: string }[];
  categoryName: string;
  selected: number | null;
  onSelect: (id: number) => void;
  onBack?: () => void;
  doctor: WizardDoctorShape | undefined;
  patientName: string;
  gender: string;
}) {
  const [accordionOpen, setAccordionOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col px-6 py-4">
      {/* Patient header mini */}
      <PatientMiniHeader doctor={doctor} patientName={patientName} gender={gender} />

      {onBack && (
        <button
          onClick={onBack}
          className="self-start text-[14px] font-semibold text-[#1162A8] hover:underline mt-2 mb-1"
        >
          ← Back to Categories
        </button>
      )}

      <h2 className="text-[16px] font-bold text-[#1d1d1b] text-center mt-4 mb-2">
        CASE DESIGN CENTER
      </h2>

      <div className="flex justify-center mb-4">
        <div className="relative w-full max-w-[373px] h-[34px] border border-[#B4B0B0] rounded-[4px] flex items-center px-3 gap-3">
          <input
            type="text"
            placeholder="Search Product"
            className="flex-1 text-[14px] font-normal text-[#1d1d1b] bg-transparent outline-none tracking-[-0.02em] leading-[22px] placeholder:text-[#B4B0B0]"
            style={{ fontFamily: "Verdana, sans-serif" }}
          />
          <Search size={12} className="text-[#B4B0B0] flex-shrink-0" />
        </div>
      </div>

      {/* Product grid */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        {subProducts.map((prod) => (
          <button
            key={prod.id}
            onClick={() => onSelect(prod.id)}
            className={`group flex flex-col items-center px-4 py-[5px] gap-2 w-[155px] sm:w-[180px] md:w-[200px] rounded-[7px] border-[3px] transition-all hover:border-[#1162A8] hover:bg-[#1162A8]/5 ${
              selected === prod.id
                ? "border-[#1162A8] bg-[#1162A8]/5"
                : "border-[#d9d9d9] bg-white"
            }`}
          >
            <ProductImageWithFallback src={prod.img} alt={prod.name} name={prod.name} />
            <span
              className="text-[14px] font-normal text-black text-center self-stretch tracking-[-0.02em] leading-[15px] pb-1"
              style={{ fontFamily: "Verdana, sans-serif" }}
            >
              {prod.name}
            </span>
          </button>
        ))}
      </div>

      {/* Category accordion */}
      <div className="max-w-[600px] mx-auto w-full">
        <button
          type="button"
          onClick={() => setAccordionOpen(!accordionOpen)}
          className="w-full flex items-center justify-between bg-[#dfeefb]/50 hover:bg-[#dfeefb]/70 px-4 py-3 rounded-lg transition-colors"
        >
          <span className="text-[13px] font-semibold text-[#1d1d1b]">
            {categoryName}
          </span>
          <ChevronDown
            size={18}
            className={`text-[#7f7f7f] transition-transform ${accordionOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 6 – Choose Material / Product (from API /v1/library/products) */
/* ------------------------------------------------------------------ */
function StepMaterial({
  categoryName,
  subProductName,
  products,
  selected,
  onSelect,
  onBack,
  doctor,
  patientName,
  gender,
  isLoading,
  error,
  isRemovableRestoration,
}: {
  categoryName: string;
  subProductName: string;
  products: { id: number; name: string; img: string }[];
  selected: string | null;
  onSelect: (id: string, arch?: "maxillary" | "mandibular" | "both") => void;
  onBack?: () => void;
  doctor: WizardDoctorShape | undefined;
  patientName: string;
  gender: string;
  isLoading?: boolean;
  error?: Error | null;
  isRemovableRestoration?: boolean;
}) {
  const [archPopoverProductId, setArchPopoverProductId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  if (error) {
    return (
      <div className="flex-1 flex flex-col px-6 py-6 items-center justify-center">
        <p className="text-[#7f7f7f] text-center mb-4">Unable to load products. Please try again.</p>
        <p className="text-sm text-[#b4b0b0]">{error.message}</p>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col px-6 py-4">
        <PatientMiniHeader doctor={doctor} patientName={patientName} gender={gender} />
        <h2 className="text-[16px] font-bold text-[#1d1d1b] text-center mt-4 mb-2">CASE DESIGN CENTER</h2>
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="w-[155px] sm:w-[180px] md:w-[200px] aspect-square rounded-[5px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-4">
      <PatientMiniHeader doctor={doctor} patientName={patientName} gender={gender} />

      {onBack && (
        <button
          onClick={onBack}
          className="self-start text-[14px] font-semibold text-[#1162A8] hover:underline mt-2 mb-1"
        >
          ← Back to Subcategories
        </button>
      )}

      <h2 className="text-[16px] font-bold text-[#1d1d1b] text-center mt-4 mb-2">
        CASE DESIGN CENTER
      </h2>

      <div className="flex justify-center mb-4">
        <div className="relative w-full max-w-[373px] h-[34px] border border-[#B4B0B0] rounded-[4px] flex items-center px-3 gap-3">
          <input
            type="text"
            placeholder="Search Product"
            className="flex-1 text-[14px] font-normal text-[#1d1d1b] bg-transparent outline-none tracking-[-0.02em] leading-[22px] placeholder:text-[#B4B0B0]"
            style={{ fontFamily: "Verdana, sans-serif" }}
          />
          <Search size={12} className="text-[#B4B0B0] flex-shrink-0" />
        </div>
      </div>

      {/* Backdrop to close arch popover on outside click */}
      {archPopoverProductId && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setArchPopoverProductId(null)}
        />
      )}

      {/* Product cards grid (from API) */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        {products.map((prod) => {
          const prodId = String(prod.id);
          const isSelected = selected === prodId || archPopoverProductId === prodId;
          return (
            <div key={prod.id} className="relative">
              <button
                ref={(el) => { cardRefs.current[prodId] = el; }}
                onClick={() => {
                  if (isRemovableRestoration) {
                    setArchPopoverProductId(archPopoverProductId === prodId ? null : prodId);
                  } else {
                    onSelect(prodId);
                  }
                }}
                className={`group relative flex flex-col items-center px-4 py-[5px] gap-2 w-[155px] sm:w-[180px] md:w-[200px] rounded-[7px] border-[3px] transition-all hover:border-[#1162A8] hover:bg-[#1162A8]/5 ${
                  isSelected
                    ? "border-[#1162A8] bg-[#1162A8]/5"
                    : "border-[#d9d9d9] bg-white"
                }`}
              >
                <span className="absolute top-1 text-[10px] text-[#7f7f7f] opacity-0 group-hover:opacity-100 transition-opacity">
                  Click and select
                </span>
                <ProductImageWithFallback src={prod.img} alt={prod.name} name={prod.name} className="rounded-[5px]" bgClassName="bg-[#080808]" textClassName="text-[#b4b0b0]" />
                <span
                  style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, lineHeight: "15px", letterSpacing: "-0.02em" }}
                  className="text-[#000000] text-center self-stretch"
                >
                  {prod.name}
                </span>
              </button>

              {/* Arch selection popover */}
              {archPopoverProductId === prodId && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 bg-white rounded-xl shadow-lg border border-[#E5E7EB] overflow-hidden min-w-[200px]">
                  {([
                    { label: "Upper arch only", value: "maxillary" as const },
                    { label: "Both arches", value: "both" as const },
                    { label: "Lower arch only", value: "mandibular" as const },
                  ]).map((option) => (
                    <div
                      key={option.value}
                      className="px-6 py-3 cursor-pointer hover:bg-[#DFEEFB] transition-colors text-[#1d1d1b]"
                      style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, lineHeight: "22px" }}
                      onClick={() => {
                        setArchPopoverProductId(null);
                        onSelect(prodId, option.value);
                      }}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Breadcrumb bar showing category > sub-product */}
      <div className="max-w-[600px] mx-auto w-full">
        <div className="flex items-center justify-between bg-[#dfeefb]/50 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-[#1d1d1b] bg-white px-3 py-1 rounded border border-[#d9d9d9]">
              {categoryName}
            </span>
            <span className="text-[12px] font-semibold text-[#1d1d1b] bg-white px-3 py-1 rounded border border-[#d9d9d9]">
              {subProductName}
            </span>
          </div>
          <ChevronDown size={18} className="text-[#7f7f7f]" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mini patient header (for steps 4, 5, 6)                            */
/* ------------------------------------------------------------------ */
function PatientMiniHeader({
  doctor,
  patientName,
  gender,
}: {
  doctor: WizardDoctorShape | undefined;
  patientName: string;
  gender: string;
}) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-5">
        {doctor && (
          <div className="flex flex-col items-center gap-1">
            <div className="w-[80px] h-[80px] rounded-full overflow-hidden border-2 border-[#d9d9d9] bg-[#eef1f4]">
              <img
                src={doctor.img}
                alt={doctor.name}
                className="w-full h-full object-cover"
                data-fallback={getDoctorFallbackImg(doctor.id)}
                onError={(e) => {
                  const fallback = e.currentTarget.dataset.fallback || DOCTOR_AVATAR_FALLBACKS[0];
                  e.currentTarget.src = fallback;
                }}
              />
            </div>
            <span className="text-[11px] font-semibold text-[#1d1d1b]">
              {doctor.name}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <fieldset className="border border-[#34a853] rounded px-3 pb-2 pt-0 relative min-w-[280px]">
            <legend className="text-[11px] text-[#34a853] px-1 leading-none font-medium">
              Patient name
            </legend>
            <div className="flex items-center gap-1">
              <span className="text-[13px] text-[#1d1d1b] leading-tight">{patientName}</span>
              <Check size={16} className="text-[#34a853] flex-shrink-0" />
            </div>
          </fieldset>
          <fieldset className="border border-[#34a853] rounded px-3 pb-2 pt-0 relative min-w-[280px]">
            <legend className="text-[11px] text-[#34a853] px-1 leading-none font-medium">
              Gender
            </legend>
            <div className="flex items-center gap-1">
              <span className="text-[13px] text-[#1d1d1b] leading-tight">{gender}</span>
              <Check size={16} className="text-[#34a853] flex-shrink-0" />
            </div>
          </fieldset>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <div className="w-[60px] h-[60px] rounded-full overflow-hidden border-2 border-[#d9d9d9]">
          <img
            src="/images/created-by.png"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/images/created-by.png";
            }}
            alt="Cassandra Vega"
            className="w-full h-full object-cover"
          />
        </div>
        <fieldset className="border border-[#b4b0b0] rounded px-3 pb-1 pt-0 relative mt-1">
          <legend className="text-[10px] text-[#7f7f7f] px-1 leading-none">
            Created By
          </legend>
          <span className="text-[12px] text-[#1d1d1b]">Cassandra Vega</span>
        </fieldset>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Wizard Component                                              */
/* ------------------------------------------------------------------ */
export default function NewCaseWizard({
  onComplete,
  onLabSelect,
  startStep = 1,
  mode = "initial",
  initialLabId = null,
  initialPatientName = "",
  initialGender = "",
  initialDoctor = undefined,
  initialCategory = null,
  initialSubProduct = null,
}: {
  onComplete: (result: WizardResult) => void;
  onLabSelect?: (lab: WizardLabShape) => void;
  startStep?: number;
  mode?: "initial" | "addProduct";
  initialLabId?: number | null;
  initialPatientName?: string;
  initialGender?: string;
  initialDoctor?: WizardDoctorShape;
  initialCategory?: number | null;
  initialSubProduct?: number | null;
}) {
  const [step, setStep] = useState(startStep);
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [selectedLab, setSelectedLab] = useState<number | null>(initialLabId);
  const [patientName, setPatientName] = useState(initialPatientName);
  const [gender, setGender] = useState(initialGender);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(initialCategory);
  const [selectedSubProduct, setSelectedSubProduct] = useState<number | null>(initialSubProduct);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { role, customerId, isOfficeAdmin, isLabAdmin } = useWizardRole();
  const { officesAsLabs, isLoading: labsLoading, error: labsError } = useConnectedOfficesOrLabs(role);
  const lab = officesAsLabs.find((l) => l.id === selectedLab);

  // customer_id for library/categories: office_admin = selected lab id, lab_admin = their customerId
  const customerIdForCategories = useMemo(() => {
    if (isOfficeAdmin && selectedLab != null) return selectedLab;
    if ((isLabAdmin || role) && customerId != null) return customerId;
    return undefined;
  }, [isOfficeAdmin, isLabAdmin, role, customerId, selectedLab]);

  const {
    categoriesAsWizard,
    subcategoriesByCategoryId,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useLibraryCategories({
    customerId: customerIdForCategories,
    lang: "en",
    enabled: step >= 4,
  });

  const {
    productsAsWizard,
    isLoading: productsLoading,
    error: productsError,
  } = useLibraryProducts({
    customerId: customerIdForCategories,
    subcategoryId: selectedSubProduct ?? undefined,
    perPage: 50,
    page: 1,
    enabled: step === 6 && selectedSubProduct != null,
  });

  // Office ID for doctors: office_admin = logged-in user's customerId; lab_admin = selected lab (office) id
  const officeIdForDoctors = useMemo(() => {
    if (isOfficeAdmin && customerId != null) return customerId;
    if (isLabAdmin && selectedLab != null) return selectedLab;
    return undefined;
  }, [isOfficeAdmin, isLabAdmin, customerId, selectedLab]);

  const {
    data: officeDoctorsRaw = [],
    isLoading: doctorsLoading,
    isSuccess: doctorsSuccess,
    error: doctorsError,
  } = useOfficeDoctors(officeIdForDoctors);

  const doctorsForWizard: WizardDoctorShape[] = useMemo(
    () =>
      (officeDoctorsRaw as { id: number; first_name?: string; last_name?: string; image?: string; profile_image?: string }[]).map(
        (d, i) => ({
          id: d.id,
          name: [d.first_name, d.last_name].filter(Boolean).join(" ").trim() || "Doctor",
          img: d.image || d.profile_image || getDoctorFallbackImg(d.id, i),
        })
      ),
    [officeDoctorsRaw]
  );

  const doctor = doctorsForWizard.find((d) => d.id === selectedDoctor) ?? initialDoctor;

  // Step order: office_admin = Doctor(1) → Lab(2) → Patient(3)...; else (lab_admin, doctor, etc.) = Lab(1) → Doctor(2) → Patient(3)...
  const isStepDoctor = (s: number) => (s === 1 && role === "office_admin") || (s === 2 && role !== "office_admin");
  const isStepLab = (s: number) => (s === 1 && role !== "office_admin") || (s === 2 && role === "office_admin");

  // When there is only one doctor, auto-select and proceed to next step
  const didAutoAdvanceDoctorRef = useRef(false);
  useEffect(() => {
    const onDoctorStep = (step === 1 && role === "office_admin") || (step === 2 && role !== "office_admin");
    if (!onDoctorStep) {
      didAutoAdvanceDoctorRef.current = false;
      return;
    }
    const oneDoctor = doctorsForWizard.length === 1 ? doctorsForWizard[0] : null;
    if (
      doctorsSuccess &&
      oneDoctor != null &&
      selectedDoctor === null &&
      !didAutoAdvanceDoctorRef.current
    ) {
      didAutoAdvanceDoctorRef.current = true;
      setSelectedDoctor(oneDoctor.id);
      setStep((s) => s + 1);
    }
  }, [step, role, doctorsSuccess, doctorsForWizard, selectedDoctor]);

  const canProceed = () => {
    switch (step) {
      case 1:
        return isStepDoctor(1) ? selectedDoctor !== null : selectedLab !== null;
      case 2:
        return isStepDoctor(2) ? selectedDoctor !== null : selectedLab !== null;
      case 3: {
        const p = patientName.trim();
        if (!p || !gender) return false;
        const parts = p.split(/\s+/).filter(Boolean);
        if (parts.length < 2) return false;
        return parts[0].length >= 2 && parts[parts.length - 1].length >= 2;
      }
      case 4:
        return selectedCategory !== null;
      case 5:
        return selectedSubProduct !== null;
      case 6:
        return selectedMaterial !== null;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 6) {
      setStep(step + 1);
    } else if (step === 6 && mode === "addProduct") {
      onComplete({
        doctor: doctor ?? { id: 0, name: "", img: "" },
        lab: lab ?? { id: 0, name: "", location: "", logo: null },
        patientName,
        gender,
        category: selectedCategory != null ? String(selectedCategory) : "",
        product: selectedSubProduct != null ? String(selectedSubProduct) : "",
        material: selectedMaterial || "",
      });
    } else if (step === 6 && doctor && lab) {
      onComplete({
        doctor,
        lab,
        patientName,
        gender,
        category: selectedCategory != null ? String(selectedCategory) : "",
        product: selectedSubProduct != null ? String(selectedSubProduct) : "",
        material: selectedMaterial || "",
      });
    }
  };

  const router = useRouter();

  const handleCancel = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    router.push("/dashboard");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Step content – step 1 & 2 order by role: office_admin = Doctor → Lab, lab_admin = Lab → Doctor */}
      <div className="flex-1 overflow-auto">
        {step <= 2 && role === null && (
          <div className="flex-1 flex items-center justify-center px-6 py-6">
            <Skeleton className="h-12 w-48 rounded" />
          </div>
        )}
        {step === 1 && role !== null && isStepDoctor(1) && (
          <StepDoctor
            doctors={doctorsForWizard}
            selected={selectedDoctor}
            onSelect={(id) => {
              setSelectedDoctor(id);
              setTimeout(() => setStep(2), 300);
            }}
            isLoading={doctorsLoading}
            error={doctorsError}
          />
        )}
        {step === 1 && role !== null && isStepLab(1) && (
          <StepLab
            labs={officesAsLabs}
            selected={selectedLab}
            onSelect={(id) => {
              setSelectedLab(id);
              const selected = officesAsLabs.find((l) => l.id === id);
              if (selected) onLabSelect?.(selected);
              setTimeout(() => setStep(2), 300);
            }}
            isLoading={labsLoading}
            error={labsError}
            stepTitle={role === "office_admin" ? "Choose a Lab" : "Choose an Office"}
            entityLabel={role === "office_admin" ? "office" : "lab"}
          />
        )}
        {step === 2 && role !== null && isStepDoctor(2) && (
          <StepDoctor
            doctors={doctorsForWizard}
            selected={selectedDoctor}
            onSelect={(id) => {
              setSelectedDoctor(id);
              setTimeout(() => setStep(3), 300);
            }}
            isLoading={doctorsLoading}
            error={doctorsError}
          />
        )}
        {step === 2 && role !== null && isStepLab(2) && (
          <StepLab
            labs={officesAsLabs}
            selected={selectedLab}
            onSelect={(id) => {
              setSelectedLab(id);
              const selected = officesAsLabs.find((l) => l.id === id);
              if (selected) onLabSelect?.(selected);
              setTimeout(() => setStep(3), 300);
            }}
            isLoading={labsLoading}
            error={labsError}
            stepTitle={role === "office_admin" ? "Choose an Office" : "Choose a Lab"}
            entityLabel={role === "office_admin" ? "office" : "lab"}
          />
        )}
        {step === 3 && (
          <StepPatientInfo
            doctor={doctor}
            patientName={patientName}
            setPatientName={setPatientName}
            gender={gender}
            setGender={setGender}
            onComplete={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <StepCategory
            categories={categoriesAsWizard}
            selected={selectedCategory}
            onSelect={(id) => {
              setSelectedCategory(id);
              setSelectedSubProduct(null);
              setTimeout(() => setStep(5), 300);
            }}
            doctor={doctor}
            patientName={patientName}
            gender={gender}
            isLoading={categoriesLoading}
            error={categoriesError}
          />
        )}
        {step === 5 && selectedCategory != null && (
          <StepSubProduct
            categoryId={selectedCategory}
            subProducts={subcategoriesByCategoryId[selectedCategory] ?? []}
            categoryName={categoriesAsWizard.find((c) => c.id === selectedCategory)?.name ?? ""}
            selected={selectedSubProduct}
            onSelect={(id) => {
              setSelectedSubProduct(id);
              setTimeout(() => setStep(6), 300);
            }}
            onBack={() => setStep(4)}
            doctor={doctor}
            patientName={patientName}
            gender={gender}
          />
        )}
        {step === 6 && selectedCategory != null && selectedSubProduct != null && (() => {
          const selectedCategoryName = categoriesAsWizard.find((c) => c.id === selectedCategory)?.name ?? "";
          const isRemovable = selectedCategoryName.toLowerCase().includes("removable");
          return (
            <StepMaterial
              categoryName={selectedCategoryName}
              subProductName={
                (subcategoriesByCategoryId[selectedCategory] ?? []).find((p) => p.id === selectedSubProduct)?.name ?? ""
              }
              products={productsAsWizard}
              selected={selectedMaterial}
              isLoading={productsLoading}
              error={productsError}
              isRemovableRestoration={isRemovable}
              onBack={() => setStep(5)}
              onSelect={(id, arch) => {
                setSelectedMaterial(id);
                if (mode === "addProduct") {
                  setTimeout(() => {
                    onComplete({
                      doctor: doctor ?? { id: 0, name: "", img: "" },
                      lab: lab ?? { id: 0, name: "", location: "", logo: null },
                      patientName,
                      gender,
                      category: String(selectedCategory),
                      product: String(selectedSubProduct),
                      material: id,
                      arch,
                    });
                  }, 300);
                } else if (doctor && lab) {
                  setTimeout(() => {
                    onComplete({
                      doctor,
                      lab,
                      patientName,
                      gender,
                      category: String(selectedCategory),
                      product: String(selectedSubProduct),
                      material: id,
                      arch,
                    });
                  }, 300);
                }
              }}
              doctor={doctor}
              patientName={patientName}
              gender={gender}
            />
          );
        })()}
      </div>

      {/* Bottom bar for steps 1-3 (doctor, lab, patient info) */}
      {step <= 3 && (
        <div className="border-t border-[#d9d9d9] bg-[#fdfdfd] px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div />

          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="border border-[#1162a8] text-[#1162a8] text-[12px] font-semibold px-6 py-2 rounded hover:bg-[#dfeefb]/30 transition-colors bg-transparent"
            >
              Cancel
            </button>
            {step === 3 && (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-[#1162a8] hover:bg-[#0d4a85] disabled:bg-[#9ba5b7] text-white text-[12px] font-semibold px-6 py-2 rounded transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}

      {/* SlipCreationStepFooter for steps 4-6 (category, subcategory, product) */}
      {step >= 4 && (
        <SlipCreationStepFooter
          mode="navigation"
          showPrevious={true}
          onPrevious={() => {
            if (step > 1) {
              setStep(step - 1);
            }
          }}
        />
      )}

      {/* Cancel slip creation modal (steps 1–3) */}
      <CancelSlipCreationModal
        open={showCancelModal}
        onCancel={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
