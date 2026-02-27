"use client";

import { useState, useEffect, useRef } from "react";
import { implantBrandPlatforms, implantBrandList } from "../constants";
import { CardGallery } from "./fields/CardGallery";
import { CardSelectorField } from "./fields/CardSelectorField";
import { SelectField } from "./fields/SelectField";
import { ImplantInclusionsField } from "./fields/ImplantInclusionsField";

const implantSizes = ["3.5mm", "4mm", "4.5mm", "5mm", "5.5mm", "6mm"];
const abutmentDetailOptions = ["Office provided", "Lab provided", "Custom"];
const abutmentTypeOptions = ["Stock Abutment", "Custom Abutment", "Multi-Unit abutment"];

interface ImplantDetailSectionProps {
  toothNumber: number;
  /** Called when the implant detail form becomes complete or incomplete (so parent can e.g. gate impression modal). */
  onCompleteChange?: (complete: boolean) => void;
  /** When true, remove green border/label/checkmark styling (case already submitted). */
  caseSubmitted?: boolean;
}

export function ImplantDetailSection({ toothNumber, onCompleteChange, caseSubmitted = false }: ImplantDetailSectionProps) {
  const [brand, setBrand] = useState("");
  const [platform, setPlatform] = useState("");
  const [size, setSize] = useState("");
  const [inclusions, setInclusions] = useState("No inclusion");
  const [inclusionQty, setInclusionQty] = useState(0);
  const [abutmentDetail, setAbutmentDetail] = useState("");
  const [abutmentType, setAbutmentType] = useState("");

  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [abutmentDetailDropdownOpen, setAbutmentDetailDropdownOpen] = useState(false);
  const [abutmentTypeDropdownOpen, setAbutmentTypeDropdownOpen] = useState(false);

  const platforms = brand ? implantBrandPlatforms[brand] || [] : [];

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

  const borderColor = isComplete && !caseSubmitted ? "border-[#34a853]" : isComplete ? "border-[#b4b0b0]" : "border-[#CF0202]";
  const legendColor = isComplete && !caseSubmitted ? "text-[#34a853]" : isComplete ? "text-[#7f7f7f]" : "text-[#CF0202]";

  // Dynamic legend label based on current step
  const legendLabel = !brand
    ? "Select implant brand"
    : !platform
    ? "Select implant platform"
    : "Implant Detail";

  return (
    <fieldset className={`border rounded-[7.7px] p-0 bg-white ${borderColor}`}>
      <legend className={`text-[12.8px] px-1 leading-none ml-2 ${legendColor}`}>
        {legendLabel}
      </legend>
      <div className="flex flex-col sm:flex-row">
        {/* Left section - tooth number */}
        <div className="flex justify-center items-center sm:w-[90px] shrink-0 py-2 sm:py-0">
          <span className="text-xl text-[#7f7f7f] text-center">
            #{toothNumber}
          </span>
        </div>
        {/* Right section - form fields */}
        <div className="flex flex-col p-2.5 sm:pl-0 sm:pr-2.5 sm:py-2.5 gap-3 flex-1 min-w-0">

          {/* Implant Brand — gallery while selecting */}
          {!brand && (
            <CardGallery
              options={implantBrandList}
              value={brand}
              onChange={(v) => {
                setBrand(v);
                setPlatform("");
              }}
            />
          )}

          {/* Implant Platform — gallery while selecting (after brand chosen) */}
          {brand && !platform && (
            <CardGallery
              options={platforms}
              value={platform}
              onChange={(v) => {
                setPlatform(v);
              }}
            />
          )}

          {/* Row 1: Brand + Platform + Size — all on one row once both are selected */}
          {brand && platform && (
            <div className="grid grid-cols-3 gap-3">
              <CardSelectorField
                label="Implant Brand"
                value={brand}
                caseSubmitted={caseSubmitted}
                onClick={() => {
                  setBrand("");
                  setPlatform("");
                  setSize("");
                }}
              />
              <CardSelectorField
                label="Implant Platform"
                value={platform}
                caseSubmitted={caseSubmitted}
                onClick={() => {
                  setPlatform("");
                  setSize("");
                }}
              />
              <SelectField
                label="Implant Size"
                value={size}
                options={implantSizes}
                caseSubmitted={caseSubmitted}
                onChange={(v) => {
                  setSize(v);
                  setSizeDropdownOpen(false);
                }}
                open={sizeDropdownOpen}
                onOpenChange={setSizeDropdownOpen}
              />
            </div>
          )}

          {/* Row 2: Implant Inclusions — visible after Brand + Platform + Size complete */}
          {row2Visible && (
            <ImplantInclusionsField
              label="Implant inclusions"
              value={inclusions}
              quantity={inclusionQty}
              onChange={setInclusions}
              onQuantityChange={setInclusionQty}
              autoOpenWhenVisible
              caseSubmitted={caseSubmitted}
            />
          )}

          {/* Row 3: Abutment Detail and Type — visible after inclusions complete */}
          {row3Visible && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <SelectField
                label="Abutment Detail"
                emptyLabel="Select abutment detail"
                value={abutmentDetail}
                options={abutmentDetailOptions}
                caseSubmitted={caseSubmitted}
                onChange={(v) => {
                  setAbutmentDetail(v);
                  setAbutmentDetailDropdownOpen(false);
                }}
                open={abutmentDetailDropdownOpen}
                onOpenChange={setAbutmentDetailDropdownOpen}
              />
              <SelectField
                label="Abutment Type"
                emptyLabel="Select abutment type"
                value={abutmentType}
                options={abutmentTypeOptions}
                caseSubmitted={caseSubmitted}
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
