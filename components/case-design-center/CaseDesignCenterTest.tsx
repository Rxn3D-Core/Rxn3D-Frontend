"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Eye,
  EyeOff,
  Settings,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  FileText,
  Zap,
  Check,
  Square,
} from "lucide-react";

// Types
interface ToothData {
  number: number;
  hasProduct: boolean;
  productName?: string;
  isSelected?: boolean;
}

interface ProductSummary {
  id: string;
  toothNumbers: string;
  category: string;
  subCategory: string;
  productMaterial: string;
  retentionType: string;
  stumpShade: string;
  toothShade: string;
  stage: string;
  ponticDesign?: string;
  embrasures?: string;
  occlusalContact?: string;
  interproximalContact?: string;
  impression?: string;
  estDays?: string;
  implantDetail?: {
    brand: string;
    platform: string;
    size: string;
    inclusions: string;
  };
  abutmentDetail?: {
    type: string;
    abutmentType: string;
  };
}

// Sample data for maxillary teeth (1-16)
const maxillaryTeeth: ToothData[] = Array.from({ length: 16 }, (_, i) => ({
  number: i + 1,
  hasProduct: [4, 5].includes(i + 1),
  productName: [4, 5].includes(i + 1) ? "Single Crowns" : undefined,
  isSelected: [4, 5].includes(i + 1),
}));

// Sample data for mandibular teeth (32-17, displayed right to left)
const mandibularTeeth: ToothData[] = Array.from({ length: 16 }, (_, i) => ({
  number: 32 - i,
  hasProduct: [19].includes(32 - i),
  productName: [19].includes(32 - i) ? "Single crown" : undefined,
  isSelected: [19].includes(32 - i),
}));

// Sample product summaries
const sampleMaxillarySummary: ProductSummary = {
  id: "max-1",
  toothNumbers: "#4, #5",
  category: "Fixed Restoration",
  subCategory: "Single Crown",
  productMaterial: "Full contour - Zirconia",
  retentionType: "Screwed retained",
  stumpShade: "Vita 3D Master",
  toothShade: "Vita 3D Master",
  stage: "Finish",
  ponticDesign: "Modified Ridge",
  embrasures: "Type II",
  occlusalContact: "POS",
  interproximalContact: "Open Contact",
  impression: "1x STL file",
  estDays: "10 work days after submission",
};

const sampleMandibularSummary: ProductSummary = {
  id: "mand-1",
  toothNumbers: "#19",
  category: "Fixed Restoration",
  subCategory: "Single Crown",
  productMaterial: "Full contour - Zirconia",
  retentionType: "Screwed retained",
  stumpShade: "Vita 3D Master",
  toothShade: "Vita 3D Master",
  stage: "Finish",
  estDays: "14 work days after submission",
  implantDetail: {
    brand: "Truabutment",
    platform: "Truscan",
    size: "4.5mm",
    inclusions: "1x Model with tissue",
  },
  abutmentDetail: {
    type: "Office provided",
    abutmentType: "Custom Abutment",
  },
};

// Floating Input Component
const FloatingInput: React.FC<{
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  icon?: React.ReactNode;
}> = ({ label, value, onChange, readOnly = true, className = "", icon }) => {
  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          className="w-full px-3 pt-5 pb-2 text-sm border border-gray-400 rounded-lg bg-white focus:outline-none focus:border-blue-500 pr-10"
        />
        <label className="absolute left-2 -top-2 px-1 text-xs text-gray-500 bg-white">
          {label}
        </label>
        {icon && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{icon}</div>
        )}
      </div>
    </div>
  );
};

