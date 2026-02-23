"use client";

import { useState, useEffect, useRef } from "react";
import { implantBrandPlatforms, implantBrandList } from "../constants";
import { CardSelectorField } from "./fields/CardSelectorField";
import { CardGallery } from "./fields/CardGallery";
import { SelectField } from "./fields/SelectField";
import { ImplantInclusionsField } from "./fields/ImplantInclusionsField";
import type { ActiveCardType } from "../types";

const implantSizes = ["3.5mm", "4mm", "4.5mm", "5mm", "5.5mm", "6mm"];
const abutmentDetailOptions = ["Office provided", "Lab provided", "Custom"];
const abutmentTypeOptions = ["Stock Abutment", "Custom Abutment", "Multi-Unit abutment"];

interface ImplantDetailSectionProps {
  toothNumber: number;
  /** Called when the implant detail form becomes complete or incomplete (so parent can e.g. gate impression modal). */
  onCompleteChange?: (complete: boolean) => void;
}

export function ImplantDetailSection({ toothNumber, onCompleteChange }: ImplantDetailSectionProps) {
  const [brand, setBrand] = useState("");
  const [platform, setPlatform] = useState("");
  const [size, setSize] = useState("");
  const [inclusions, setInclusions] = useState("No inclusion");
  const [inclusionQty, setInclusionQty] = useState(0);
  const [abutmentDetail, setAbutmentDetail] = useState("");
  const [abutmentType, setAbutmentType] = useState("");

  const [activeCardType, setActiveCardType] = useState<ActiveCardType["right1"]>(null);
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [abutmentDetailDropdownOpen, setAbutmentDetailDropdownOpen] = useState(false);
  const [abutmentTypeDropdownOpen, setAbutmentTypeDropdownOpen] = useState(false);

  const platforms = brand ? implantBrandPlatforms[brand] || [] : [];

  // Auto-show Implant Brand card gallery on initial load when brand is not selected
  useEffect(() => {
    if (!brand) {
      setActiveCardType("brand");
    }
  }, []);

  // Auto-open Implant Size dropdown when it becomes visible (after platform selected)
  useEffect(() => {
    if (brand && platform && !size) {
      setSizeDropdownOpen(true);
    }
  }, [brand, platform, size]);

  // Progressive visibility: each row unlocks after the previous is complete
  const row1Complete = !!brand && !!platform && !!size;
  const row2Visible = row1Complete;
  const row2Complete = row1Complete && !!inclusions.trim();
  const row3Visible = row2Complete;

  // Auto-open Abutment Detail dropdown when row3 becomes visible
  useEffect(() => {
    if (row2Complete && !abutmentDetail) {
      setAbutmentDetailDropdownOpen(true);
    }
  }, [row2Complete, abutmentDetail]);

  // Auto-open Abutment Type dropdown after Abutment Detail is selected
  useEffect(() => {
    if (row2Complete && abutmentDetail && !abutmentType) {
      setAbutmentTypeDropdownOpen(true);
    }
  }, [row2Complete, abutmentDetail, abutmentType]);
  const isComplete = row2Complete && !!abutmentDetail && !!abutmentType;

  const onCompleteChangeRef = useRef(onCompleteChange);
  onCompleteChangeRef.current = onCompleteChange;
  useEffect(() => {
    onCompleteChangeRef.current?.(isComplete);
  }, [isComplete]);

  const borderColor = isComplete ? "border-[#34a853]" : "border-[#CF0202]";
  const legendColor = isComplete ? "text-[#34a853]" : "text-[#CF0202]";

  return (
    <fieldset className={`border rounded-[7.7px] p-0 bg-white ${borderColor}`}>
      <legend className={`text-[12.8px] px-1 leading-none ml-2 ${legendColor}`}>
        Implant Detail
      </legend>
      <div className="flex flex-col sm:flex-row">
        {/* Left section - tooth number */}
        <div className="flex justify-center items-center sm:w-[90px] shrink-0 py-2 sm:py-0">
          <span className="text-[20px] text-[#7f7f7f] text-center">
            #{toothNumber}
          </span>
        </div>
        {/* Right section - form fields (old design: grid row + progressive visibility) */}
        <div className="flex flex-col p-2.5 sm:pl-0 sm:pr-2.5 sm:py-2.5 gap-3 flex-1 min-w-0">
          {/* Row 1: Implant Brand → Platform (after brand) → Size (after platform) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <CardSelectorField
              label="Implant Brand"
              value={brand}
              isActive={activeCardType === "brand"}
              onClick={() => {
                setActiveCardType((prev) => (prev === "brand" ? null : "brand"));
              }}
            />

            {/* Platform — only visible after brand is selected */}
            {brand && (
              <CardSelectorField
                label="Implant Platform"
                value={platform}
                required={!platform}
                isActive={activeCardType === "platform"}
                onClick={() => {
                  setActiveCardType((prev) => (prev === "platform" ? null : "platform"));
                }}
              />
            )}

            {/* Size — only visible after platform is selected; dropdown auto-opens */}
            {brand && platform && (
              <SelectField
                label="Implant Size"
                value={size}
                options={implantSizes}
                onChange={(v) => {
                  setSize(v);
                  setSizeDropdownOpen(false);
                }}
                open={sizeDropdownOpen}
                onOpenChange={setSizeDropdownOpen}
              />
            )}

            {/* Card Gallery - appears below the row when brand or platform is active */}
            {activeCardType === "brand" && (
              <CardGallery
                options={implantBrandList}
                value={brand}
                onChange={(v) => {
                  setBrand(v);
                  setPlatform("");
                  setActiveCardType("platform");
                }}
              />
            )}

            {activeCardType === "platform" && (
              <CardGallery
                options={platforms}
                value={platform}
                onChange={(v) => {
                  setPlatform(v);
                  setActiveCardType(null);
                }}
              />
            )}
          </div>

          {/* Row 2: Implant Inclusions — visible after Brand + Platform + Size complete; dropdown auto-opens */}
          {row2Visible && (
            <ImplantInclusionsField
              label="Implant inclusions"
              value={inclusions}
              quantity={inclusionQty}
              onChange={setInclusions}
              onQuantityChange={setInclusionQty}
              autoOpenWhenVisible
            />
          )}

          {/* Row 3: Abutment Detail and Type — visible after inclusions complete; dropdowns auto-open */}
          {row3Visible && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <SelectField
                label="Abutment Detail"
                value={abutmentDetail}
                options={abutmentDetailOptions}
                onChange={(v) => {
                  setAbutmentDetail(v);
                  setAbutmentDetailDropdownOpen(false);
                }}
                open={abutmentDetailDropdownOpen}
                onOpenChange={setAbutmentDetailDropdownOpen}
              />
              <SelectField
                label="Abutment Type"
                value={abutmentType}
                options={abutmentTypeOptions}
                onChange={(v) => {
                  setAbutmentType(v);
                  setAbutmentTypeDropdownOpen(false);
                }}
                open={abutmentTypeDropdownOpen}
                onOpenChange={setAbutmentTypeDropdownOpen}
              />
            </div>
          )}
        </div>
      </div>
    </fieldset>
  );
}
