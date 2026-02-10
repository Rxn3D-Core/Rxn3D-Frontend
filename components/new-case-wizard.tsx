"use client";

import React, { useState } from "react";
import { Filter, Plus, Search, ChevronDown, Check } from "lucide-react";
import { SlipCreationStepFooter } from "@/components/slip-creation-step-footer";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const doctors = [
  { id: 1, name: "Cody Mugglestone, DDS", img: "/doctors/doctor-1.jpg" },
  { id: 2, name: "Julian Ortega, DDS", img: "/doctors/doctor-2.jpg" },
  { id: 3, name: "Liana Castillo, DDS", img: "/doctors/doctor-3.jpg" },
  { id: 4, name: "Sofia Delgado, DDS", img: "/doctors/doctor-4.jpg" },
];

const labs = [
  { id: 1, name: "HMC3I", location: "Las Vegas, Nevada", logo: "https://rxn3d-media-files.s3.us-west-2.amazonaws.com/customers/logos/hmc_69736ca93cf31.jpeg" },
  { id: 2, name: "Kinetic LLC", location: "Las Vegas, Nevada", logo: "/labs/kinetic.jpg" },
  { id: 3, name: "Highlands Dental Lab", location: "Las Vegas, Nevada", logo: "/labs/highlands.jpg" },
  { id: 4, name: "Leca Dental LLC", location: "Las Vegas, Nevada", logo: "/labs/leca.jpg" },
  { id: 5, name: "Boris Digital Lab", location: "Las Vegas, Nevada", logo: "/labs/boris.jpg" },
  { id: 6, name: "Leca Dental LLC", location: "Las Vegas, Nevada", logo: "/labs/leca.jpg" },
  { id: 7, name: "HMC Innovs LLC", location: "Las Vegas, Nevada", logo: "/labs/hmc-innovs.jpg" },
  { id: 8, name: "Highlands Dental Lab", location: "Las Vegas, Nevada", logo: "/labs/highlands.jpg" },
];

const categories = [
  { id: "fixed", name: "Fixed Restoration", img: "/products/fixed-restoration.png" },
  { id: "removable", name: "Removable Restoration", img: "/products/removable-restoration.png" },
  { id: "orthodontics", name: "Orthodontics", img: "/products/orthodontics.png" },
];

const subProducts: Record<string, { id: string; name: string; img: string }[]> = {
  fixed: [
    { id: "single-crowns", name: "Single Crowns", img: "/products/single-crown.jpg" },
    { id: "multi-unit", name: "Multi-Unit Bridge", img: "/products/multi-unit-bridge.jpg" },
    { id: "implant", name: "Implant Supported", img: "/products/implant-supported.jpg" },
    { id: "inlays", name: "Inlays / Onlays / Overlays", img: "/products/inlays-onlays.jpg" },
    { id: "post-core", name: "Post & Core", img: "/products/post-core.jpg" },
    { id: "specialized", name: "Specialized", img: "/products/specialized.jpg" },
  ],
  removable: [
    { id: "partial", name: "Partial Denture", img: "/placeholder.svg?height=100&width=120&query=partial+denture" },
    { id: "full", name: "Full Denture", img: "/placeholder.svg?height=100&width=120&query=full+denture" },
    { id: "metal-frame", name: "Metal Framework", img: "/placeholder.svg?height=100&width=120&query=metal+framework+denture" },
  ],
  orthodontics: [
    { id: "retainer", name: "Retainer", img: "/placeholder.svg?height=100&width=120&query=dental+retainer+clear" },
    { id: "aligner", name: "Clear Aligner", img: "/placeholder.svg?height=100&width=120&query=clear+dental+aligner" },
    { id: "splint", name: "Occlusal Splint", img: "/placeholder.svg?height=100&width=120&query=occlusal+splint+dental" },
  ],
};