// Product Pill Component
const ProductPill: React.FC<{
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}> = ({ label, isActive = false, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1 text-[10px] rounded-md shadow-sm transition-all whitespace-nowrap ${
        isActive
          ? "bg-[#DFEEFB] text-black"
          : "bg-white text-black hover:bg-gray-50"
      }`}
      style={{ boxShadow: "1px 1px 3.5px rgba(0, 0, 0, 0.25)" }}
    >
      {label}
    </button>
  );
};

// Tag Pill Component
const TagPill: React.FC<{ label: string; variant?: "default" | "light" }> = ({
  label,
  variant = "default",
}) => {
  return (
    <span
      className={`px-2.5 py-0.5 text-[10px] rounded-md ${
        variant === "light" ? "bg-[#F9F9F9]" : "bg-[#F9F9F9]"
      }`}
      style={{ boxShadow: "1px 1px 3.5px rgba(0, 0, 0, 0.25)" }}
    >
      {label}
    </span>
  );
};

// Shade Badge Component
const ShadeBadge: React.FC<{ shade: string }> = ({ shade }) => {
  return (
    <div className="w-7 h-7 rounded bg-amber-100 border border-amber-300 flex items-center justify-center">
      <span className="text-[9px] font-bold text-amber-800">{shade}</span>
    </div>
  );
};

// Tooth Component with selection marker
const ToothWithMarker: React.FC<{
  tooth: ToothData;
  isMaxillary: boolean;
  onSelect?: (number: number) => void;
}> = ({ tooth, isMaxillary, onSelect }) => {
  // Tooth widths based on design (approximate relative widths)
  const toothWidths: Record<number, string> = {
    // Maxillary
    1: "w-[2.5%]", 2: "w-[2.9%]", 3: "w-[3.1%]", 4: "w-[2.1%]", 5: "w-[2.1%]", 6: "w-[2.3%]", 7: "w-[2%]", 8: "w-[2.8%]",
    9: "w-[2.8%]", 10: "w-[2%]", 11: "w-[2.3%]", 12: "w-[2.1%]", 13: "w-[2.1%]", 14: "w-[3.1%]", 15: "w-[2.9%]", 16: "w-[2.5%]",
    // Mandibular
    17: "w-[2.5%]", 18: "w-[2.9%]", 19: "w-[3.1%]", 20: "w-[2.2%]", 21: "w-[2%]", 22: "w-[1.9%]", 23: "w-[1.7%]", 24: "w-[1.5%]",
    25: "w-[1.5%]", 26: "w-[1.7%]", 27: "w-[1.9%]", 28: "w-[2%]", 29: "w-[2.2%]", 30: "w-[3.1%]", 31: "w-[2.9%]", 32: "w-[2.5%]",
  };

  // Tooth heights vary by position
  const getToothHeight = (num: number, isMax: boolean) => {
    if (isMax) {
      // Maxillary - molars shorter, incisors longer
      if (num <= 3 || num >= 14) return "h-16 sm:h-20 lg:h-24";
      if (num <= 5 || num >= 12) return "h-20 sm:h-24 lg:h-28";
      return "h-24 sm:h-28 lg:h-32";
    } else {
      // Mandibular - molars longer, incisors shorter
      if (num >= 30 || num <= 19) return "h-16 sm:h-20 lg:h-24";
      if (num >= 28 || num <= 21) return "h-14 sm:h-18 lg:h-20";
      return "h-12 sm:h-14 lg:h-16";
    }
  };

  return (
    <div
      className={`relative flex flex-col items-center cursor-pointer group ${toothWidths[tooth.number] || "w-[2.5%]"}`}
      onClick={() => onSelect?.(tooth.number)}
    >
      {/* Selection marker - shows above/below tooth */}
      {tooth.isSelected && (
        <div
          className={`absolute ${
            isMaxillary ? "-top-12 sm:-top-14" : "-bottom-12 sm:-bottom-14"
          } left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 z-10`}
        >
          {/* Triangle marker */}
          <div
            className={`w-4 h-8 sm:w-5 sm:h-10 ${
              isMaxillary ? "" : "rotate-180"
            }`}
            style={{
              background: "rgba(17, 98, 168, 0.2)",
              border: "1px solid #1162A8",
              borderRadius: "4px",
              clipPath: isMaxillary
                ? "polygon(50% 100%, 0 0, 100% 0)"
                : "polygon(50% 0%, 0 100%, 100% 100%)",
            }}
          />
          <button className="p-0.5 sm:p-1 rounded hover:bg-gray-100">
            <Settings className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
          </button>
        </div>
      )}

      {/* Tooth visual (placeholder - would be actual tooth images) */}
      <div
        className={`relative w-full flex ${
          isMaxillary ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`w-full ${getToothHeight(tooth.number, isMaxillary)} bg-gradient-to-${
            isMaxillary ? "b" : "t"
          } from-gray-100 via-gray-50 to-white ${
            isMaxillary ? "rounded-b-lg" : "rounded-t-lg"
          } ${
            tooth.isSelected ? "ring-2 ring-blue-400 ring-opacity-50" : ""
          } border border-gray-200`}
          style={{
            boxShadow: "inset 0 0 10px rgba(0,0,0,0.05)",
          }}
        />
      </div>
    </div>
  );
};

