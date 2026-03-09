"use client";

import { useRef, useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  FieldInput,
  ShadeField,
} from "./fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Arch,
  ShadeFieldType,
  ProductApiData,
  RetentionType,
} from "../types";
import type { FieldStep } from "../hooks/useToothFieldProgress";
import { ImplantDetailSection } from "./ImplantDetailSection";

/* ------------------------------------------------------------------ */
/*  Articulator icon (Stage field)                                     */
/* ------------------------------------------------------------------ */
function ArticulatorIcon({ arch }: { arch: "mandibular" | "maxillary" }) {
  const patternId = `pattern0_${arch}`;
  const imageId = `image0_${arch}`;
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <rect
        width="31.5133"
        height="31.5133"
        rx="1.28103"
        fill={`url(#${patternId})`}
      />
      <defs>
        <pattern
          id={patternId}
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlinkHref={`#${imageId}`}
            transform="translate(0 -0.166667) scale(0.000326797)"
          />
        </pattern>
      </defs>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  hasAdvanceField                                                     */
/* ------------------------------------------------------------------ */
/**
 * Check whether a FIXED_FIELD_STEPS key has a matching advance_field in the product API response.
 * Returns true (show the field) when:
 *  - No advance_fields on the product (show all — no gating)
 *  - The step always shows regardless of advance_fields (stage, impression, addons, notes)
 *  - A matching advance_field name is found
 */
export function hasAdvanceField(
  step: string,
  advanceFields: Array<{ name: string; field_type: string }> | undefined
): boolean {
  const alwaysShow = ["fixed_stage", "fixed_impression", "stage", "impression"];
  if (alwaysShow.includes(step)) return true;
  if (!advanceFields || advanceFields.length === 0) return true;

  const names = advanceFields.map((f) => (f.name || "").toLowerCase());

  switch (step) {
    // Fixed restoration steps
    case "fixed_stump_shade":
      return names.some((n) => n.includes("stump") && n.includes("shade"));
    case "fixed_shade_trio":
      return names.some(
        (n) =>
          (n.includes("tooth") && n.includes("shade")) ||
          (n.includes("crown") && n.includes("shade")) ||
          n.includes("cervical") ||
          n.includes("incisal") ||
          n.includes("body shade")
      );
    case "fixed_characterization":
      return names.some((n) => n.includes("characterization") || n.includes("character"));
    case "fixed_contact_icons":
      return names.some(
        (n) =>
          n.includes("occlusal") ||
          n.includes("pontic") ||
          n.includes("embrasure") ||
          (n.includes("proximal") && n.includes("contact"))
      );
    case "fixed_margin":
      return names.some((n) => n.includes("margin"));
    case "fixed_metal":
      return names.some((n) => n.includes("metal"));
    case "fixed_proximal_contact":
      return names.some((n) => n.includes("proximal") && n.includes("contact"));
    case "fixed_addons":
      return names.some((n) => n.includes("add") && (n.includes("on") || n.includes("addon")));
    case "fixed_notes":
      return names.some((n) => n.includes("note") || n.includes("additional"));
    // Removable restoration steps
    case "grade":
      return names.some((n) => n.includes("grade"));
    case "teeth_shade":
      return names.some((n) => n.includes("teeth") && n.includes("shade"));
    case "gum_shade":
      return names.some((n) => n.includes("gum") && n.includes("shade"));
    case "addons":
      return names.some((n) => n.includes("add") && (n.includes("on") || n.includes("addon")));
    default:
      return true;
  }
}

/* ------------------------------------------------------------------ */
/*  getAdvanceFieldsForStep                                            */
/* ------------------------------------------------------------------ */
/** Get advance fields from the API that match a given step pattern */
export function getAdvanceFieldsForStep(
  step: string,
  advanceFields: Array<{ id: number; name: string; field_type: string; options?: any[]; is_required?: string; sequence?: number; [key: string]: any }> | undefined
): Array<{ id: number; name: string; field_type: string; options?: any[]; is_required?: string; sequence?: number; [key: string]: any }> {
  if (!advanceFields || advanceFields.length === 0) return [];

  const matchers: Record<string, (n: string) => boolean> = {
    fixed_contact_icons: (n) => n.includes("occlusal") || n.includes("pontic") || n.includes("embrasure") || (n.includes("proximal") && n.includes("contact") && !n.includes("mesial") && !n.includes("distal")),
    fixed_proximal_contact: (n) => (n.includes("proximal") && n.includes("contact") && (n.includes("mesial") || n.includes("distal"))) || n.includes("functional guidance"),
    fixed_margin: (n) => n.includes("margin"),
    fixed_metal: (n) => n.includes("metal"),
  };

  const matcher = matchers[step];
  if (!matcher) return [];

  return advanceFields
    .filter((f) => matcher((f.name || "").toLowerCase()))
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
}

/* ------------------------------------------------------------------ */
/*  AdvanceFieldSelect                                                 */
/* ------------------------------------------------------------------ */
/** Advance field dropdown that auto-selects default option and auto-opens when no value. */
function AdvanceFieldSelect({
  fieldId,
  fieldName,
  activeOptions,
  currentSelection,
  borderColor,
  labelColor,
  onSelect,
  caseSubmitted,
}: {
  fieldId: number;
  fieldName: string;
  activeOptions: Array<{ id: number; name: string; is_default?: string; [key: string]: any }>;
  currentSelection: { name: string; optionId: number } | undefined;
  borderColor: string;
  labelColor: string;
  onSelect: (opt: { id: number; name: string }) => void;
  caseSubmitted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasAutoSelected = useRef(false);

  // Auto-select the default option on mount if no current selection
  useEffect(() => {
    if (!currentSelection && !hasAutoSelected.current) {
      hasAutoSelected.current = true;
      const defaultOpt = activeOptions.find((o) => o.is_default === "Yes");
      if (defaultOpt) {
        onSelect(defaultOpt);
      }
    }
  }, [currentSelection, activeOptions, onSelect]);

  const hasVal = !!currentSelection;

  return (
    <fieldset
      className="border rounded px-3 py-0 relative h-[42px] flex items-center min-w-0 cursor-pointer hover:bg-gray-50 transition-colors"
      style={{ borderColor }}
      onClick={() => setOpen(true)}
    >
      <legend className="text-sm px-1 leading-none whitespace-nowrap" style={{ color: labelColor }}>
        {fieldName}
      </legend>
      <Select
        open={open}
        onOpenChange={setOpen}
        value={currentSelection?.optionId?.toString() || ""}
        onValueChange={(value) => {
          const opt = activeOptions.find((o) => o.id?.toString() === value);
          if (opt) onSelect(opt);
        }}
      >
        <SelectTrigger
          className="border-0 shadow-none p-0 h-auto focus:ring-0 focus:ring-offset-0 [&>svg]:hidden text-lg font-normal text-[#000000] min-w-0 w-full"
        >
          <SelectValue>
            {currentSelection ? currentSelection.name : ''}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {activeOptions.map((option) => (
            <SelectItem key={option.id} value={option.id.toString()}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasVal && !caseSubmitted && <Check size={16} className="text-[#34a853] ml-auto flex-shrink-0" />}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/*  FixedRestorationFields props                                       */
/* ------------------------------------------------------------------ */
interface FixedRestorationFieldsProps {
  arch: "mandibular" | "maxillary";
  firstToothNumber: number;
  groupStageToothNumber: number;
  groupStageProductIdFixed: string;
  selectedProduct: ProductApiData | null;
  toothNumbers: number[];
  retentionTypes: string[];
  caseSubmitted: boolean;
  fixedShadeIncomplete: boolean;
  selectedShadeGuide: string;
  selectedStages: Record<string, string>;
  retentionTypesMap: Record<number, string[]>;
  implantDetailCompleteByTooth: Record<number, boolean>;
  setImplantDetailCompleteByTooth: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  isFieldVisible: (arch: Arch, toothNumber: number, step: FieldStep, fixedChain?: readonly string[]) => boolean;
  isFieldCompleted: (arch: Arch, toothNumber: number, step: FieldStep) => boolean;
  getFieldValue: (arch: Arch, toothNumber: number, step: FieldStep) => string;
  completeFieldStep: (arch: Arch, toothNumber: number, step: FieldStep, value: string) => void;
  storeFieldValue: (arch: Arch, toothNumber: number, step: FieldStep, value: string) => void;
  uncompleteFieldStep: (arch: Arch, toothNumber: number, step: FieldStep) => void;
  isFixed: (step: string) => boolean;
  getSelectedShade: (productId: string, arch: string, shadeType: string) => any;
  handleOpenStageModal: (productId: string, arch?: Arch, toothNumber?: number) => void;
  handleShadeFieldClick: (arch: Arch, fieldType: ShadeFieldType, productId: string) => void;
  handleOpenImpressionModal: (arch: Arch, productId: string, toothNumber?: number) => void;
  handleOpenAddOnsModal: (arch: Arch, productId: string, toothNumber?: number) => void;
  getImpressionDisplayText: (productId: string, arch: string) => string;
}

/* ------------------------------------------------------------------ */
/*  FixedRestorationFields component                                   */
/* ------------------------------------------------------------------ */
export function FixedRestorationFields({
  arch,
  firstToothNumber,
  groupStageToothNumber,
  groupStageProductIdFixed,
  selectedProduct,
  toothNumbers,
  retentionTypes,
  caseSubmitted,
  fixedShadeIncomplete,
  selectedShadeGuide,
  selectedStages,
  retentionTypesMap,
  implantDetailCompleteByTooth,
  setImplantDetailCompleteByTooth,
  isFieldVisible,
  isFieldCompleted,
  getFieldValue,
  completeFieldStep,
  storeFieldValue,
  uncompleteFieldStep,
  isFixed,
  getSelectedShade,
  handleOpenStageModal,
  handleShadeFieldClick,
  handleOpenImpressionModal,
  handleOpenAddOnsModal,
  getImpressionDisplayText,
}: FixedRestorationFieldsProps) {
  return (
    <>
      {/* ===== FIXED RESTORATION: Progressive step-by-step fields ===== */}

      {/* Product - Material / Retention Type — always shown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FieldInput
          label="Product - Material"
          value={selectedProduct?.name || ""}
          submitted={caseSubmitted}
        />
        <FieldInput
          label="Retention Type"
          value={retentionTypes.includes("Implant") ? "Screwed" : "Cemented"}
          submitted={caseSubmitted}
        />
      </div>

      {/* All remaining fields hidden until both shades are selected */}
      {!fixedShadeIncomplete && <>

      {/* Step 1 & 2: Stage and Stump Shade in one row */}
      {(isFixed("fixed_stage") || (isFixed("fixed_stump_shade") && hasAdvanceField("fixed_stump_shade", selectedProduct?.advance_fields))) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {isFixed("fixed_stage") && (() => {
            const fixedStageValue = selectedStages[groupStageProductIdFixed] || getFieldValue(arch, groupStageToothNumber, "fixed_stage");
            const isStageComplete = isFieldCompleted(arch, groupStageToothNumber, "fixed_stage") || !!(fixedStageValue && fixedStageValue.trim());
            const showStageGreen = isStageComplete && !caseSubmitted;
            return (
            <fieldset
              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                showStageGreen ? "border-[#34a853]" : isStageComplete ? "border-[#b4b0b0]" : "border-[#CF0202]"
              }`}
              onClick={() => {
                handleOpenStageModal(groupStageProductIdFixed, arch, groupStageToothNumber);
              }}
            >
              <legend className={`text-sm px-1 leading-none ${showStageGreen ? "text-[#34a853]" : isStageComplete ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>
                Stage
              </legend>
              <div className="flex items-center gap-2 w-full">
                <span className="text-[14px] sm:text-lg text-[#000000]">
                  {fixedStageValue}
                </span>
                {showStageGreen && (
                  <Check size={16} className="text-[#34a853] ml-auto" />
                )}
                <div className={showStageGreen ? "" : "ml-auto"}>
                  <ArticulatorIcon arch={arch} />
                </div>
              </div>
            </fieldset>
            );
          })()}
          {isFixed("fixed_stump_shade") && hasAdvanceField("fixed_stump_shade", selectedProduct?.advance_fields) && (
            <ShadeField
              label="Stump Shade"
              value={selectedShadeGuide}
              shade={getSelectedShade(`fixed_${firstToothNumber}`, arch, "stump_shade")}
              onClick={() => handleShadeFieldClick(arch, "stump_shade", `fixed_${firstToothNumber}`)}
              submitted={caseSubmitted}
            />
          )}
        </div>
      )}

      {/* Step 3: Cervical / Incisal / Body Shade (no Tooth Shade field) */}
      {isFixed("fixed_shade_trio") && hasAdvanceField("fixed_shade_trio", selectedProduct?.advance_fields) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ShadeField
            label="Cervical Shade"
            value={selectedShadeGuide}
            shade={getSelectedShade(`fixed_${firstToothNumber}`, arch, "tooth_shade")}
            onClick={() => {
              handleShadeFieldClick(arch, "tooth_shade", `fixed_${firstToothNumber}`);
              if (!isFieldCompleted(arch, firstToothNumber, "fixed_shade_trio")) {
                completeFieldStep(arch, firstToothNumber, "fixed_shade_trio", "selected");
              }
            }}
            submitted={caseSubmitted}
          />
          <ShadeField
            label="Incisal Shade"
            value={selectedShadeGuide}
            shade={getSelectedShade(`fixed_${firstToothNumber}`, arch, "tooth_shade")}
            onClick={() => handleShadeFieldClick(arch, "tooth_shade", `fixed_${firstToothNumber}`)}
            submitted={caseSubmitted}
          />
          <ShadeField
            label="Body Shade"
            value={selectedShadeGuide}
            shade={getSelectedShade(`fixed_${firstToothNumber}`, arch, "tooth_shade")}
            onClick={() => handleShadeFieldClick(arch, "tooth_shade", `fixed_${firstToothNumber}`)}
            submitted={caseSubmitted}
          />
        </div>
      )}

      {/* Implant Detail - shown after shade selection, always when applicable */}
      {toothNumbers.some((n) => (retentionTypesMap[n] || []).includes("Implant")) && (
        <ImplantDetailSection
          toothNumber={firstToothNumber}
          onCompleteChange={(complete) => setImplantDetailCompleteByTooth((prev) => ({ ...prev, [firstToothNumber]: complete }))}
          caseSubmitted={caseSubmitted}
        />
      )}

      {/* Step 4: Characterization / Intensity / Surface finish */}
      {isFixed("fixed_characterization") && hasAdvanceField("fixed_characterization", selectedProduct?.advance_fields) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <fieldset
            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
              isFieldCompleted(arch, firstToothNumber, "fixed_characterization") && !caseSubmitted ? "border-[#34a853]" : isFieldCompleted(arch, firstToothNumber, "fixed_characterization") ? "border-[#b4b0b0]" : "border-[#CF0202]"
            }`}
            onClick={() => {
              if (!isFieldCompleted(arch, firstToothNumber, "fixed_characterization")) {
                completeFieldStep(arch, firstToothNumber, "fixed_characterization", "selected");
              }
            }}
          >
            <legend className={`text-sm px-1 leading-none ${isFieldCompleted(arch, firstToothNumber, "fixed_characterization") && !caseSubmitted ? "text-[#34a853]" : isFieldCompleted(arch, firstToothNumber, "fixed_characterization") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>
              Characterization
            </legend>
            <div className="flex items-center gap-2 w-full">
              <span className="text-[14px] sm:text-lg text-[#000000]">{getFieldValue(arch, firstToothNumber, "fixed_characterization")}</span>
              {isFieldCompleted(arch, firstToothNumber, "fixed_characterization") && !caseSubmitted && <Check size={16} className="text-[#34a853] ml-auto" />}
            </div>
          </fieldset>
          <fieldset className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${isFieldCompleted(arch, firstToothNumber, "fixed_characterization") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"}`}>
            <legend className={`text-sm px-1 leading-none ${isFieldCompleted(arch, firstToothNumber, "fixed_characterization") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>Intensity</legend>
            <span className="text-[14px] sm:text-lg text-[#000000]"></span>
          </fieldset>
          <fieldset className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${isFieldCompleted(arch, firstToothNumber, "fixed_characterization") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"}`}>
            <legend className={`text-sm px-1 leading-none ${isFieldCompleted(arch, firstToothNumber, "fixed_characterization") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>Surface finish</legend>
            <span className="text-[14px] sm:text-lg text-[#000000]"></span>
          </fieldset>
        </div>
      )}

      {/* Step 5: Dynamic advance fields — progressive: show one by one, auto-open dropdown */}
      {isFixed("fixed_contact_icons") && hasAdvanceField("fixed_contact_icons", selectedProduct?.advance_fields) && (() => {
        const contactFields = getAdvanceFieldsForStep("fixed_contact_icons", selectedProduct?.advance_fields);
        if (contactFields.length === 0) {
          // No matching fields — auto-complete so chain progresses
          if (!isFieldCompleted(arch, firstToothNumber, "fixed_contact_icons")) {
            completeFieldStep(arch, firstToothNumber, "fixed_contact_icons", "auto");
          }
          return null;
        }
        const fieldVal = getFieldValue(arch, firstToothNumber, "fixed_contact_icons");
        let storedValues: Record<string, { name: string; optionId: number }> = {};
        try { if (fieldVal && fieldVal.startsWith("{")) storedValues = JSON.parse(fieldVal); } catch {}

        const fieldsWithOptions = contactFields.filter((f) => {
          const opts = (f.options || []).filter((o: any) => o.status === "Active" || o.status === undefined);
          return opts.length > 0;
        });
        const isSubFieldVisible = (index: number) => {
          for (let i = 0; i < index; i++) {
            if (!storedValues[fieldsWithOptions[i].id]) return false;
          }
          return true;
        };

        const visibleFields = contactFields.filter((field) => {
          const activeOptions = (field.options || [])
            .filter((opt: any) => opt.status === "Active" || opt.status === undefined);
          if (activeOptions.length === 0) return true;
          const fieldIdx = fieldsWithOptions.findIndex((f) => f.id === field.id);
          return fieldIdx >= 0 && isSubFieldVisible(fieldIdx);
        });
        const colCount = Math.min(visibleFields.length, 4);

        return (
          <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
            {visibleFields.map((field) => {
              const activeOptions = (field.options || [])
                .filter((opt: any) => opt.status === "Active" || opt.status === undefined)
                .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
              const currentSelection = storedValues[field.id];
              const hasFieldOptions = activeOptions.length > 0;
              const hasVal = !!currentSelection;
              const borderColor = hasVal && !caseSubmitted ? '#119933' : hasVal ? '#b4b0b0' : '#CF0202';
              const labelColor = hasVal && !caseSubmitted ? '#119933' : hasVal ? '#b4b0b0' : '#CF0202';

              if (!hasFieldOptions) {
                const stepCompleted = isFieldCompleted(arch, firstToothNumber, "fixed_contact_icons");
                return (
                  <fieldset
                    key={field.id}
                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${
                      stepCompleted && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"
                    }`}
                  >
                    <legend className={`text-sm px-1 leading-none ${stepCompleted && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
                      {field.name}
                    </legend>
                    <span className="text-[14px] sm:text-lg text-[#000000]"></span>
                  </fieldset>
                );
              }

              return (
                <AdvanceFieldSelect
                  key={field.id}
                  fieldId={field.id}
                  fieldName={field.name}
                  activeOptions={activeOptions}
                  currentSelection={currentSelection}
                  borderColor={borderColor}
                  labelColor={labelColor}
                  caseSubmitted={caseSubmitted}
                  onSelect={(opt) => {
                    const updated = { ...storedValues, [field.id]: { name: opt.name, optionId: opt.id } };
                    const allFilled = fieldsWithOptions.every((f) => updated[f.id]);
                    if (allFilled) {
                      completeFieldStep(arch, firstToothNumber, "fixed_contact_icons", JSON.stringify(updated));
                    } else {
                      storeFieldValue(arch, firstToothNumber, "fixed_contact_icons", JSON.stringify(updated));
                      uncompleteFieldStep(arch, firstToothNumber, "fixed_contact_icons");
                    }
                  }}
                />
              );
            })}
          </div>
        );
      })()}

      {/* Step 6: Margin Design / Margin Depth / Occlusal Reduction / Axial Reduction */}
      {isFixed("fixed_margin") && hasAdvanceField("fixed_margin", selectedProduct?.advance_fields) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["Margin Design", "Margin Depth", "Occlusal Reduction", "Axial Reduction"].map((label, idx) => {
            const isCompleted = isFieldCompleted(arch, firstToothNumber, "fixed_margin");
            const showGreen = isCompleted && !caseSubmitted;
            return (
              <fieldset
                key={label}
                className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                  showGreen ? "border-[#34a853]" : idx === 0 ? "border-[#CF0202]" : "border-[#d9d9d9]"
                }`}
                onClick={() => {
                  if (!isCompleted) completeFieldStep(arch, firstToothNumber, "fixed_margin", "selected");
                }}
              >
                <legend className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : idx === 0 ? "text-[#CF0202]" : "text-[#7f7f7f]"}`}>{label}</legend>
                <div className="flex items-center gap-2 w-full">
                  <span className="text-[14px] sm:text-lg text-[#000000]"></span>
                  {showGreen && idx === 0 && <Check size={16} className="text-[#34a853] ml-auto" />}
                </div>
              </fieldset>
            );
          })}
        </div>
      )}

      {/* Step 7: Metal Design / Metal Thickness / Modification */}
      {isFixed("fixed_metal") && hasAdvanceField("fixed_metal", selectedProduct?.advance_fields) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {["Metal Design", "Metal Thickness", "Modification"].map((label, idx) => {
            const isCompleted = isFieldCompleted(arch, firstToothNumber, "fixed_metal");
            const showGreen = isCompleted && !caseSubmitted;
            return (
              <fieldset
                key={label}
                className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                  showGreen ? "border-[#34a853]" : idx === 0 ? "border-[#CF0202]" : "border-[#d9d9d9]"
                }`}
                onClick={() => {
                  if (!isCompleted) completeFieldStep(arch, firstToothNumber, "fixed_metal", "selected");
                }}
              >
                <legend className={`text-sm px-1 leading-none ${showGreen ? "text-[#34a853]" : idx === 0 ? "text-[#CF0202]" : "text-[#7f7f7f]"}`}>{label}</legend>
                <div className="flex items-center gap-2 w-full">
                  <span className="text-[14px] sm:text-lg text-[#000000]"></span>
                  {showGreen && idx === 0 && <Check size={16} className="text-[#34a853] ml-auto" />}
                </div>
              </fieldset>
            );
          })}
        </div>
      )}

      {/* Step 8: Dynamic advance fields — progressive: show one by one, auto-open dropdown */}
      {isFixed("fixed_proximal_contact") && hasAdvanceField("fixed_proximal_contact", selectedProduct?.advance_fields) && (() => {
        const proximalFields = getAdvanceFieldsForStep("fixed_proximal_contact", selectedProduct?.advance_fields);
        if (proximalFields.length === 0) {
          if (!isFieldCompleted(arch, firstToothNumber, "fixed_proximal_contact")) {
            completeFieldStep(arch, firstToothNumber, "fixed_proximal_contact", "auto");
          }
          return null;
        }
        const fieldVal = getFieldValue(arch, firstToothNumber, "fixed_proximal_contact");
        let storedValues: Record<string, { name: string; optionId: number }> = {};
        try { if (fieldVal && fieldVal.startsWith("{")) storedValues = JSON.parse(fieldVal); } catch {}

        const fieldsWithOptions = proximalFields.filter((f) => {
          const opts = (f.options || []).filter((o: any) => o.status === "Active" || o.status === undefined);
          return opts.length > 0;
        });
        const isSubFieldVisible = (index: number) => {
          for (let i = 0; i < index; i++) {
            if (!storedValues[fieldsWithOptions[i].id]) return false;
          }
          return true;
        };

        const visibleFields = proximalFields.filter((field) => {
          const activeOptions = (field.options || [])
            .filter((opt: any) => opt.status === "Active" || opt.status === undefined);
          if (activeOptions.length === 0) return true;
          const fieldIdx = fieldsWithOptions.findIndex((f) => f.id === field.id);
          return fieldIdx >= 0 && isSubFieldVisible(fieldIdx);
        });
        const colCount = Math.min(visibleFields.length, 4);

        return (
          <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
            {visibleFields.map((field) => {
              const activeOptions = (field.options || [])
                .filter((opt: any) => opt.status === "Active" || opt.status === undefined)
                .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
              const currentSelection = storedValues[field.id];
              const hasFieldOptions = activeOptions.length > 0;
              const hasVal = !!currentSelection;
              const borderColor = hasVal && !caseSubmitted ? '#119933' : hasVal ? '#b4b0b0' : '#CF0202';
              const labelColor = hasVal && !caseSubmitted ? '#119933' : hasVal ? '#b4b0b0' : '#CF0202';

              if (!hasFieldOptions) {
                const stepCompleted = isFieldCompleted(arch, firstToothNumber, "fixed_proximal_contact");
                return (
                  <fieldset
                    key={field.id}
                    className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${
                      stepCompleted && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"
                    }`}
                  >
                    <legend className={`text-sm px-1 leading-none ${stepCompleted && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
                      {field.name}
                    </legend>
                    <span className="text-[14px] sm:text-lg text-[#000000]"></span>
                  </fieldset>
                );
              }

              return (
                <AdvanceFieldSelect
                  key={field.id}
                  fieldId={field.id}
                  fieldName={field.name}
                  activeOptions={activeOptions}
                  currentSelection={currentSelection}
                  borderColor={borderColor}
                  labelColor={labelColor}
                  caseSubmitted={caseSubmitted}
                  onSelect={(opt) => {
                    const updated = { ...storedValues, [field.id]: { name: opt.name, optionId: opt.id } };
                    const allFilled = fieldsWithOptions.every((f) => updated[f.id]);
                    if (allFilled) {
                      completeFieldStep(arch, firstToothNumber, "fixed_proximal_contact", JSON.stringify(updated));
                    } else {
                      storeFieldValue(arch, firstToothNumber, "fixed_proximal_contact", JSON.stringify(updated));
                      uncompleteFieldStep(arch, firstToothNumber, "fixed_proximal_contact");
                    }
                  }}
                />
              );
            })}
          </div>
        );
      })()}

      {/* Step 9: Impression / Add ons */}
      {isFixed("fixed_impression") && !(toothNumbers.some((n) => (retentionTypesMap[n] || []).includes("Implant")) && implantDetailCompleteByTooth[firstToothNumber] !== true) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <fieldset
            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
              isFieldCompleted(arch, firstToothNumber, "fixed_impression") && !caseSubmitted ? "border-[#34a853]" : isFieldCompleted(arch, firstToothNumber, "fixed_impression") ? "border-[#b4b0b0]" : "border-[#CF0202]"
            }`}
            onClick={() => {
              const hasImplantForm = toothNumbers.some((n) => (retentionTypesMap[n] || []).includes("Implant"));
              if (hasImplantForm && implantDetailCompleteByTooth[firstToothNumber] !== true) return;
              handleOpenImpressionModal(arch, selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, firstToothNumber);
            }}
          >
            <legend className={`text-sm px-1 leading-none ${isFieldCompleted(arch, firstToothNumber, "fixed_impression") && !caseSubmitted ? "text-[#34a853]" : isFieldCompleted(arch, firstToothNumber, "fixed_impression") ? "text-[#7f7f7f]" : "text-[#CF0202]"}`}>
              Impression
            </legend>
            <div className="flex items-center gap-2 w-full">
              <span className="text-[14px] sm:text-lg text-[#000000] truncate">
                {getImpressionDisplayText(selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, arch)}
              </span>
              {isFieldCompleted(arch, firstToothNumber, "fixed_impression") && !caseSubmitted && (
                <Check size={16} className="text-[#34a853] ml-auto" />
              )}
            </div>
          </fieldset>

          {isFixed("fixed_addons") ? (
            <fieldset
              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                isFieldCompleted(arch, firstToothNumber, "fixed_addons") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"
              }`}
              onClick={() => {
                handleOpenAddOnsModal(arch, selectedProduct?.id?.toString() || `fixed_${firstToothNumber}`, firstToothNumber);
              }}
            >
              <legend className={`text-sm px-1 leading-none ${isFieldCompleted(arch, firstToothNumber, "fixed_addons") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
                Add ons
              </legend>
              <div className="flex items-center gap-2 w-full">
                <span className="text-[14px] sm:text-lg text-[#000000] truncate">
                  {getFieldValue(arch, firstToothNumber, "fixed_addons") || "No add on selected"}
                </span>
                {isFieldCompleted(arch, firstToothNumber, "fixed_addons") && !caseSubmitted && (
                  <Check size={16} className="text-[#34a853] ml-auto" />
                )}
              </div>
            </fieldset>
          ) : (
            <div />
          )}
        </div>
      )}

      {/* Additional notes — only shown when advance_fields includes a notes field */}
      {isFixed("fixed_notes") && (
        <fieldset
          className={`border rounded px-3 pb-2 pt-0 ${
            isFieldCompleted(arch, firstToothNumber, "fixed_notes") && !caseSubmitted ? "border-[#34a853]" : "border-[#d9d9d9]"
          }`}
        >
          <legend className={`text-sm px-1 leading-none ${isFieldCompleted(arch, firstToothNumber, "fixed_notes") && !caseSubmitted ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
            Additional notes
          </legend>
          <textarea
            rows={3}
            placeholder="Enter additional notes..."
            className="w-full text-xs text-[#1d1d1b] bg-transparent outline-none leading-relaxed resize-none"
            onChange={(e) => {
              if (e.target.value && !isFieldCompleted(arch, firstToothNumber, "fixed_notes")) {
                completeFieldStep(arch, firstToothNumber, "fixed_notes", e.target.value);
              }
            }}
          />
        </fieldset>
      )}

      </>}
    </>
  );
}
