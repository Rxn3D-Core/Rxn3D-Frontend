"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Filter, Plus, Search, ChevronDown } from "lucide-react";
import { Check } from "@/components/ui/custom-check";
import { SlipCreationStepFooter } from "@/components/slip-creation-step-footer";
import { useConnectedOfficesOrLabs } from "@/hooks/use-connected-offices";
import { useOfficeDoctors } from "@/hooks/use-slip-data";
import { useLibraryCategories } from "@/hooks/use-library-categories";
import { useLibraryProducts, useLibraryProductSearch, useSubcategoryProductCounts, type LibraryProductApi } from "@/hooks/use-library-products";
import { useDebounce } from "@/lib/performance-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import CancelSlipCreationModal from "@/components/cancel-slip-creation-modal";
import { AddNewLabModal } from "@/components/add-new-lab-modal";
import { AddDoctorModal } from "@/components/add-doctor-modal";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { FieldInput, SelectField } from "@/components/case-design-center/components/fields";
import { getJawSelectionPopoverInsets } from "@/components/case-design-center/utils/jawSelectionPopoverLayout";
import {
  getPatientNameFieldLabel,
  isValidPatientName,
  shouldAutoOpenPatientGender,
  shouldShowPatientGenderField,
} from "@/lib/patient-name-validation";
import { usePatientFieldSettings } from "@/hooks/use-patient-field-settings";
import { useCreatedByUser } from "@/hooks/use-created-by-user";
import { getActiveCustomerId } from "@/lib/customer-scope";
import { isLabCustomerContext, isOfficeCustomerContext } from "@/lib/role-utils";
import { resolveDoctorImageUrl } from "@/utils/avatar-utils";

/** Slip-settings-driven patient field flags shared across wizard steps. */
interface WizardPatientFieldSettings {
  showGender: boolean;
  genderRequired: boolean;
  showAge: boolean;
  ageRequired: boolean;
}

const DEFAULT_WIZARD_FIELD_SETTINGS: WizardPatientFieldSettings = {
  showGender: true,
  genderRequired: true,
  showAge: true,
  ageRequired: false,
};