/* ---- Material/Product options per sub-category ---- */
const materials: Record<string, { id: string; name: string; img: string }[]> = {
  "single-crowns": [
    { id: "full-contour-zirconia", name: "Full Contour Zirconia", img: "/products/full-contour-zirconia.jpg" },
    { id: "emax", name: "E-max", img: "/products/emax.jpg" },
    { id: "pfm", name: "PFM", img: "/products/pfm.jpg" },
    { id: "pfz", name: "PFZ", img: "/products/pfz.jpg" },
    { id: "full-cast", name: "Full Cast", img: "/products/full-cast.jpg" },
  ],
  "multi-unit": [
    { id: "full-contour-zirconia", name: "Full Contour Zirconia", img: "/products/full-contour-zirconia.jpg" },
    { id: "pfm", name: "PFM", img: "/products/pfm.jpg" },
    { id: "pfz", name: "PFZ", img: "/products/pfz.jpg" },
    { id: "full-cast", name: "Full Cast", img: "/products/full-cast.jpg" },
  ],
  "implant": [
    { id: "full-contour-zirconia", name: "Full Contour Zirconia", img: "/products/full-contour-zirconia.jpg" },
    { id: "emax", name: "E-max", img: "/products/emax.jpg" },
    { id: "pfm", name: "PFM", img: "/products/pfm.jpg" },
  ],
  "inlays": [
    { id: "emax", name: "E-max", img: "/products/emax.jpg" },
    { id: "full-contour-zirconia", name: "Full Contour Zirconia", img: "/products/full-contour-zirconia.jpg" },
    { id: "full-cast", name: "Full Cast", img: "/products/full-cast.jpg" },
  ],
  "post-core": [
    { id: "full-cast", name: "Full Cast", img: "/products/full-cast.jpg" },
    { id: "full-contour-zirconia", name: "Full Contour Zirconia", img: "/products/full-contour-zirconia.jpg" },
  ],
  "specialized": [
    { id: "full-contour-zirconia", name: "Full Contour Zirconia", img: "/products/full-contour-zirconia.jpg" },
    { id: "pfm", name: "PFM", img: "/products/pfm.jpg" },
    { id: "full-cast", name: "Full Cast", img: "/products/full-cast.jpg" },
  ],
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface WizardResult {
  doctor: (typeof doctors)[0];
  lab: (typeof labs)[0];
  patientName: string;
  gender: string;
  category: string;
  product: string;
  material: string;
}

/* ------------------------------------------------------------------ */
/*  Step 1 – Choose a Doctor                                           */
/* ------------------------------------------------------------------ */
function StepDoctor({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (id: number) => void;
}) {
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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 justify-items-center">
        {doctors.map((doc) => (
          <button
            key={doc.id}
            onClick={() => onSelect(doc.id)}
            className="group flex flex-col items-center gap-3 p-2 sm:p-4 transition-all w-full max-w-[250px]"
          >
            <div
              className={`w-full aspect-square max-w-[219.68px] rounded-full overflow-hidden flex-shrink-0 transition-all ${
                selected === doc.id
                  ? "border-[4px] border-[#1162A8]"
                  : "border-[4px] border-[#d9d9d9] group-hover:border-[#1162a8]/100"
              }`}
            >
              <img
                src={doc.img || "/placeholder.svg"}
                alt={doc.name}
                className="w-full h-full object-cover"
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
/*  Step 2 – Choose a Lab                                              */
/* ------------------------------------------------------------------ */
function StepLab({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="flex-1 flex flex-col px-6 py-6">
      <h2 className="text-[16px] font-bold text-[#1d1d1b] text-center mb-6">
        Choose a Lab
      </h2>

      {/* Top bar with filter and Add New lab button */}
      <div className="flex items-center justify-between mb-2">
        <button className="p-2 hover:bg-[#eef1f4] rounded transition-colors">
          <Filter size={18} className="text-[#7f7f7f]" />
        </button>
        <button
          style={{ fontFamily: "Verdana, sans-serif", fontSize: 12, lineHeight: "22px", letterSpacing: "-0.02em", borderRadius: 6, padding: "8px 16px" }}
          className="flex items-center gap-2 bg-[#1162a8] hover:bg-[#0d4a85] text-white font-bold transition-colors whitespace-nowrap"
        >
          Add New lab
        </button>
      </div>

      {/* Labs count */}
      <p
        style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, lineHeight: "22px", letterSpacing: "-0.02em" }}
        className="text-[#b4b0b0] text-right mb-6"
      >
        {labs.length} labs found
      </p>

      {/* Lab cards grid */}
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

            {/* Logo area */}
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
/*  Step 3 – Patient Info                                              */
/* ------------------------------------------------------------------ */
function StepPatientInfo({
  doctor,
  patientName,
  setPatientName,
  gender,
  setGender,
  onComplete,
}: {
  doctor: (typeof doctors)[0] | undefined;
  patientName: string;
  setPatientName: (v: string) => void;
  gender: string;
  setGender: (v: string) => void;
  onComplete?: () => void;
}) {
  const [genderOpen, setGenderOpen] = useState(!gender);

  return (
    <div className="flex-1 flex flex-col px-6 py-6">
      <div className="flex items-start justify-between">
        {/* Left: Doctor + patient info */}
        <div className="flex items-start gap-5">
          {doctor && (
            <div className="flex flex-col items-center gap-1">
              <div className="w-[80px] h-[80px] rounded-full overflow-hidden border-2 border-[#d9d9d9]">
                <img
                  src={doctor.img || "/placeholder.svg"}
                  alt={doctor.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[11px] font-semibold text-[#1d1d1b]">
                {doctor.name}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            {/* Patient name field */}
            <fieldset
              className={`border rounded px-3 pb-2 pt-0 relative min-w-[280px] ${
                patientName.trim().length > 0 ? "border-[#34a853]" : "border-[#e0a030]"
              }`}
            >
              <legend
                className={`text-[11px] px-1 leading-none font-medium ${
                  patientName.trim().length > 0 ? "text-[#34a853]" : "text-[#e0a030]"
                }`}
              >
                Patient name
              </legend>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Enter patient name"
                  className="flex-1 text-[13px] text-[#1d1d1b] bg-transparent outline-none leading-tight"
                />
                {patientName.trim().length > 0 && (
                  <Check size={16} className="text-[#34a853] flex-shrink-0" />
                )}
              </div>
            </fieldset>

            {/* Gender selector */}
            <fieldset
              className={`border rounded px-3 pb-2 pt-0 relative min-w-[280px] ${
                gender.trim().length > 0 ? "border-[#34a853]" : "border-[#cf0202]"
              }`}
            >
              <legend
                className={`text-[11px] px-1 leading-none font-medium ${
                  gender.trim().length > 0 ? "text-[#34a853]" : "text-[#cf0202]"
                }`}
              >
                Select gender
              </legend>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setGenderOpen(!genderOpen)}
                  className={`flex-1 text-left text-[13px] bg-transparent outline-none leading-tight ${
                    gender ? "text-[#1d1d1b]" : "text-[#9ba5b7]"
                  }`}
                >
                  {gender || "\u00A0"}
                </button>
                {gender.trim().length > 0 && (
                  <Check size={16} className="text-[#34a853] flex-shrink-0" />
                )}
              </div>
              {genderOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#d9d9d9] rounded shadow-lg z-10">
                  {["Male", "Female"].map((g) => (
                    <button
                      key={g}
                      onClick={() => {
                        setGender(g);
                        setGenderOpen(false);
                        if (patientName.trim() && onComplete) {
                          setTimeout(() => onComplete(), 300);
                        }
                      }}
                      className={`w-full text-left px-3 py-2 text-[13px] hover:bg-[#dfeefb] transition-colors ${
                        gender === g ? "bg-[#dfeefb]/60 font-medium" : "text-[#1d1d1b]"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </fieldset>
          </div>
        </div>

        {/* Right: Created by */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-[60px] h-[60px] rounded-full overflow-hidden border-2 border-[#d9d9d9]">
            <img
              src="/staff/creator.jpg"
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
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 4 – Choose Category                                           */
/* ------------------------------------------------------------------ */
function StepCategory({
  selected,
  onSelect,
  doctor,
  patientName,
  gender,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  doctor: (typeof doctors)[0] | undefined;
  patientName: string;
  gender: string;
}) {
  return (
    <div className="flex-1 flex flex-col px-6 py-4">
      {/* Patient header mini */}
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
            <div className="w-full aspect-square rounded-[4px] overflow-hidden flex-shrink-0">
              <img
                src={cat.img || "/placeholder.svg"}
                alt={cat.name}
                className="w-full h-full object-cover"
              />
            </div>
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
/*  Step 5 – Choose Sub-Product                                        */
/* ------------------------------------------------------------------ */
function StepSubProduct({
  category,
  selected,
  onSelect,
  doctor,
  patientName,
  gender,
}: {
  category: string;
  selected: string | null;
  onSelect: (id: string) => void;
  doctor: (typeof doctors)[0] | undefined;
  patientName: string;
  gender: string;
}) {
  const products = subProducts[category] || [];
  const categoryName = categories.find((c) => c.id === category)?.name || "";
  const [accordionOpen, setAccordionOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col px-6 py-4">
      {/* Patient header mini */}
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

      {/* Product grid */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        {products.map((prod) => (
          <button
            key={prod.id}
            onClick={() => onSelect(prod.id)}
            className={`group flex flex-col items-center px-4 py-[5px] gap-2 w-[155px] sm:w-[180px] md:w-[200px] rounded-[7px] border-[3px] transition-all hover:border-[#1162A8] hover:bg-[#1162A8]/5 ${
              selected === prod.id
                ? "border-[#1162A8] bg-[#1162A8]/5"
                : "border-[#d9d9d9] bg-white"
            }`}
          >
            <div className="w-full aspect-square rounded-[4px] overflow-hidden flex-shrink-0">
              <img
                src={prod.img || "/placeholder.svg"}
                alt={prod.name}
                className="w-full h-full object-cover"
              />
            </div>
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
/*  Step 6 – Choose Material / Product                                 */
/* ------------------------------------------------------------------ */
function StepMaterial({
  category,
  subProduct,
  selected,
  onSelect,
  doctor,
  patientName,
  gender,
}: {
  category: string;
  subProduct: string;
  selected: string | null;
  onSelect: (id: string) => void;
  doctor: (typeof doctors)[0] | undefined;
  patientName: string;
  gender: string;
}) {
  const items = materials[subProduct] || materials["single-crowns"] || [];
  const categoryName = categories.find((c) => c.id === category)?.name || "";
  const subProductName =
    (subProducts[category] || []).find((p) => p.id === subProduct)?.name || "";

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

      {/* Material cards grid */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        {items.map((mat) => (
          <button
            key={mat.id}
            onClick={() => onSelect(mat.id)}
            className="group relative flex flex-col items-center px-4 py-[5px] gap-[10px] w-[155px] sm:w-[180px] md:w-[200px] rounded-[7px] transition-all border border-[#d9d9d9] bg-white hover:border-[#1162a8]"
          >
            {/* "Click and select" text - shown on hover */}
            <span className="absolute top-1 text-[10px] text-[#7f7f7f] opacity-0 group-hover:opacity-100 transition-opacity">
              Click and select
            </span>
            <div className="w-full aspect-square rounded-[5px] overflow-hidden bg-[#080808] flex-shrink-0">
              <img
                src={mat.img || "/placeholder.svg"}
                alt={mat.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span
              style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, lineHeight: "15px", letterSpacing: "-0.02em" }}
              className="text-[#000000] text-center self-stretch"
            >
              {mat.name}
            </span>
          </button>
        ))}
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
  doctor: (typeof doctors)[0] | undefined;
  patientName: string;
  gender: string;
}) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-4">
        {doctor && (
          <div className="flex flex-col items-center gap-1">
            <div className="w-[60px] h-[60px] rounded-full overflow-hidden border-2 border-[#d9d9d9]">
              <img
                src={doctor.img || "/placeholder.svg"}
                alt={doctor.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-[10px] font-semibold text-[#1d1d1b]">
              {doctor.name}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <fieldset className="border border-[#34a853] rounded px-3 pb-1 pt-0 relative">
            <legend className="text-[10px] text-[#34a853] px-1 leading-none">
              Patient name
            </legend>
            <div className="flex items-center gap-1">
              <span className="text-[12px] text-[#1d1d1b]">{patientName}</span>
              <Check size={14} className="text-[#34a853] flex-shrink-0" />
            </div>
          </fieldset>
          <fieldset className="border border-[#34a853] rounded px-3 pb-1 pt-0 relative">
            <legend className="text-[10px] text-[#34a853] px-1 leading-none">
              Gender
            </legend>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[#1d1d1b]">{gender}</span>
              <Check size={14} className="text-[#34a853] flex-shrink-0" />
            </div>
          </fieldset>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <div className="w-[50px] h-[50px] rounded-full overflow-hidden border-2 border-[#d9d9d9]">
          <img
            src="/staff/creator.jpg"
            alt="Cassandra Vega"
            className="w-full h-full object-cover"
          />
        </div>
        <fieldset className="border border-[#b4b0b0] rounded px-2 pb-1 pt-0 relative">
          <legend className="text-[10px] text-[#7f7f7f] px-1 leading-none">
            Created By
          </legend>
          <span className="text-[11px] text-[#1d1d1b]">Cassandra Vega</span>
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
}: {
  onComplete: (result: WizardResult) => void;
}) {
  const [step, setStep] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [selectedLab, setSelectedLab] = useState<number | null>(null);
  const [patientName, setPatientName] = useState("Jose Protacio Rizal Mercado y Alonzo");
  const [gender, setGender] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubProduct, setSelectedSubProduct] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);

  const doctor = doctors.find((d) => d.id === selectedDoctor);
  const lab = labs.find((l) => l.id === selectedLab);

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedDoctor !== null;
      case 2:
        return selectedLab !== null;
      case 3:
        return patientName.trim() !== "" && gender !== "";
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
    } else if (step === 6 && doctor && lab) {
      onComplete({
        doctor,
        lab,
        patientName,
        gender,
        category: selectedCategory || "",
        product: selectedSubProduct || "",
        material: selectedMaterial || "",
      });
    }
  };

  const handleCancel = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Step content */}
      <div className="flex-1 overflow-auto">
        {step === 1 && (
          <StepDoctor
            selected={selectedDoctor}
            onSelect={(id) => {
              setSelectedDoctor(id);
              // Auto advance after selection
              setTimeout(() => setStep(2), 300);
            }}
          />
        )}
        {step === 2 && (
          <StepLab
            selected={selectedLab}
            onSelect={(id) => {
              setSelectedLab(id);
              setTimeout(() => setStep(3), 300);
            }}
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
            selected={selectedCategory}
            onSelect={(id) => {
              setSelectedCategory(id);
              setTimeout(() => setStep(5), 300);
            }}
            doctor={doctor}
            patientName={patientName}
            gender={gender}
          />
        )}
        {step === 5 && selectedCategory && (
          <StepSubProduct
            category={selectedCategory}
            selected={selectedSubProduct}
            onSelect={(id) => {
              setSelectedSubProduct(id);
              setTimeout(() => setStep(6), 300);
            }}
            doctor={doctor}
            patientName={patientName}
            gender={gender}
          />
        )}
        {step === 6 && selectedCategory && selectedSubProduct && (
          <StepMaterial
            category={selectedCategory}
            subProduct={selectedSubProduct}
            selected={selectedMaterial}
            onSelect={(id) => {
              setSelectedMaterial(id);
              if (doctor && lab) {
                setTimeout(() => {
                  onComplete({
                    doctor,
                    lab,
                    patientName,
                    gender,
                    category: selectedCategory || "",
                    product: selectedSubProduct || "",
                    material: id,
                  });
                }, 300);
              }
            }}
            doctor={doctor}
            patientName={patientName}
            gender={gender}
          />
        )}
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
    </div>
  );
}