// Dental Arch Section
const DentalArch: React.FC<{
  title: string;
  teeth: ToothData[];
  isMaxillary: boolean;
  isVisible: boolean;
  onToggleVisibility: () => void;
}> = ({ title, teeth, isMaxillary, isVisible, onToggleVisibility }) => {
  const selectedTeeth = teeth.filter((t) => t.hasProduct);
  const pillLabel =
    selectedTeeth.length > 0
      ? `${selectedTeeth[0].productName} #${selectedTeeth
          .map((t) => t.number)
          .join(", #")}`
      : "";

  return (
    <div className="flex-1 bg-[#FDFDFD] min-w-0">
      {/* Title */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2">
        {!isMaxillary && <div className="w-5" />}
        <h3 className="text-xs sm:text-sm font-bold tracking-wide text-center flex-1">
          {title}
        </h3>
        <button
          onClick={onToggleVisibility}
          className="p-1 hover:bg-gray-100 rounded"
        >
          {isVisible ? (
            <Eye className="w-4 h-4 text-gray-500" />
          ) : (
            <EyeOff className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* Product Pill */}
      {pillLabel && (
        <div className="flex justify-center pb-2">
          <ProductPill label={pillLabel} isActive />
        </div>
      )}

      {/* Teeth Row */}
      <div
        className={`flex justify-center items-${
          isMaxillary ? "end" : "start"
        } gap-px px-2 sm:px-4 ${
          isMaxillary ? "pt-14 sm:pt-16 pb-2" : "pt-2 pb-14 sm:pb-16"
        }`}
      >
        {teeth.map((tooth) => (
          <ToothWithMarker
            key={tooth.number}
            tooth={tooth}
            isMaxillary={isMaxillary}
          />
        ))}
      </div>

      {/* Tooth Numbers */}
      <div className="flex justify-center gap-px px-2 sm:px-4 pb-2">
        {teeth.map((tooth) => (
          <div
            key={tooth.number}
            className="flex-1 text-[8px] sm:text-[10px] lg:text-xs font-bold text-center"
          >
            {tooth.number}
          </div>
        ))}
      </div>
    </div>
  );
};

// Product Summary Accordion
const ProductSummaryAccordion: React.FC<{
  summary: ProductSummary;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ summary, isExpanded, onToggle }) => {
  return (
    <div
      className="bg-white rounded-md overflow-hidden"
      style={{ boxShadow: "0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-[#DFEEFB] cursor-pointer"
        style={{
          boxShadow: "0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)",
          borderRadius: "5.4px 5.4px 0 0",
        }}
        onClick={onToggle}
      >
        {/* Avatar placeholder */}
        <div className="w-10 h-8 sm:w-16 sm:h-11 bg-white rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
          <div className="w-6 h-6 sm:w-10 sm:h-10 bg-gray-200 rounded-full" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm sm:text-base">
            {summary.toothNumbers}
          </div>
          <div className="flex gap-1 mt-1 flex-wrap items-center">
            <TagPill label={summary.category} />
            <TagPill label={summary.subCategory} />
            <span className="text-[8px] sm:text-[10px] text-gray-500 flex items-center ml-1 truncate">
              Est days: {summary.estDays}
            </span>
          </div>
        </div>

        {/* Expand button */}
        <button className="p-1 flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Main fields - 2 columns on larger screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <FloatingInput
              label="Product - Material"
              value={summary.productMaterial}
            />
            <FloatingInput
              label="Select Retention type"
              value={summary.retentionType}
            />
          </div>

          {/* Implant Detail Section */}
          {summary.implantDetail && (
            <div className="border border-gray-200 rounded-lg p-2 sm:p-3">
              <div className="text-xs text-gray-500 mb-2">Implant Detail</div>
              <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4">
                <div className="text-sm font-medium">{summary.toothNumbers}</div>
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <FloatingInput
                    label="Implant Brand"
                    value={summary.implantDetail.brand}
                  />
                  <FloatingInput
                    label="Implant Platform"
                    value={summary.implantDetail.platform}
                  />
                  <FloatingInput
                    label="Implant Size"
                    value={summary.implantDetail.size}
                  />
                </div>
              </div>
              <div className="mt-2">
                <FloatingInput
                  label="Implant inclusions"
                  value={summary.implantDetail.inclusions}
                />
              </div>
            </div>
          )}

          {/* Abutment Detail Section */}
          {summary.abutmentDetail && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <FloatingInput
                label="Abutment Detail"
                value={summary.abutmentDetail.type}
              />
              <FloatingInput
                label="Abutment type"
                value={summary.abutmentDetail.abutmentType}
              />
            </div>
          )}

          {/* Shade fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <FloatingInput
              label="Stump Shade"
              value={summary.stumpShade}
              icon={<ShadeBadge shade="A2" />}
            />
            <FloatingInput
              label="Tooth Shade"
              value={summary.toothShade}
              icon={<ShadeBadge shade="A2" />}
            />
            <FloatingInput label="Stage" value={summary.stage} />
          </div>

          {/* Additional fields for maxillary */}
          {summary.ponticDesign && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <FloatingInput
                  label="Pontic Design"
                  value={summary.ponticDesign}
                  icon={<span className="text-xs">{"🦷"}</span>}
                />
                <FloatingInput
                  label="Embrasures"
                  value={summary.embrasures || ""}
                  icon={<span className="text-xs">{"🔲"}</span>}
                />
                <FloatingInput
                  label="Occlusal Contact"
                  value={summary.occlusalContact || ""}
                  icon={<span className="text-xs">{"◻️"}</span>}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <FloatingInput
                  label="Interproximal Contact"
                  value={summary.interproximalContact || ""}
                />
                <FloatingInput label="Stage" value={summary.stage} />
                <FloatingInput
                  label="Impression"
                  value={summary.impression || ""}
                />
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm hover:bg-gray-50">
              <Square className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Deliver product first</span>
              <span className="xs:hidden">Deliver</span>
            </button>
            <button className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm hover:bg-gray-50">
              + <span className="hidden sm:inline">Add ons (3 selected)</span>
              <span className="sm:hidden">Add ons</span>
            </button>
            <button className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm hover:bg-gray-50">
              <Paperclip className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Attach Files (15 uploads)</span>
              <span className="sm:hidden">Files</span>
            </button>
            <button className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-50 border border-red-200 rounded-lg text-xs sm:text-sm text-red-600 hover:bg-red-100">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Request Rush</span>
              <span className="xs:hidden">Rush</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Component
const CaseDesignCenterTest: React.FC = () => {
  const [maxillaryVisible, setMaxillaryVisible] = useState(true);
  const [mandibularVisible, setMandibularVisible] = useState(true);
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>([
    "max-1",
    "mand-1",
  ]);
  const [caseNotes, setCaseNotes] = useState(
    "Fabricate Full contour zirconia for tooth #30, Implant brand truabutment, implant platform truscan size 4.5. Abutment brand truabutment, platform truscan with custom size."
  );

  const toggleAccordion = (id: string) => {
    setExpandedAccordions((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Main Container */}
      <div className="w-full max-w-[1923px] mx-auto border border-black bg-[#F5F5F5]">
        {/* Content Area - with left margin for sidebar */}
        <div className="lg:ml-[72px]">
          {/* Bordered content area */}
          <div className="border border-black min-h-screen">
            {/* Top Header Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-5 py-2.5 bg-white border-b border-[#D9D9D9] gap-2 sm:gap-0">
              {/* Left - Sending to */}
              <div className="flex items-center gap-2 order-1 sm:order-none">
                <span className="font-bold text-sm sm:text-base whitespace-nowrap">
                  Sending to
                </span>
                <div className="w-16 sm:w-20 h-7 sm:h-8 bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-[10px] sm:text-xs text-gray-600 font-semibold">
                    HMCi
                  </span>
                </div>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#B4B0B0]" />
                </button>
              </div>

              {/* Center - Practice Logo */}
              <div className="flex items-center order-3 sm:order-none">
                <div className="w-64 sm:w-80 lg:w-[343px] h-12 sm:h-16 lg:h-[75px] bg-gray-50 rounded flex flex-col items-center justify-center">
                  <span className="text-sm sm:text-lg font-bold text-gray-700">
                    HENDERSON
                  </span>
                  <span className="text-[10px] sm:text-xs text-blue-500 tracking-widest">
                    MODERN DENTISTRY
                  </span>
                </div>
              </div>

              {/* Right - Empty space for symmetry */}
              <div className="hidden sm:block w-[200px] lg:w-[350px]" />
            </div>

            {/* Patient Info Bar */}
            <div className="flex flex-col lg:flex-row items-center justify-between px-3 sm:px-5 py-2.5 bg-white border-b border-[#D9D9D9] gap-4">
              {/* Left - Doctor Avatar & Name */}
              <div className="flex flex-col items-center gap-2 w-full lg:w-[200px]">
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-[104px] lg:h-[104px] rounded-full bg-gray-200 overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-amber-200 to-amber-400" />
                  </div>
                  <button className="absolute bottom-0 right-0 p-1 bg-white rounded-full shadow">
                    <Pencil className="w-3 h-3 text-[#B4B0B0]" />
                  </button>
                </div>
                <span className="text-sm sm:text-base lg:text-[17px] whitespace-nowrap">
                  Cody Mugglestone, DDS
                </span>
              </div>

              {/* Center - Patient Info Fields */}
              <div className="flex-1 w-full max-w-[1400px] px-0 sm:px-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <FloatingInput
                    label="Patient name"
                    value="Jose Protacio Rizal Mercado y Alonzo"
                  />
                  <div className="hidden sm:block" /> {/* Empty cell */}
                  <FloatingInput label="Gender" value="M / F" />
                  <div className="hidden sm:block" /> {/* Empty cell */}
                </div>
              </div>

              {/* Right - Created By */}
              <div className="flex flex-col items-center gap-3 w-full lg:w-[170px]">
                <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-[73px] lg:h-[73px] rounded-full bg-gray-200 overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-blue-200 to-blue-400" />
                </div>
                <FloatingInput
                  label="Created By"
                  value="Cassandra Vega"
                  className="w-full"
                />
              </div>
            </div>

            {/* Case Design Center Title */}
            <div className="flex items-center justify-center py-3 bg-white">
              <span className="text-base sm:text-lg font-bold tracking-wide">
                CASE DESIGN CENTER
              </span>
              <div className="flex items-center gap-1 sm:gap-2 ml-2 sm:ml-4">
                <button className="p-0.5 sm:p-1 hover:bg-gray-100 rounded">
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button className="p-0.5 sm:p-1 hover:bg-gray-100 rounded">
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Dental Arches Section */}
            <div className="flex flex-col lg:flex-row">
              {/* Maxillary (Left) */}
              <DentalArch
                title="MAXILLARY"
                teeth={maxillaryTeeth}
                isMaxillary={true}
                isVisible={maxillaryVisible}
                onToggleVisibility={() => setMaxillaryVisible(!maxillaryVisible)}
              />

              {/* Mandibular (Right) */}
              <DentalArch
                title="MANDIBULAR"
                teeth={mandibularTeeth}
                isMaxillary={false}
                isVisible={mandibularVisible}
                onToggleVisibility={() =>
                  setMandibularVisible(!mandibularVisible)
                }
              />
            </div>

            {/* Summary Sections */}
            <div className="flex flex-col lg:flex-row">
              {/* Maxillary Summary */}
              <div className="flex-1 bg-[#FDFDFD] p-2 sm:p-4">
                <ProductSummaryAccordion
                  summary={sampleMaxillarySummary}
                  isExpanded={expandedAccordions.includes("max-1")}
                  onToggle={() => toggleAccordion("max-1")}
                />
              </div>

              {/* Mandibular Summary */}
              <div className="flex-1 bg-[#FDFDFD] p-2 sm:p-4">
                <ProductSummaryAccordion
                  summary={sampleMandibularSummary}
                  isExpanded={expandedAccordions.includes("mand-1")}
                  onToggle={() => toggleAccordion("mand-1")}
                />
              </div>
            </div>

            {/* Case Summary Notes */}
            <div className="bg-white p-2 sm:p-4 mx-2 sm:mx-4 mb-2 sm:mb-4">
              <div className="relative">
                <label className="absolute -top-2 left-3 px-1 text-xs text-gray-500 bg-white z-10">
                  Case summary notes
                </label>
                <textarea
                  value={caseNotes}
                  onChange={(e) => setCaseNotes(e.target.value)}
                  className="w-full p-3 pt-4 border border-gray-400 rounded-lg resize-none focus:outline-none focus:border-blue-500 text-sm"
                  rows={3}
                />
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-2 sm:px-4 py-3 bg-white border-t border-[#D9D9D9] gap-3 sm:gap-0">
              {/* Left - Preview */}
              <button className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                <FileText className="w-4 h-4" />
                Preview
              </button>

              {/* Right - Cancel & Submit */}
              <div className="flex gap-2 sm:gap-3">
                <button className="px-4 sm:px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                  Cancel
                </button>
                <button className="px-4 sm:px-6 py-2 bg-[#1162A8] text-white rounded-lg hover:bg-[#0f5497] text-sm">
                  Submit Case
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseDesignCenterTest;