/* ------------------------------------------------------------------ */
/*  Role / auth helpers (client-only)                                  */
/* ------------------------------------------------------------------ */
function useWizardRole() {
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [isOfficeAdmin, setIsOfficeAdmin] = useState(false);
  const [isLabAdmin, setIsLabAdmin] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const activeId = getActiveCustomerId();
    setCustomerId(activeId ? Number(activeId) : null);
    setIsOfficeAdmin(isOfficeCustomerContext());
    setIsLabAdmin(isLabCustomerContext());
  }, []);

  const role = isOfficeAdmin ? "office_admin" : isLabAdmin ? "lab_admin" : null;
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
  fillHeight = false,
}: {
  src: string | null | undefined;
  alt: string;
  name: string;
  className?: string;
  bgClassName?: string;
  textClassName?: string;
  fillHeight?: boolean;
}) {
  const [failed, setFailed] = React.useState(!src);
  // Reset failed state when src changes
  React.useEffect(() => { setFailed(!src); }, [src]);

  const sizeClass = fillHeight ? "w-full flex-1 min-h-0" : "w-full aspect-square";

  if (failed) {
    return (
      <div className={`${sizeClass} ${className} overflow-hidden flex-shrink-0 ${bgClassName} flex items-center justify-center p-3`}>
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
    <div className={`${sizeClass} ${className} overflow-hidden flex-shrink-0 ${bgClassName}`}>
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
/*  Product search (shared across category / subcategory / material)   */
/* ------------------------------------------------------------------ */
interface ProductSearchProps {
  productSearch: string;
  onProductSearchChange: (value: string) => void;
  searchResults: LibraryProductApi[];
  isSearchingProducts: boolean;
  onSearchProductSelect: (product: LibraryProductApi) => void;
}

function ProductSearchBar({
  value,
  onChange,
  inline = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  inline?: boolean;
  className?: string;
}) {
  const field = (
    <div
      className={cn(
        "relative w-full h-[34px] border border-[#B4B0B0] rounded-[4px] flex items-center px-3 gap-3",
        className
      )}
    >
      <input
        type="text"
        placeholder="Search Product"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 text-[14px] font-normal text-[#1d1d1b] bg-transparent outline-none tracking-[-0.02em] leading-[22px] placeholder:text-[#B4B0B0]"
        style={{ fontFamily: "Verdana, sans-serif" }}
      />
      <Search size={12} className="text-[#B4B0B0] flex-shrink-0" />
    </div>
  );

  if (inline) return field;

  return (
    <div className="flex justify-center mb-4">
      <div className="w-full max-w-[373px]">{field}</div>
    </div>
  );
}

/** Responsive product picker grid — up to 6 cards per row on HD (xl+), centered. */
const PRODUCT_CARD_GRID_CLASS =
  "flex flex-wrap justify-center gap-4 mb-6 w-full";

/** Fluid width so N cards fit per breakpoint; works with flex centering for partial rows. */
const PRODUCT_CARD_ITEM_CLASS =
  "w-[calc((100%-1rem)/2)] sm:w-[calc((100%-2rem)/3)] md:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-4rem)/5)] xl:w-[calc((100%-5rem)/6)]";

const PRODUCT_CARD_SKELETON_COUNT = 6;

function productPickerCardClass(selected: boolean, extra?: string) {
  return cn(
    "group flex flex-col overflow-hidden rounded-[7px] border-[3px] w-full transition-all hover:border-[#1162A8] hover:bg-[#1162A8]/5",
    selected ? "border-[#1162A8] bg-[#1162A8]/5" : "border-[#d9d9d9] bg-white",
    extra
  );
}

const ProductPickerCardLabel = React.forwardRef<
  HTMLSpanElement,
  React.PropsWithChildren<{ className?: string }>
>(function ProductPickerCardLabel({ children, className }, ref) {
  return (
    <span
      ref={ref}
      className={cn(
        "text-[16px] font-normal text-black text-center self-stretch tracking-[-0.02em] leading-[15px] py-2 px-2 flex items-center justify-center",
        className
      )}
      style={{ fontFamily: "Verdana, sans-serif" }}
    >
      {children}
    </span>
  );
});

function formatProductDaysLabel(product: LibraryProductApi): string | null {
  const min = product.min_days_to_process;
  const max = product.max_days_to_process;
  if (min != null && max != null) return `est ${min}-${max} days`;
  if (min != null) return `est ${min} days`;
  if (max != null) return `est ${max} days`;
  return null;
}

function ProductPickerPriceMeta({
  price,
  daysLabel,
}: {
  price?: string | null;
  daysLabel?: string | null;
}) {
  if (!price && !daysLabel) return null;

  return (
    <div className="flex flex-col gap-1 px-2 pb-2 w-full mt-auto">
      {price ? (
        <div className="bg-[rgba(17,98,168,0.2)] border border-[#1162a8] rounded-[10px] h-[15px] flex items-center justify-center w-full">
          <p className="text-[#1162a8] text-[9px] leading-none" style={{ fontFamily: "Verdana, sans-serif" }}>
            ${price}
          </p>
        </div>
      ) : null}
      {daysLabel ? (
        <div className="bg-[rgba(146,147,147,0.2)] border border-[#929393] rounded-[10px] h-[15px] flex items-center justify-center w-full">
          <p className="text-[#929393] text-[9px] leading-none" style={{ fontFamily: "Verdana, sans-serif" }}>
            {daysLabel}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ProductPickerCardSkeleton() {
  return (
    <div className={PRODUCT_CARD_ITEM_CLASS}>
      <Skeleton className="w-full aspect-[4/5] rounded-[7px]" />
    </div>
  );
}

function BackToProductsIcon({ gradientId }: { gradientId: string }) {
  return (
    <svg width="27" height="25" viewBox="0 0 27 25" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0" aria-hidden="true">
      <path
        d="M12.3958 22.6042L2.1875 12.3958L12.3958 2.1875M24.0625 22.6042L13.8542 12.3958L24.0625 2.1875"
        stroke={`url(#${gradientId})`}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id={gradientId} x1="29.9926" y1="2.46022" x2="0.157808" y2="27.922" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2AA6DE" />
          <stop offset="0.5" stopColor="#82298D" />
          <stop offset="1" stopColor="#C9539F" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Single-row toolbar: back (left) · title (center) · search (right). */
function CaseDesignCenterToolbar({
  onBack,
  productSearch,
  onProductSearchChange,
  showSearch = true,
}: {
  onBack?: () => void;
  productSearch: string;
  onProductSearchChange: (value: string) => void;
  showSearch?: boolean;
}) {
  const gradientId = React.useId().replace(/:/g, "");

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 mb-4 min-h-[34px]">
      <div className="flex items-center justify-start min-w-[27px]">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="p-0.5 hover:opacity-80 transition-opacity"
            aria-label="Back to products"
          >
            <BackToProductsIcon gradientId={gradientId} />
          </button>
        ) : null}
      </div>

      <h2
        className="text-center text-[18px] sm:text-[20px] font-bold text-[#1d1d1b] tracking-wide whitespace-nowrap px-1"
        style={{ fontFamily: "Verdana, sans-serif" }}
      >
        CASE DESIGN CENTER
      </h2>

      <div className="flex items-center justify-end min-w-0">
        {showSearch ? (
          <ProductSearchBar
            inline
            value={productSearch}
            onChange={onProductSearchChange}
            className="w-full max-w-[200px] sm:max-w-[280px] md:max-w-[373px]"
          />
        ) : null}
      </div>
    </div>
  );
}

function ProductSearchResults({
  productSearch,
  searchResults,
  isSearchingProducts,
  onSearchProductSelect,
}: Pick<
  ProductSearchProps,
  "productSearch" | "searchResults" | "isSearchingProducts" | "onSearchProductSelect"
>) {
  const trimmed = productSearch.trim();
  if (!trimmed) return null;

  if (isSearchingProducts) {
    return (
      <div className="flex items-center justify-center py-10 mb-6">
        <p className="text-[#7f7f7f] text-[14px]" style={{ fontFamily: "Verdana, sans-serif" }}>
          Searching products...
        </p>
      </div>
    );
  }

  if (searchResults.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 mb-6">
        <p className="text-[#7f7f7f] text-[14px] text-center" style={{ fontFamily: "Verdana, sans-serif" }}>
          No products found matching &ldquo;{trimmed}&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className={PRODUCT_CARD_GRID_CLASS}>
      {searchResults.map((product) => (
        <button
          key={product.id}
          type="button"
          onClick={() => onSearchProductSelect(product)}
          className={cn(productPickerCardClass(false), PRODUCT_CARD_ITEM_CLASS)}
        >
          <ProductPickerCardLabel>{product.name}</ProductPickerCardLabel>
          <ProductImageWithFallback
            src={product.image_url}
            alt={product.name}
            name={product.name}
            className="rounded-none"
            bgClassName=""
          />
          <ProductPickerPriceMeta
            price={product.price}
            daysLabel={formatProductDaysLabel(product)}
          />
        </button>
      ))}
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
  age?: string;
  category: string;
  product: string;
  material: string;
  materialName?: string;
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
  onAddNew,
}: {
  doctors: WizardDoctorShape[];
  selected: number | null;
  onSelect: (id: number) => void;
  isLoading?: boolean;
  error?: Error | null;
  onAddNew?: () => void;
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
        <button
          onClick={onAddNew}
          className="flex items-center gap-1 bg-[#1162a8] hover:bg-[#0d4a85] text-white text-[12px] font-semibold px-4 py-2 rounded transition-colors"
        >
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
              className={`w-full aspect-square max-w-[219.68px] rounded-full overflow-hidden flex-shrink-0 transition-all bg-[#eef1f4] ${selected === doc.id
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
              className={`text-[11px] text-[#7f7f7f] transition-opacity ${selected === doc.id
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
  onAddNew,
}: {
  labs: WizardLabShape[];
  selected: number | null;
  onSelect: (id: number) => void;
  isLoading?: boolean;
  error?: Error | null;
  stepTitle: string;
  entityLabel?: "lab" | "office";
  onAddNew?: () => void;
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
          onClick={onAddNew}
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
                  style={{ width: "100%", objectFit: "contain" }}
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
  fieldSettings = DEFAULT_WIZARD_FIELD_SETTINGS,
}: {
  doctor: WizardDoctorShape | undefined;
  patientName: string;
  setPatientName: (v: string) => void;
  gender: string;
  setGender: (v: string) => void;
  onComplete?: () => void;
  fieldSettings?: WizardPatientFieldSettings;
}) {
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isGenderFocused, setIsGenderFocused] = useState(false);
  const [highlightedGenderIndex, setHighlightedGenderIndex] = useState(-1);
  const [genderKeyboardActive, setGenderKeyboardActive] = useState(false);
  const patientNameInputRef = useRef<HTMLInputElement>(null);
  const patientNameDesktopRef = useRef<HTMLInputElement>(null);
  const genderTriggerRef = useRef<HTMLDivElement>(null);
  const refocusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const genderKeyboardActiveRef = useRef(false);
  const highlightedGenderIndexRef = useRef(-1);
  const genderOptions = ["Male", "Female"] as const;

  /** Focus whichever patient name input is currently visible */
  const focusPatientInput = () => {
    const isMobile = window.innerWidth < 640;
    const ref = isMobile ? patientNameInputRef : patientNameDesktopRef;
    ref.current?.focus();
  };

  const blurPatientInput = () => {
    patientNameInputRef.current?.blur();
    patientNameDesktopRef.current?.blur();
  };

  const { createdByName, createdByImageUrl: createdByImage } = useCreatedByUser();

  useEffect(() => {
    if (!(patientName ?? "").trim()) {
      const focusTimer = setTimeout(() => focusPatientInput(), 100);
      return () => clearTimeout(focusTimer);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (refocusTimerRef.current) clearTimeout(refocusTimerRef.current);
    };
  }, []);

  useEffect(() => {
    highlightedGenderIndexRef.current = highlightedGenderIndex;
  }, [highlightedGenderIndex]);

  useEffect(() => {
    if (!isGenderFocused && !genderKeyboardActiveRef.current) {
      setHighlightedGenderIndex(-1);
      highlightedGenderIndexRef.current = -1;
    }
  }, [isGenderFocused]);

  const getGenderDisplay = (g?: string) => {
    if (g === "Male" || g === "male") return "Male";
    if (g === "Female" || g === "female") return "Female";
    return "Select Gender";
  };

  const { showGender, genderRequired } = fieldSettings;
  const name = patientName ?? "";
  const showGenderField = showGender && shouldShowPatientGenderField(name);

  const handleNameChange = (value: string) => {
    setPatientName(value);
    if (refocusTimerRef.current) {
      clearTimeout(refocusTimerRef.current);
    }
    // When gender is hidden there's no field to auto-open/advance from; the
    // user proceeds via the Next button (canProceed gates on a valid name).
    const shouldOpen = showGender && shouldAutoOpenPatientGender(value, gender);
    if (shouldOpen && !isGenderFocused && !genderKeyboardActiveRef.current) {
      setIsGenderFocused(true);
      refocusTimerRef.current = setTimeout(() => {
        if (
          !genderKeyboardActiveRef.current &&
          document.activeElement !== genderTriggerRef.current
        ) {
          focusPatientInput();
        }
      }, 50);
    }
  };

  const focusGenderDropdown = () => {
    if (!showGenderField || !genderTriggerRef.current) return;
    if (refocusTimerRef.current) {
      clearTimeout(refocusTimerRef.current);
      refocusTimerRef.current = null;
    }
    genderKeyboardActiveRef.current = true;
    setGenderKeyboardActive(true);
    setIsNameFocused(false);
    blurPatientInput();
    setIsGenderFocused(true);
    setHighlightedGenderIndex(0);
    highlightedGenderIndexRef.current = 0;
    setTimeout(() => {
      genderTriggerRef.current?.focus({ preventScroll: true });
    }, 0);
  };

  const handleGenderSelect = (value: string) => {
    setGender(value);
    genderKeyboardActiveRef.current = false;
    setGenderKeyboardActive(false);
    setIsGenderFocused(false);
    setHighlightedGenderIndex(-1);
    highlightedGenderIndexRef.current = -1;
    setTimeout(() => focusPatientInput(), 50);
    if (name.trim() && onComplete) setTimeout(() => onComplete(), 300);
  };

  const processGenderKey = (key: string): boolean => {
    switch (key) {
      case "ArrowDown":
        setIsGenderFocused(true);
        setHighlightedGenderIndex((prev) => {
          const next =
            prev < 0 ? 0 : prev < genderOptions.length - 1 ? prev + 1 : 0;
          highlightedGenderIndexRef.current = next;
          return next;
        });
        return true;
      case "ArrowUp":
        setIsGenderFocused(true);
        setHighlightedGenderIndex((prev) => {
          const next =
            prev < 0
              ? genderOptions.length - 1
              : prev > 0
                ? prev - 1
                : genderOptions.length - 1;
          highlightedGenderIndexRef.current = next;
          return next;
        });
        return true;
      case "Enter":
      case " ": {
        const idx = highlightedGenderIndexRef.current;
        if (idx >= 0) {
          handleGenderSelect(genderOptions[idx]);
        } else {
          setIsGenderFocused(true);
          setHighlightedGenderIndex(0);
          highlightedGenderIndexRef.current = 0;
        }
        return true;
      }
      case "Escape":
        genderKeyboardActiveRef.current = false;
        setGenderKeyboardActive(false);
        setIsGenderFocused(false);
        setHighlightedGenderIndex(-1);
        highlightedGenderIndexRef.current = -1;
        focusPatientInput();
        return true;
      default:
        return false;
    }
  };

  const GENDER_NAV_KEYS = ["ArrowDown", "ArrowUp", "Enter", " ", "Escape"] as const;

  useEffect(() => {
    if (!genderKeyboardActive) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") return;
      if (!GENDER_NAV_KEYS.includes(e.key as (typeof GENDER_NAV_KEYS)[number])) return;

      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" &&
        target !== patientNameInputRef.current &&
        target !== patientNameDesktopRef.current
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      processGenderKey(e.key);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [genderKeyboardActive, genderOptions]);

  const handleGenderKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Tab") {
      setIsGenderFocused(false);
      setGenderKeyboardActive(false);
      genderKeyboardActiveRef.current = false;
      return;
    }
    if (processGenderKey(e.key)) {
      e.preventDefault();
    }
  };

  const handlePatientNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" && !e.shiftKey && showGenderField) {
      e.preventDefault();
      focusGenderDropdown();
      return;
    }
    if (
      genderKeyboardActive &&
      GENDER_NAV_KEYS.includes(e.key as (typeof GENDER_NAV_KEYS)[number])
    ) {
      e.preventDefault();
      processGenderKey(e.key);
    }
  };

  const hasNameValue = name.trim() !== "";
  const hasGenderValue = gender.trim() !== "";
  const isNameValid = hasNameValue && isValidPatientName(name);
  const isGenderValid = hasGenderValue;

  const getNameBorderColor = () => {
    if (isNameValid) return "border-[#119933]";
    if (hasNameValue) return "border-[#FF9900]";
    return "border-red-500";
  };
  const getGenderBorderColor = () => {
    if (isGenderFocused) return "border-[#1162A8]";
    if (genderRequired && !isGenderValid) return "border-red-500";
    if (isGenderValid) return "border-[#119933]";
    return "border-[#7F7F7F]";
  };
  const getNameLabelColor = () => {
    if (isNameValid) return "text-[#119933]";
    if (hasNameValue) return "text-[#FF9900]";
    return "text-red-500";
  };
  const getGenderLabelColor = () => {
    if (isGenderFocused) return "text-[#1162A8]";
    if (genderRequired && !isGenderValid) return "text-red-500";
    if (isGenderValid) return "text-[#119933]";
    return "text-[#7F7F7F]";
  };
  const getNameLabel = () => getPatientNameFieldLabel(name);

  const getNameRingEffect = () => {
    if (!isNameFocused) return "";
    if (isNameValid) return "ring-2 ring-[#119933] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,153,51,0.15)]";
    if (hasNameValue) return "ring-2 ring-[#FF9900] ring-opacity-20 shadow-[0_0_0_4px_rgba(255,153,0,0.15)]";
    return "ring-2 ring-red-500 ring-opacity-20 shadow-[0_0_0_4px_rgba(239,68,68,0.15)]";
  };
  const getGenderRingEffect = () => {
    if (isGenderFocused && isGenderValid) return "ring-2 ring-[#119933] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,153,51,0.15)]";
    if (isGenderFocused) return "ring-2 ring-[#1162A8] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,98,168,0.15)]";
    if (genderRequired && !isGenderValid) return "ring-2 ring-red-500 ring-opacity-20 shadow-[0_0_0_4px_rgba(239,68,68,0.15)]";
    return "";
  };

  const fieldWidth = 330;
  const fieldHeight = 36.95;
  const fieldGap = 10;
  const containerHeight = showGenderField
    ? 10 + fieldHeight + fieldGap + fieldHeight + 10
    : 10 + fieldHeight + 10;

  return (
    <div className="flex-1 flex flex-col px-3 sm:px-6 py-4 sm:py-6">
      {/* ── Desktop layout: doctor + fields (left) | created by (right) ── */}
      <div className="hidden sm:flex flex-row items-start justify-between">
        <div className="flex flex-row items-start gap-5">
          {doctor && (
            <div className="flex flex-col items-center gap-1">
              <div className="w-[70px] h-[70px] sm:w-[130px] sm:h-[130px] rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
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
              <p className="text-[18px] font-medium text-[#1d1d1b] whitespace-nowrap">{doctor.name}</p>
            </div>
          )}

          <div className="relative w-auto" style={{ maxWidth: `${fieldWidth}px`, minWidth: "200px", height: `${containerHeight}px` }}>
            <div className="absolute left-0" style={{ top: 10, width: `${fieldWidth}px`, height: `${fieldHeight}px` }}>
              <div className="relative w-full h-full">
                <input
                  ref={patientNameDesktopRef}
                  type="text"
                  value={name}
                  readOnly={genderKeyboardActive}
                  tabIndex={genderKeyboardActive ? -1 : undefined}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onFocus={() => {
                    genderKeyboardActiveRef.current = false;
                    setGenderKeyboardActive(false);
                    setIsNameFocused(true);
                  }}
                  onBlur={() => setIsNameFocused(false)}
                  onKeyDown={handlePatientNameKeyDown}
                  className={cn(
                    "w-full h-full box-border flex items-center bg-white border border-solid rounded-[7.7px] text-[#1F2937] focus:outline-none transition-all ease-out",
                    getNameBorderColor(),
                    getNameRingEffect(),
                    !isNameFocused && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)]"
                  )}
                  style={{ padding: "25px 30.8px 9.24px 12.32px", borderWidth: "0.740384px", fontFamily: "Arial", fontSize: "17px", lineHeight: "18px" }}
                />
                <label className={cn("absolute bg-white pointer-events-none transition-all text-[#7F7F7F]", getNameLabelColor())} style={{ left: "9.23px", top: "-6.15px", fontFamily: "Arial", fontWeight: 400, fontSize: "14px", lineHeight: "14px" }}>
                  {getNameLabel()}
                </label>
                {isNameValid && (
                  <div className="absolute right-[12.32px] top-1/2 -translate-y-1/2"><Check className="h-5 w-5 text-[#119933]" aria-label="Valid" /></div>
                )}
              </div>
            </div>

            {showGenderField && (
              <div className="absolute left-0" style={{ top: 10 + fieldHeight + fieldGap, width: `${fieldWidth}px`, height: `${fieldHeight}px` }}>
                <div className="relative w-full h-full">
                  <div
                    ref={genderTriggerRef}
                    role="combobox"
                    aria-expanded={isGenderFocused}
                    aria-haspopup="listbox"
                    aria-label="Gender"
                    tabIndex={0}
                    className={cn(
                      "w-full h-full box-border flex items-center justify-between bg-white border border-solid rounded-[7.7px] text-[#1F2937] cursor-pointer transition-all focus:outline-none",
                      getGenderBorderColor(),
                      getGenderRingEffect(),
                      !isGenderFocused && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)]"
                    )}
                    style={{ padding: "25px 30.8px 9.24px 12.32px", borderWidth: "0.740384px", fontFamily: "Arial", fontSize: "17px", lineHeight: "18px" }}
                    onFocus={() => setIsGenderFocused(true)}
                    onKeyDown={handleGenderKeyDown}
                    onClick={() => { if (!isGenderFocused) { setIsGenderFocused(true); setHighlightedGenderIndex(0); setTimeout(() => focusPatientInput(), 50); } }}
                  >
                    {isGenderValid && <span style={{ fontFamily: "Arial", fontSize: "17px", lineHeight: "18px" }}>{getGenderDisplay(gender)}</span>}
                    <ChevronDown className={cn("h-4 w-4 text-[#7F7F7F] transition-transform", isGenderFocused && "rotate-180")} />
                  </div>
                  {isGenderFocused && (
                    <div role="listbox" aria-label="Gender options" className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-[7.7px] shadow-lg z-50 overflow-hidden">
                      {genderOptions.map((option, index) => (
                        <div
                          key={option}
                          role="option"
                          aria-selected={highlightedGenderIndex === index}
                          className={cn(
                            "px-2.5 py-1.5 hover:bg-[#DFEEFB] cursor-pointer text-[#1F2937]",
                            highlightedGenderIndex === index && "bg-[#DFEEFB]"
                          )}
                          style={{ fontFamily: "Arial", fontSize: "14px", lineHeight: "16px" }}
                          onMouseEnter={() => setHighlightedGenderIndex(index)}
                          onClick={() => handleGenderSelect(option)}
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                  )}
                  <label className={cn("absolute bg-white pointer-events-none z-10 transition-all text-[#7F7F7F]", getGenderLabelColor())} style={{ left: "9.23px", top: "-6.15px", fontFamily: "Arial", fontWeight: 400, fontSize: "14px", lineHeight: "14px" }}>{isGenderValid ? "Gender" : "Select Gender"}</label>
                  {isGenderValid && (
                    <div className="absolute right-[12.32px] top-1/2 -translate-y-1/2 z-20 pointer-events-none"><Check className="h-5 w-5 text-[#119933]" aria-label="Valid" /></div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center items-center gap-2 sm:gap-[15px] w-auto sm:w-[170px] flex-shrink-0">
          <div className="w-[50px] h-[50px] sm:w-[72.74px] sm:h-[72.74px] rounded-full overflow-hidden flex-shrink-0 bg-gray-200 flex items-center justify-center">
            {createdByImage ? (
              <img src={createdByImage} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/images/created-by.png"; }} alt="Creator" className="w-full h-full object-cover" />
            ) : (
              <span className="text-base sm:text-xl font-bold text-gray-500">{createdByName.split(" ").map(n => n[0]).join("").toUpperCase()}</span>
            )}
          </div>
          <fieldset className="w-auto sm:w-[170px] h-[34px] sm:h-[38px] border border-[#7f7f7f] rounded-[7px] bg-white px-2 sm:px-[11.2px] py-0 flex items-center">
            <legend className="text-[12px] sm:text-[14px] text-[#7f7f7f] px-1 leading-none">Created By</legend>
            <span className="text-[14px] sm:text-[18px] leading-[20px] text-[#000000] whitespace-nowrap">{createdByName || "—"}</span>
          </fieldset>
        </div>
      </div>

      {/* ── Mobile layout: 4 stacked rows, all centered ── */}
      <div className="flex sm:hidden flex-col items-center gap-3">
        {/* Row 1: Doctor avatar + name */}
        {doctor && (
          <div className="flex flex-col items-center gap-1">
            <div className="w-[90px] h-[90px] rounded-full overflow-hidden border-2 border-[#d9d9d9] bg-[#eef1f4]">
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
            <span className="text-[13px] font-semibold text-[#1d1d1b]">{doctor.name}</span>
          </div>
        )}

        {/* Row 2: Patient name + gender fields (full width) */}
        <div className="w-full relative" style={{ height: `${containerHeight}px` }}>
          <div className="absolute left-0 right-0" style={{ top: 10, height: `${fieldHeight}px` }}>
            <div className="relative w-full h-full">
              <input
                ref={patientNameInputRef}
                type="text"
                value={name}
                readOnly={genderKeyboardActive}
                tabIndex={genderKeyboardActive ? -1 : undefined}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => {
                  genderKeyboardActiveRef.current = false;
                  setGenderKeyboardActive(false);
                  setIsNameFocused(true);
                }}
                onBlur={() => setIsNameFocused(false)}
                onKeyDown={handlePatientNameKeyDown}
                className={cn(
                  "w-full h-full box-border flex items-center bg-white border border-solid rounded-[7.7px] text-[#1F2937] focus:outline-none transition-all ease-out",
                  getNameBorderColor(),
                  getNameRingEffect(),
                  !isNameFocused && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)]"
                )}
                style={{ padding: "25px 30.8px 9.24px 12.32px", borderWidth: "0.740384px", fontFamily: "Arial", fontSize: "15px", lineHeight: "18px" }}
              />
              <label className={cn("absolute bg-white pointer-events-none transition-all text-[#7F7F7F]", getNameLabelColor())} style={{ left: "9.23px", top: "-6.15px", fontFamily: "Arial", fontWeight: 400, fontSize: "13px", lineHeight: "14px" }}>
                {getNameLabel()}
              </label>
              {isNameValid && (
                <div className="absolute right-[12.32px] top-1/2 -translate-y-1/2"><Check className="h-5 w-5 text-[#119933]" aria-label="Valid" /></div>
              )}
            </div>
          </div>

          {showGenderField && (
            <div className="absolute left-0 right-0" style={{ top: 10 + fieldHeight + fieldGap, height: `${fieldHeight}px` }}>
              <div className="relative w-full h-full">
                <div
                  ref={genderTriggerRef}
                  role="combobox"
                  aria-expanded={isGenderFocused}
                  aria-haspopup="listbox"
                  aria-label="Gender"
                  tabIndex={0}
                  className={cn(
                    "w-full h-full box-border flex items-center justify-between bg-white border border-solid rounded-[7.7px] text-[#1F2937] cursor-pointer transition-all focus:outline-none",
                    getGenderBorderColor(),
                    getGenderRingEffect(),
                    !isGenderFocused && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)]"
                  )}
                  style={{ padding: "25px 30.8px 9.24px 12.32px", borderWidth: "0.740384px", fontFamily: "Arial", fontSize: "15px", lineHeight: "18px" }}
                  onFocus={() => setIsGenderFocused(true)}
                  onKeyDown={handleGenderKeyDown}
                  onClick={() => { if (!isGenderFocused) { setIsGenderFocused(true); setHighlightedGenderIndex(0); setTimeout(() => focusPatientInput(), 50); } }}
                >
                  {isGenderValid && <span style={{ fontFamily: "Arial", fontSize: "15px", lineHeight: "18px" }}>{getGenderDisplay(gender)}</span>}
                  <ChevronDown className={cn("h-4 w-4 text-[#7F7F7F] transition-transform", isGenderFocused && "rotate-180")} />
                </div>
                {isGenderFocused && (
                  <div role="listbox" aria-label="Gender options" className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-[7.7px] shadow-lg z-50 overflow-hidden">
                    {genderOptions.map((option, index) => (
                      <div
                        key={option}
                        role="option"
                        aria-selected={highlightedGenderIndex === index}
                        className={cn(
                          "px-2.5 py-1.5 hover:bg-[#DFEEFB] cursor-pointer text-[#1F2937]",
                          highlightedGenderIndex === index && "bg-[#DFEEFB]"
                        )}
                        style={{ fontFamily: "Arial", fontSize: "14px", lineHeight: "16px" }}
                        onMouseEnter={() => setHighlightedGenderIndex(index)}
                        onClick={() => handleGenderSelect(option)}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}
                <label className={cn("absolute bg-white pointer-events-none z-10 transition-all text-[#7F7F7F]", getGenderLabelColor())} style={{ left: "9.23px", top: "-6.15px", fontFamily: "Arial", fontWeight: 400, fontSize: "13px", lineHeight: "14px" }}>{isGenderValid ? "Gender" : "Select Gender"}</label>
                {isGenderValid && (
                  <div className="absolute right-[12.32px] top-1/2 -translate-y-1/2 z-20 pointer-events-none"><Check className="h-5 w-5 text-[#119933]" aria-label="Valid" /></div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Row 3: Created By avatar */}
        <div className="w-[90px] h-[90px] rounded-full overflow-hidden border-2 border-[#d9d9d9] bg-gray-200 flex items-center justify-center">
          {createdByImage ? (
            <img src={createdByImage} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/images/created-by.png"; }} alt="Creator" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-gray-500">{createdByName.split(" ").map(n => n[0]).join("").toUpperCase()}</span>
          )}
        </div>

        {/* Row 4: Created By field */}
        <fieldset className="border border-[#b4b0b0] rounded px-3 pb-1 pt-0 relative">
          <legend className="text-[10px] text-[#7f7f7f] px-1 leading-none">Created By</legend>
          <span className="text-[12px] text-[#1d1d1b] whitespace-nowrap">{createdByName || "—"}</span>
        </fieldset>
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
  age,
  isLoading,
  error,
  onPatientNameChange,
  onGenderChange,
  onAgeChange,
  fieldSettings,
  patientInfoComplete = true,
  productSearch,
  onProductSearchChange,
  searchResults,
  isSearchingProducts,
  onSearchProductSelect,
}: {
  categories: { id: number; name: string; img: string }[];
  selected: number | null;
  onSelect: (id: number) => void;
  doctor: WizardDoctorShape | undefined;
  patientName: string;
  gender: string;
  age?: string;
  isLoading?: boolean;
  error?: Error | null;
  onPatientNameChange?: (value: string) => void;
  onGenderChange?: (value: string) => void;
  onAgeChange?: (value: string) => void;
  fieldSettings?: WizardPatientFieldSettings;
  /** When false, category selection is blocked until required patient fields are filled. */
  patientInfoComplete?: boolean;
} & ProductSearchProps) {
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
        <PatientMiniHeader doctor={doctor} patientName={patientName} gender={gender} age={age} onPatientNameChange={onPatientNameChange} onGenderChange={onGenderChange} onAgeChange={onAgeChange} fieldSettings={fieldSettings} />
        <CaseDesignCenterToolbar
          productSearch={productSearch}
          onProductSearchChange={onProductSearchChange}
          showSearch={false}
        />
        <div className={PRODUCT_CARD_GRID_CLASS}>
          {Array.from({ length: PRODUCT_CARD_SKELETON_COUNT }, (_, i) => (
            <ProductPickerCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col px-6 py-4">
      <PatientMiniHeader
        doctor={doctor}
        patientName={patientName}
        gender={gender}
        age={age}
        onPatientNameChange={onPatientNameChange}
        onGenderChange={onGenderChange}
        onAgeChange={onAgeChange}
        fieldSettings={fieldSettings}
      />

      {/* Case design center is revealed only once required patient details are filled */}
      {patientInfoComplete && (
        <>
          <CaseDesignCenterToolbar
            productSearch={productSearch}
            onProductSearchChange={onProductSearchChange}
          />

          <ProductSearchResults
            productSearch={productSearch}
            searchResults={searchResults}
            isSearchingProducts={isSearchingProducts}
            onSearchProductSelect={onSearchProductSelect}
          />

          {!productSearch.trim() && (
          <div className={PRODUCT_CARD_GRID_CLASS}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id)}
                className={cn(productPickerCardClass(selected === cat.id), PRODUCT_CARD_ITEM_CLASS)}
              >
                <ProductPickerCardLabel>{cat.name}</ProductPickerCardLabel>
                <ProductImageWithFallback src={cat.img} alt={cat.name} name={cat.name} className="rounded-none" bgClassName="" />
              </button>
            ))}
          </div>
          )}
        </>
      )}
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
  age,
  onPatientNameChange,
  onGenderChange,
  onAgeChange,
  fieldSettings,
  archPopoverSubId,
  setArchPopoverSubId,
  subcategoryProductCounts,
  subcategoryProducts,
  onArchPickForSingle,
  productSearch,
  onProductSearchChange,
  searchResults,
  isSearchingProducts,
  onSearchProductSelect,
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
  age?: string;
  onPatientNameChange?: (value: string) => void;
  onGenderChange?: (value: string) => void;
  onAgeChange?: (value: string) => void;
  fieldSettings?: WizardPatientFieldSettings;
  archPopoverSubId: number | null;
  setArchPopoverSubId: (id: number | null) => void;
  subcategoryProductCounts?: Record<number, number | undefined>;
  subcategoryProducts?: Record<number, LibraryProductApi[] | undefined>;
  onArchPickForSingle?: (subcatId: number, arch: "maxillary" | "mandibular" | "both") => void;
} & ProductSearchProps) {
  const [activeSubLabelHeight, setActiveSubLabelHeight] = useState(0);
  const subCardRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const subLabelRefs = useRef<Record<number, HTMLSpanElement | null>>({});
  const subPopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!archPopoverSubId) return;
    const handler = (e: MouseEvent) => {
      if (subPopoverRef.current && !subPopoverRef.current.contains(e.target as Node)) {
        const cardEl = subCardRefs.current[archPopoverSubId];
        if (cardEl && cardEl.contains(e.target as Node)) return;
        setArchPopoverSubId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [archPopoverSubId]);

  useEffect(() => {
    if (archPopoverSubId === null) {
      setActiveSubLabelHeight(0);
      return;
    }

    const labelEl = subLabelRefs.current[archPopoverSubId];
    if (!labelEl) return;

    const updateLabelHeight = () => {
      setActiveSubLabelHeight(labelEl.getBoundingClientRect().height);
    };

    updateLabelHeight();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateLabelHeight);
    observer.observe(labelEl);

    return () => observer.disconnect();
  }, [archPopoverSubId, subProducts]);

  return (
    <div className="flex-1 flex flex-col px-6 py-4">
      <PatientMiniHeader
        doctor={doctor}
        patientName={patientName}
        gender={gender}
        age={age}
        onPatientNameChange={onPatientNameChange}
        onGenderChange={onGenderChange}
        onAgeChange={onAgeChange}
        fieldSettings={fieldSettings}
      />

      <CaseDesignCenterToolbar
        onBack={onBack}
        productSearch={productSearch}
        onProductSearchChange={onProductSearchChange}
      />

      <ProductSearchResults
        productSearch={productSearch}
        searchResults={searchResults}
        isSearchingProducts={isSearchingProducts}
        onSearchProductSelect={onSearchProductSelect}
      />

      {!productSearch.trim() && (
      <div className={PRODUCT_CARD_GRID_CLASS}>
        {subProducts.map((prod) => (
          <div key={prod.id} className={cn("relative", PRODUCT_CARD_ITEM_CLASS)}>
            <button
              ref={(el) => { subCardRefs.current[prod.id] = el; }}
              onClick={() => {
                const isSingle = subcategoryProductCounts?.[prod.id] === 1;
                if (onArchPickForSingle && isSingle) {
                  if (archPopoverSubId === prod.id) {
                    setArchPopoverSubId(null);
                  } else {
                    setActiveSubLabelHeight(subLabelRefs.current[prod.id]?.getBoundingClientRect().height ?? 0);
                    setArchPopoverSubId(prod.id);
                  }
                } else {
                  onSelect(prod.id);
                }
              }}
              className={productPickerCardClass(selected === prod.id)}
            >
              <ProductPickerCardLabel ref={(el) => { subLabelRefs.current[prod.id] = el; }}>
                {prod.name}
              </ProductPickerCardLabel>
              <ProductImageWithFallback src={prod.img} alt={prod.name} name={prod.name} className="rounded-none" bgClassName="" />
            </button>
            {archPopoverSubId === prod.id && onArchPickForSingle && (() => {
              const singleProduct = subcategoryProducts?.[prod.id]?.[0];
              const useJawPhotos = singleProduct?.show_jaw_photo === "Yes";
              const jawPhotos = singleProduct?.jaw_photos ?? {};
              const fallbackImg = prod.img ?? null;
              const archOptions = [
                { label: "Upper only", value: "maxillary" as const, img: useJawPhotos ? (jawPhotos.upper ?? fallbackImg) : fallbackImg },
                { label: "Both", value: "both" as const, img: useJawPhotos ? (jawPhotos.both ?? fallbackImg) : fallbackImg },
                { label: "Lower only", value: "mandibular" as const, img: useJawPhotos ? (jawPhotos.lower ?? fallbackImg) : fallbackImg },
              ];
              const popoverInsets = getJawSelectionPopoverInsets(activeSubLabelHeight);
              return (
                <div
                  ref={subPopoverRef}
                  className="absolute z-20 overflow-hidden rounded-b-[7px] bg-black"
                  style={popoverInsets}
                >
                  <div className="flex h-full flex-col">
                    {archOptions.map((option, i) => (
                      <button
                        key={option.value}
                        className={`group flex min-h-0 flex-1 flex-row overflow-hidden ${i < archOptions.length - 1 ? "border-b border-gray-700" : ""}`}
                        onClick={() => {
                          setArchPopoverSubId(null);
                          onArchPickForSingle(prod.id, option.value);
                        }}
                      >
                        <div className="h-full w-[55%] flex-shrink-0 overflow-hidden">
                          {option.img ? (
                            <img src={option.img} alt={option.label} className="block h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[#111]">
                              <span className="text-xl font-bold text-gray-600">{prod.name.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 items-center justify-center bg-black px-2 transition-colors group-hover:bg-[#1162A8]">
                          <span
                            style={{ fontFamily: "Verdana, sans-serif", fontSize: 12 }}
                            className="text-center font-semibold text-white"
                          >
                            {option.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        ))}
      </div>
      )}
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
  forceArch,
  onPatientNameChange,
  onGenderChange,
  age,
  onAgeChange,
  fieldSettings,
  productSearch,
  onProductSearchChange,
  searchResults,
  isSearchingProducts,
  onSearchProductSelect,
  initialArchPopoverProductId = null,
}: {
  subProductName: string;
  products: { id: number; name: string; img: string; arch_images?: { maxillary?: string | null; both?: string | null; mandibular?: string | null }; show_jaw_photo?: boolean; jaw_photos?: { upper?: string | null; lower?: string | null; both?: string | null } }[];
  selected: string | null;
  onSelect: (id: string, arch?: "maxillary" | "mandibular" | "both") => void;
  onBack?: () => void;
  doctor: WizardDoctorShape | undefined;
  patientName: string;
  gender: string;
  age?: string;
  isLoading?: boolean;
  error?: Error | null;
  isRemovableRestoration?: boolean;
  forceArch?: "maxillary" | "mandibular";
  onPatientNameChange?: (value: string) => void;
  onGenderChange?: (value: string) => void;
  onAgeChange?: (value: string) => void;
  fieldSettings?: WizardPatientFieldSettings;
  initialArchPopoverProductId?: string | null;
} & ProductSearchProps) {
  const [archPopoverProductId, setArchPopoverProductId] = useState<string | null>(null);
  const [activeProductLabelHeight, setActiveProductLabelHeight] = useState(0);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const labelRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const prodPopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!archPopoverProductId) return;
    const handler = (e: MouseEvent) => {
      if (prodPopoverRef.current && !prodPopoverRef.current.contains(e.target as Node)) {
        const cardEl = cardRefs.current[archPopoverProductId];
        if (cardEl && cardEl.contains(e.target as Node)) return;
        setArchPopoverProductId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [archPopoverProductId]);

  useEffect(() => {
    if (archPopoverProductId === null) {
      setActiveProductLabelHeight(0);
      return;
    }

    const labelEl = labelRefs.current[archPopoverProductId];
    if (!labelEl) return;

    const updateLabelHeight = () => {
      setActiveProductLabelHeight(labelEl.getBoundingClientRect().height);
    };

    updateLabelHeight();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateLabelHeight);
    observer.observe(labelEl);

    return () => observer.disconnect();
  }, [archPopoverProductId, products]);

  useEffect(() => {
    if (
      products.length === 1 &&
      !selected &&
      (!isRemovableRestoration || forceArch) &&
      !isLoading
    ) {
      const only = products[0];
      onSelect(String(only.id), forceArch);
    }
  }, [products, selected, isRemovableRestoration, forceArch, isLoading, onSelect]);

  useEffect(() => {
    if (products.length <= 1 && archPopoverProductId) {
      setArchPopoverProductId(null);
    }
  }, [products.length, archPopoverProductId]);

  useEffect(() => {
    if (!initialArchPopoverProductId || isLoading) return;
    setArchPopoverProductId(initialArchPopoverProductId);
  }, [initialArchPopoverProductId, isLoading]);

  const shouldAutoSelectSingle = products.length === 1 && (!isRemovableRestoration || forceArch);
  const shouldAskArchOnly = products.length === 1 && isRemovableRestoration && !forceArch && !isLoading;

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
        <PatientMiniHeader doctor={doctor} patientName={patientName} gender={gender} age={age} onPatientNameChange={onPatientNameChange} onGenderChange={onGenderChange} onAgeChange={onAgeChange} fieldSettings={fieldSettings} />
        <CaseDesignCenterToolbar
          onBack={onBack}
          productSearch={productSearch}
          onProductSearchChange={onProductSearchChange}
          showSearch={false}
        />
        <div className={PRODUCT_CARD_GRID_CLASS}>
          {Array.from({ length: PRODUCT_CARD_SKELETON_COUNT }, (_, i) => (
            <ProductPickerCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-4">
      <PatientMiniHeader
        doctor={doctor}
        patientName={patientName}
        gender={gender}
        age={age}
        onPatientNameChange={onPatientNameChange}
        onGenderChange={onGenderChange}
        onAgeChange={onAgeChange}
        fieldSettings={fieldSettings}
      />

      <CaseDesignCenterToolbar
        onBack={onBack}
        productSearch={productSearch}
        onProductSearchChange={onProductSearchChange}
      />

      <ProductSearchResults
        productSearch={productSearch}
        searchResults={searchResults}
        isSearchingProducts={isSearchingProducts}
        onSearchProductSelect={onSearchProductSelect}
      />

      {!productSearch.trim() && (
      <>
      {/* Single removable product with no forced arch: show arch picker without product grid */}
      {shouldAskArchOnly && (
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="bg-white rounded-xl shadow-lg border border-[#E5E7EB] overflow-hidden min-w-[220px]">
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
                    const only = products[0];
                    onSelect(String(only.id), option.value);
                  }}
                >
                  {option.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!shouldAutoSelectSingle && !shouldAskArchOnly && (
        <div className={PRODUCT_CARD_GRID_CLASS}>
          {products.map((prod) => {
            const prodId = String(prod.id);
            const isSelected = selected === prodId;
            return (
              <div key={prod.id} className={cn("relative", PRODUCT_CARD_ITEM_CLASS)}>
                <button
                  ref={(el) => { cardRefs.current[prodId] = el; }}
                  onClick={() => {
                    if (!isRemovableRestoration || forceArch) {
                      onSelect(prodId, forceArch);
                    } else {
                      if (archPopoverProductId === prodId) {
                        setArchPopoverProductId(null);
                      } else {
                        setActiveProductLabelHeight(labelRefs.current[prodId]?.getBoundingClientRect().height ?? 0);
                        setArchPopoverProductId(prodId);
                      }
                    }
                  }}
                  className={productPickerCardClass(isSelected, "relative items-center")}
                >
                  <ProductPickerCardLabel ref={(el) => { labelRefs.current[prodId] = el; }}>
                    {prod.name}
                  </ProductPickerCardLabel>
                  <ProductImageWithFallback src={prod.img} alt={prod.name} name={prod.name} className="rounded-none" bgClassName="bg-[#080808]" textClassName="text-[#b4b0b0]" />
                </button>
                  {archPopoverProductId === prodId && (() => {
                    const archImages = prod.arch_images ?? {};
                    const jawPhotos = prod.jaw_photos ?? {};
                    const useJawPhotos = prod.show_jaw_photo === true;
                    const archOptions = [
                      { label: "Upper only", value: "maxillary" as const, img: useJawPhotos ? (jawPhotos.upper ?? prod.img ?? null) : (archImages.maxillary ?? prod.img ?? null) },
                      { label: "Both", value: "both" as const, img: useJawPhotos ? (jawPhotos.both ?? prod.img ?? null) : (archImages.both ?? prod.img ?? null) },
                      { label: "Lower only", value: "mandibular" as const, img: useJawPhotos ? (jawPhotos.lower ?? prod.img ?? null) : (archImages.mandibular ?? prod.img ?? null) },
                    ];
                    const popoverInsets = getJawSelectionPopoverInsets(activeProductLabelHeight);
                    return (
                      <div
                        ref={prodPopoverRef}
                        className="absolute z-20 overflow-hidden rounded-b-[7px] bg-black"
                        style={popoverInsets}
                      >
                        <div className="flex h-full flex-col">
                          {archOptions.map((option, i) => (
                            <button
                              key={option.value}
                              className={`group flex min-h-0 flex-1 flex-row overflow-hidden ${i < archOptions.length - 1 ? "border-b border-gray-700" : ""}`}
                              onClick={() => {
                                setArchPopoverProductId(null);
                                onSelect(prodId, option.value);
                              }}
                            >
                              <div className="h-full w-[55%] flex-shrink-0 overflow-hidden">
                                {option.img ? (
                                  <img src={option.img} alt={option.label} className="block h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-[#111]">
                                    <span className="text-xl font-bold text-gray-600">{prod.name.charAt(0).toUpperCase()}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-1 items-center justify-center bg-black px-2 transition-colors group-hover:bg-[#1162A8]">
                                <span
                                  style={{ fontFamily: "Verdana, sans-serif", fontSize: 12 }}
                                  className="text-center font-semibold text-white"
                                >
                                  {option.label}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
              </div>
            );
          })}
        </div>
      )}

      </>
      )}

      {/* Arch hint when adding product to a specific arch */}
      {forceArch && (
        <p className="text-center text-[13px] text-[#7f7f7f] mb-4 hidden" style={{ fontFamily: "Verdana, sans-serif" }}>
          This product will be added to the <span className="font-semibold text-[#1162A8]">{forceArch === "maxillary" ? "upper (maxillary)" : "lower (mandibular)"}</span> arch
        </p>
      )}

      {/* Breadcrumb bar showing category > sub-product */}
      <div className="max-w-[600px] mx-auto w-full hidden">
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
  age,
  onPatientNameChange,
  onGenderChange,
  onAgeChange,
  fieldSettings = DEFAULT_WIZARD_FIELD_SETTINGS,
}: {
  doctor: WizardDoctorShape | undefined;
  patientName: string;
  gender: string;
  age?: string;
  onPatientNameChange?: (value: string) => void;
  onGenderChange?: (value: string) => void;
  onAgeChange?: (value: string) => void;
  fieldSettings?: WizardPatientFieldSettings;
}) {
  const { showGender, showAge, genderRequired, ageRequired } = fieldSettings;
  const { createdByName, createdByImageUrl: createdByImage } = useCreatedByUser();
  const ageInputRef = useRef<HTMLInputElement>(null);

  // After gender is selected (or on entry with gender already set), move focus
  // to the age field when age is shown and still empty.
  const focusAge = useCallback(() => {
    if (showAge) {
      setTimeout(() => ageInputRef.current?.focus(), 50);
    }
  }, [showAge]);

  const handleGenderChange = useCallback(
    (value: string) => {
      onGenderChange?.(value);
      focusAge();
    },
    [onGenderChange, focusAge]
  );

  useEffect(() => {
    if (showAge && gender && !(age ?? "").trim()) {
      focusAge();
    }
    // Only on mount — auto-focus age when arriving with gender already chosen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white border-b border-[#d9d9d9] px-4 sm:px-6 py-1 -mx-6 -mt-4 mb-4">
      <div className="flex flex-col lg:flex-row items-center gap-2 lg:gap-4">
        {/* Doctor photo + name */}
        {doctor && (
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-[40px] h-[40px] sm:w-[50px] sm:h-[50px] hover:w-[70px] hover:h-[70px] sm:hover:w-[100px] sm:hover:h-[100px] transition-all duration-300 ease-in-out cursor-pointer rounded-full overflow-hidden bg-gray-200 flex items-center justify-center relative">
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
            <p className="text-[18px] font-medium text-[#1d1d1b] whitespace-nowrap">
              {doctor.name}
            </p>
          </div>
        )}

        {/* Form fields — Patient name row 1, Gender + Age row 2 (same total width as patient name) */}
        <div className="flex-1 w-full lg:w-auto flex flex-col gap-3 justify-center lg:justify-start">
          <div className="flex gap-3 sm:gap-4 items-start justify-center lg:justify-start">
            <FieldInput label="Patient name" value={patientName} onChange={onPatientNameChange} className="w-[330px]" smartPatientLabel />
          </div>
          {(showGender || showAge) && (
            <div className="flex gap-3 sm:gap-4 items-start justify-center lg:justify-start w-[330px]">
              {showGender && (
                onGenderChange ? (
                  <SelectField
                    label="Gender"
                    value={gender}
                    options={["Male", "Female"]}
                    onChange={handleGenderChange}
                    caseSubmitted={false}
                    optional={!genderRequired}
                    className="flex-1"
                  />
                ) : (
                  <FieldInput label="Gender" value={gender} submitted={false} className="flex-1" />
                )
              )}
              {showAge && (
                <FieldInput
                  label="Age"
                  value={age ?? ""}
                  submitted={false}
                  onChange={onAgeChange}
                  className="flex-1"
                  type="number"
                  required={ageRequired}
                  inputRef={ageInputRef}
                />
              )}
            </div>
          )}
        </div>

        {/* Created By */}
        <div className="flex flex-col justify-center items-center gap-2 sm:gap-[15px] w-auto sm:w-[170px] flex-shrink-0 lg:ml-2">
          <div className="w-[50px] h-[50px] sm:w-[72.74px] sm:h-[72.74px] rounded-full overflow-hidden flex-shrink-0 bg-gray-200 flex items-center justify-center">
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
              <span className="text-base sm:text-xl font-bold text-gray-500">
                {createdByName.split(" ").map(n => n[0]).join("").toUpperCase()}
              </span>
            )}
          </div>
          <fieldset className="w-auto sm:w-[170px] h-[34px] sm:h-[38px] border border-[#7f7f7f] rounded-[7px] bg-white px-2 sm:px-[11.2px] py-0 flex items-center">
            <legend className="text-[12px] sm:text-[14px] text-[#7f7f7f] px-1 leading-none">
              Created By
            </legend>
            <span className="text-[14px] sm:text-[18px] leading-[20px] text-[#000000] whitespace-nowrap">
              {createdByName || "—"}
            </span>
          </fieldset>
        </div>
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
  initialAge = "",
  initialDoctor = undefined,
  initialCategory = null,
  initialSubProduct = null,
  forceArch,
  editTarget,
  onEditDone,
}: {
  onComplete: (result: WizardResult) => void;
  onLabSelect?: (lab: WizardLabShape) => void;
  startStep?: number;
  mode?: "initial" | "addProduct";
  initialLabId?: number | null;
  initialPatientName?: string;
  initialGender?: string;
  initialAge?: string;
  initialDoctor?: WizardDoctorShape;
  initialCategory?: number | null;
  initialSubProduct?: number | null;
  forceArch?: "maxillary" | "mandibular";
  /** When set, the wizard is in single-step edit mode — selecting the target completes immediately via onEditDone. */
  editTarget?: "lab" | "doctor";
  /** Called when a single-step edit selection is made (used with editTarget). */
  onEditDone?: () => void;
}) {
  const [step, setStep] = useState(startStep);
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(initialDoctor?.id ?? null);
  const [selectedLab, setSelectedLab] = useState<number | null>(initialLabId);
  const [patientName, setPatientName] = useState(initialPatientName);
  const [gender, setGender] = useState(initialGender);
  const [age, setAge] = useState(initialAge);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(initialCategory);
  const [selectedSubProduct, setSelectedSubProduct] = useState<number | null>(initialSubProduct);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [selectedArch, setSelectedArch] = useState<"maxillary" | "mandibular" | "both" | undefined>(forceArch);
  const [archPopoverSubId, setArchPopoverSubId] = useState<number | null>(null);
  const [shouldAutoAdvanceProducts, setShouldAutoAdvanceProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [pendingArchProductId, setPendingArchProductId] = useState<string | null>(null);
  const debouncedProductSearch = useDebounce(productSearch, 300);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAddLabModal, setShowAddLabModal] = useState(false);
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { role, customerId, isOfficeAdmin, isLabAdmin } = useWizardRole();
  const { officesAsLabs, isLoading: labsLoading, error: labsError, refetch } = useConnectedOfficesOrLabs(role);
  const lab = officesAsLabs.find((l) => l.id === selectedLab);

  // customer_id for library/categories: office_admin = selected lab id, lab_admin = their customerId
  const customerIdForCategories = useMemo(() => {
    if (isOfficeAdmin && selectedLab != null) return selectedLab;
    if ((isLabAdmin || role) && customerId != null) return customerId;
    return undefined;
  }, [isOfficeAdmin, isLabAdmin, role, customerId, selectedLab]);

  // Slip-settings-driven patient field visibility/requiredness (shared by steps)
  const patientFieldSettings = usePatientFieldSettings(customerIdForCategories ?? undefined);

  // All shown + required patient fields satisfied. Age (when required) is only
  // collected in the mini header on the category step, so it gates category
  // selection rather than the step-3 Next button.
  const patientInfoComplete =
    isValidPatientName(patientName) &&
    (!patientFieldSettings.genderRequired || Boolean(gender)) &&
    (!patientFieldSettings.ageRequired || Boolean(age));

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
    enabled: step >= 5 && selectedSubProduct != null,
  });

  const {
    products: productSearchResults,
    isLoading: isSearchingProducts,
  } = useLibraryProductSearch({
    customerId: customerIdForCategories,
    search: debouncedProductSearch,
    enabled: step >= 4 && patientInfoComplete,
  });

  // Product counts per subcategory — used to show arch popover only for single-product subcategories
  const currentSubcategoryIds = useMemo(
    () => (subcategoriesByCategoryId[selectedCategory ?? -1] ?? []).map((s) => s.id),
    [subcategoriesByCategoryId, selectedCategory]
  );
  const { counts: subcategoryProductCounts, products: subcategoryProducts } = useSubcategoryProductCounts({
    customerId: customerIdForCategories,
    subcategoryIds: currentSubcategoryIds,
    enabled: step === 5 && selectedCategory != null,
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
    refetch: refetchDoctors,
  } = useOfficeDoctors(officeIdForDoctors);

  const doctorsForWizard: WizardDoctorShape[] = useMemo(
    () =>
      (officeDoctorsRaw as { id: number; first_name?: string; last_name?: string; image?: string; profile_image?: string; signature_url?: string }[]).map(
        (d, i) => ({
          id: d.id,
          name: [d.first_name, d.last_name].filter(Boolean).join(" ").trim() || "Doctor",
          img: resolveDoctorImageUrl(d) || getDoctorFallbackImg(d.id, i),
        })
      ),
    [officeDoctorsRaw]
  );

  const doctor = doctorsForWizard.find((d) => d.id === selectedDoctor) ?? initialDoctor;

  const finalizeSelection = useCallback(
    (materialId: string, arch?: "maxillary" | "mandibular" | "both") => {
      const selectedCategoryName = categoriesAsWizard.find((c) => c.id === selectedCategory)?.name ?? "";
      const subProductName =
        (subcategoriesByCategoryId[selectedCategory ?? -1] ?? []).find((p) => p.id === selectedSubProduct)?.name ?? "";
      const materialName = productsAsWizard.find((p) => String(p.id) === String(materialId))?.name ?? "";
      const archToUse = arch ?? selectedArch ?? forceArch;

      setSelectedMaterial(materialId);
      if (archToUse) setSelectedArch(archToUse);
      // Reset auto-advance flag so the shouldAutoAdvanceProducts effect doesn't fire a second time
      // (e.g. when selectedArch state update re-triggers the effect after arch popover selection)
      setShouldAutoAdvanceProducts(false);

      const payload = {
        doctor: doctor ?? { id: 0, name: "", img: "" },
        lab: lab ?? { id: 0, name: "", location: "", logo: null },
        patientName,
        gender,
        age,
        category: String(selectedCategory),
        categoryName: selectedCategoryName,
        product: String(selectedSubProduct),
        material: materialId,
        materialName,
        arch: archToUse,
      } as WizardResult;

      if (mode === "addProduct") {
        onComplete(payload);
      } else if (doctor && lab) {
        onComplete({ ...payload, doctor, lab });
      }
    },
    [
      categoriesAsWizard,
      selectedCategory,
      subcategoriesByCategoryId,
      selectedSubProduct,
      productsAsWizard,
      selectedArch,
      forceArch,
      doctor,
      lab,
      patientName,
      gender,
      age,
      mode,
      onComplete,
    ]
  );

  const handleSearchProductSelect = useCallback(
    (product: LibraryProductApi) => {
      const categoryId = product.subcategory?.category?.id ?? product.subcategory?.category_id;
      const subcategoryId = product.subcategory?.id;
      const categoryName =
        product.subcategory?.category?.name ??
        categoriesAsWizard.find((c) => c.id === categoryId)?.name ??
        "";

      if (categoryId != null) setSelectedCategory(categoryId);
      if (subcategoryId != null) setSelectedSubProduct(subcategoryId);

      setShouldAutoAdvanceProducts(false);
      setProductSearch("");

      const isRemovable = categoryName.toLowerCase().includes("removable");
      const productId = String(product.id);

      if (isRemovable && !forceArch) {
        setSelectedMaterial(productId);
        setPendingArchProductId(productId);
        setStep(6);
        return;
      }

      finalizeSelection(productId, forceArch);
    },
    [categoriesAsWizard, forceArch, finalizeSelection]
  );

  const productSearchProps: ProductSearchProps = useMemo(
    () => ({
      productSearch,
      onProductSearchChange: setProductSearch,
      searchResults: productSearchResults,
      isSearchingProducts,
      onSearchProductSelect: handleSearchProductSelect,
    }),
    [productSearch, productSearchResults, isSearchingProducts, handleSearchProductSelect]
  );

  useEffect(() => {
    if (step !== 5) return;
    if (selectedSubProduct == null) return;
    if (productsLoading || productsError) return;
    if (!shouldAutoAdvanceProducts) return;

    const selectedCategoryName = categoriesAsWizard.find((c) => c.id === selectedCategory)?.name ?? "";
    const isRemovable = selectedCategoryName.toLowerCase().includes("removable");

    if (productsAsWizard.length === 1) {
      const only = productsAsWizard[0];
      if (isRemovable && !forceArch && !selectedArch) {
        setArchPopoverSubId(selectedSubProduct);
      } else {
        finalizeSelection(String(only.id), forceArch ?? selectedArch);
      }
    } else if (productsAsWizard.length > 1) {
      setStep(6);
    }
  }, [
    step,
    selectedSubProduct,
    productsLoading,
    productsError,
    productsAsWizard,
    selectedCategory,
    categoriesAsWizard,
    forceArch,
    selectedArch,
    finalizeSelection,
    shouldAutoAdvanceProducts,
  ]);

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
      if (editTarget === "doctor" && onEditDone) {
        onEditDone();
      } else {
        setStep((s) => s + 1);
      }
    }
  }, [step, role, doctorsSuccess, doctorsForWizard, selectedDoctor]);

  const canProceed = () => {
    switch (step) {
      case 1:
        return isStepDoctor(1) ? selectedDoctor !== null : selectedLab !== null;
      case 2:
        return isStepDoctor(2) ? selectedDoctor !== null : selectedLab !== null;
      case 3:
        return (
          isValidPatientName(patientName) &&
          (!patientFieldSettings.genderRequired || Boolean(gender))
        );
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
    const resolvedCategoryName = selectedCategory != null
      ? categoriesAsWizard.find((c) => c.id === selectedCategory)?.name ?? ""
      : "";
    if (step < 6) {
      setStep(step + 1);
    } else if (step === 6 && mode === "addProduct") {
      onComplete({
        doctor: doctor ?? { id: 0, name: "", img: "" },
        lab: lab ?? { id: 0, name: "", location: "", logo: null },
        patientName,
        gender,
        age,
        category: selectedCategory != null ? String(selectedCategory) : "",
        categoryName: resolvedCategoryName,
        product: selectedSubProduct != null ? String(selectedSubProduct) : "",
        material: selectedMaterial || "",
      });
    } else if (step === 6 && doctor && lab) {
      onComplete({
        doctor,
        lab,
        patientName,
        gender,
        age,
        category: selectedCategory != null ? String(selectedCategory) : "",
        categoryName: resolvedCategoryName,
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
              if (editTarget === "doctor" && onEditDone) {
                setTimeout(() => onEditDone(), 300);
              } else {
                setTimeout(() => setStep(2), 300);
              }
            }}
            isLoading={doctorsLoading}
            error={doctorsError}
            onAddNew={() => setShowAddDoctorModal(true)}
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
              if (editTarget === "lab" && onEditDone) {
                setTimeout(() => onEditDone(), 300);
              } else {
                setTimeout(() => setStep(2), 300);
              }
            }}
            isLoading={labsLoading}
            error={labsError}
            stepTitle={role === "office_admin" ? "Choose a Lab" : "Choose an Office"}
            entityLabel={role === "office_admin" ? "lab" : "office"}
            onAddNew={() => setShowAddLabModal(true)}
          />
        )}
        {step === 2 && role !== null && isStepDoctor(2) && (
          <StepDoctor
            doctors={doctorsForWizard}
            selected={selectedDoctor}
            onSelect={(id) => {
              setSelectedDoctor(id);
              if (editTarget === "doctor" && onEditDone) {
                setTimeout(() => onEditDone(), 300);
              } else {
                setTimeout(() => setStep(3), 300);
              }
            }}
            isLoading={doctorsLoading}
            error={doctorsError}
            onAddNew={() => setShowAddDoctorModal(true)}
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
              if (editTarget === "lab" && onEditDone) {
                setTimeout(() => onEditDone(), 300);
              } else {
                setTimeout(() => setStep(3), 300);
              }
            }}
            isLoading={labsLoading}
            error={labsError}
            stepTitle={role === "office_admin" ? "Choose an Office" : "Choose a Lab"}
            entityLabel={role === "office_admin" ? "office" : "lab"}
            onAddNew={() => setShowAddLabModal(true)}
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
            fieldSettings={patientFieldSettings}
          />
        )}
        {step === 4 && (
          <StepCategory
            categories={categoriesAsWizard}
            selected={selectedCategory}
            onSelect={(id) => {
              setSelectedCategory(id);
              setSelectedSubProduct(null);
              setSelectedArch(forceArch);
              setTimeout(() => setStep(5), 300);
            }}
            doctor={doctor}
            patientName={patientName}
            gender={gender}
            age={age}
            isLoading={categoriesLoading}
            error={categoriesError}
            onPatientNameChange={setPatientName}
            onGenderChange={setGender}
            onAgeChange={setAge}
            fieldSettings={patientFieldSettings}
            patientInfoComplete={patientInfoComplete}
            {...productSearchProps}
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
              setSelectedMaterial(null);
              setArchPopoverSubId(null);
              setShouldAutoAdvanceProducts(true);
            }}
            onBack={() => setStep(4)}
            onPrevious={() => {
              setShouldAutoAdvanceProducts(false);
              setStep(5);
            }}
            doctor={doctor}
            patientName={patientName}
            gender={gender}
            age={age}
            onPatientNameChange={setPatientName}
            onGenderChange={setGender}
            onAgeChange={setAge}
            fieldSettings={patientFieldSettings}
            archPopoverSubId={archPopoverSubId}
            setArchPopoverSubId={setArchPopoverSubId}
            subcategoryProductCounts={subcategoryProductCounts}
            subcategoryProducts={subcategoryProducts}
            onArchPickForSingle={(subcatId, arch) => {
              const only = subcategoryProducts[subcatId]?.[0];
              if (!only) return;
              setSelectedSubProduct(subcatId);
              setSelectedArch(arch);
              setSelectedMaterial(String(only.id));
              setShouldAutoAdvanceProducts(false);
              finalizeSelection(String(only.id), arch);
            }}
            {...productSearchProps}
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
              forceArch={forceArch ?? selectedArch}
              onBack={() => {
                setShouldAutoAdvanceProducts(false);
                setPendingArchProductId(null);
                setStep(5);
              }}
              onSelect={(id, arch) => {
                setPendingArchProductId(null);
                setSelectedMaterial(id);
                if (arch) setSelectedArch(arch);
                const materialName = productsAsWizard.find((p) => String(p.id) === String(id))?.name ?? "";
                if (mode === "addProduct") {
                  setTimeout(() => {
                    onComplete({
                      doctor: doctor ?? { id: 0, name: "", img: "" },
                      lab: lab ?? { id: 0, name: "", location: "", logo: null },
                      patientName,
                      gender,
                      age,
                      category: String(selectedCategory),
                      categoryName: selectedCategoryName,
                      product: String(selectedSubProduct),
                      material: id,
                      materialName,
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
                      age,
                      category: String(selectedCategory),
                      categoryName: selectedCategoryName,
                      product: String(selectedSubProduct),
                      material: id,
                      materialName,
                      arch,
                    });
                  }, 300);
                }
              }}
              doctor={doctor}
              patientName={patientName}
              gender={gender}
              age={age}
              onPatientNameChange={setPatientName}
              onGenderChange={setGender}
              onAgeChange={setAge}
              fieldSettings={patientFieldSettings}
              initialArchPopoverProductId={pendingArchProductId}
              {...productSearchProps}
            />
          );
        })()}
      </div>

      {/* Bottom bar for steps 1-3 (doctor, lab, patient info) */}
      {step <= 3 && (
        <div className="border-t border-[#d9d9d9] bg-white px-6 py-3 flex items-center justify-between flex-shrink-0">
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
          showPrevious={false}
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

      {/* Add New Lab Modal */}
      <AddNewLabModal
        open={showAddLabModal}
        onOpenChange={(open) => {
          setShowAddLabModal(open)
          if (!open) {
            refetch()
          }
        }}
        onLabSelect={(lab: any) => {
          setShowAddLabModal(false)
          refetch()
        }}
      />

      {/* Add Doctor Modal */}
      <AddDoctorModal
        isOpen={showAddDoctorModal}
        onClose={() => {
          setShowAddDoctorModal(false)
        }}
        onDoctorConnect={(doctorId: string, doctorData?: any) => {
          setShowAddDoctorModal(false)

          // Refresh the doctors list to show the newly connected doctor
          setTimeout(() => {
            refetchDoctors()
            queryClient.invalidateQueries({ queryKey: ["doctors-total"] })
          }, 100)

          // Show success message
          if (doctorData) {
            const doctorName = doctorData.name || `${doctorData.first_name || ""} ${doctorData.last_name || ""}`.trim()
            toast({
              title: "Doctor Connected",
              description: `${doctorName} has been connected successfully.`,
            })
          } else {
            toast({
              title: "Doctor Connected",
              description: "Doctor has been connected successfully.",
            })
          }
        }}
      />
    </div>
  );
}
