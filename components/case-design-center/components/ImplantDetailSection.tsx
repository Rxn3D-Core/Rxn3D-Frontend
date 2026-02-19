"use client";

import { useState } from "react";
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
}

export function ImplantDetailSection({ toothNumber }: ImplantDetailSectionProps) {
  const [brand, setBrand] = useState("");
  const [platform, setPlatform] = useState("");
  const [size, setSize] = useState("");
  const [inclusions, setInclusions] = useState("");
  const [inclusionQty, setInclusionQty] = useState(0);
  const [abutmentDetail, setAbutmentDetail] = useState("");
  const [abutmentType, setAbutmentType] = useState("");

  const [activeCardType, setActiveCardType] = useState<ActiveCardType["right1"]>(null);

  const platforms = brand ? implantBrandPlatforms[brand] || [] : [];

  const isComplete =
    !!brand &&
    !!platform &&
    !!size &&
    !!inclusions.trim() &&
    !!abutmentDetail &&
    !!abutmentType;

  return (
    <fieldset
      className={`border rounded-[7.7px] p-0 bg-white ${
        isComplete ? "border-[#34a853]" : "border-[#7f7f7f]"
      }`}
    >
      <legend
        className={`text-[12.8px] px-1 leading-none ml-2 ${
          isComplete ? "text-[#34a853]" : "text-[#7f7f7f]"
        }`}
      >
        Implant Detail
      </legend>
      <div className="flex flex-col sm:flex-row">
        {/* Left section - tooth number */}
        <div className="flex justify-center items-center sm:w-[90px] shrink-0 py-2 sm:py-0">
          <span className="text-[20px] text-[#7f7f7f] text-center">
            #{toothNumber}
          </span>
        </div>
        {/* Right section - form fields */}
        <div className="flex flex-col p-2.5 sm:pl-0 sm:pr-2.5 sm:py-2.5 gap-3 flex-1 min-w-0">
          {/* Row 1: Implant Brand, Platform, Size - 3 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <CardSelectorField
              label="Implant Brand"
              value={brand}
              isActive={activeCardType === "brand"}
              onClick={() => {
                setActiveCardType((prev) => (prev === "brand" ? null : "brand"));
              }}
            />

            <CardSelectorField
              label="Implant Platform"
              value={platform}
              required={!platform}
              isActive={activeCardType === "platform"}
              onClick={() => {
                if (!brand) return;
                setActiveCardType((prev) => (prev === "platform" ? null : "platform"));
              }}
            />

            <SelectField
              label="Implant Size"
              value={size}
              options={implantSizes}
              onChange={setSize}
            />

            {/* Card Gallery - appears below the 3 fields when brand or platform is active */}
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

          {/* Row 2: Implant Inclusions - full width */}
          <ImplantInclusionsField
            label="Implant inclusions"
            value={inclusions}
            quantity={inclusionQty}
            onChange={setInclusions}
            onQuantityChange={setInclusionQty}
          />

          {/* Row 3: Abutment Detail and Type - 2 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <SelectField
              label="Abutment Detail"
              value={abutmentDetail}
              options={abutmentDetailOptions}
              onChange={setAbutmentDetail}
            />
            <SelectField
              label="Abutment Type"
              value={abutmentType}
              options={abutmentTypeOptions}
              onChange={setAbutmentType}
            />
          </div>
        </div>
      </div>
    </fieldset>
  );
}
