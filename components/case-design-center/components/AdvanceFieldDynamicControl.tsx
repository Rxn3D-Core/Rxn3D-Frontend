"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Upload } from "lucide-react";
import { Check as CustomCheck } from "@/components/ui/custom-check";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  buildCheckboxSelection,
  buildFileSelection,
  buildSingleOptionSelection,
  buildTextSelection,
  getPlainTextValue,
  getSelectedOptionIds,
  isCheckboxAdvanceField,
  isFileUploadAdvanceField,
  isOptionBasedAdvanceField,
  isRadioAdvanceField,
  isTextAdvanceField,
  normalizeAdvanceFieldType,
  toggleCheckboxOption,
  type StoredAdvanceSelection,
} from "../utils/advanceFieldStepHelpers";

export type AdvanceFieldOption = {
  id: number;
  name: string;
  is_default?: string;
  image_url?: string | null;
  sequence?: number;
  status?: string;
};

export type AdvanceFieldDefinition = {
  id: number;
  name: string;
  field_type?: string;
};

type AdvanceFieldDynamicControlProps = {
  field: AdvanceFieldDefinition;
  activeOptions: AdvanceFieldOption[];
  currentSelection: StoredAdvanceSelection | undefined;
  borderColor: string;
  labelColor: string;
  caseSubmitted?: boolean;
  onUpdate: (selection: StoredAdvanceSelection) => void;
  onFileChange?: (file: File | null) => void;
};

function SelectedOptionsDisplay({
  activeOptions,
  selectedOptionIds,
  multi,
}: {
  activeOptions: AdvanceFieldOption[];
  selectedOptionIds: number[];
  multi: boolean;
}) {
  const selected = activeOptions.filter((o) => selectedOptionIds.includes(o.id));

  if (selected.length === 0) {
    return <span className="text-sm text-[#7f7f7f] truncate">Select…</span>;
  }

  if (!multi && selected.length === 1) {
    const opt = selected[0];
    return (
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {opt.image_url ? (
          <img src={opt.image_url} alt={opt.name} className="h-8 w-8 object-contain flex-shrink-0" />
        ) : null}
        <span className="text-sm sm:text-lg text-[#000000] truncate">{opt.name}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
      {selected.map((opt) => (
        <div
          key={opt.id}
          className="flex items-center gap-1.5 min-w-0 max-w-full"
          title={opt.name}
        >
          {opt.image_url ? (
            <img src={opt.image_url} alt={opt.name} className="h-8 w-8 object-contain flex-shrink-0" />
          ) : null}
          <span className="text-sm text-[#000000] truncate max-w-[120px]">{opt.name}</span>
        </div>
      ))}
    </div>
  );
}

function OptionPickerPopover({
  field,
  activeOptions,
  currentSelection,
  borderColor,
  labelColor,
  caseSubmitted,
  onUpdate,
}: AdvanceFieldDynamicControlProps) {
  const [open, setOpen] = useState(false);
  const hasAutoSelected = useRef(false);
  const fieldType = normalizeAdvanceFieldType(field.field_type);
  const isCheckbox = isCheckboxAdvanceField(field);
  const isRadio = isRadioAdvanceField(field);
  const selectedOptionIds = getSelectedOptionIds(currentSelection);
  const hasVal = selectedOptionIds.length > 0;

  useEffect(() => {
    if (caseSubmitted || isCheckbox || currentSelection || hasAutoSelected.current) return;
    hasAutoSelected.current = true;
    const defaultOpt = activeOptions.find((o) => o.is_default === "Yes");
    if (defaultOpt) {
      onUpdate(buildSingleOptionSelection(defaultOpt));
    }
  }, [activeOptions, caseSubmitted, currentSelection, isCheckbox, onUpdate]);

  const handleSingleSelect = (opt: AdvanceFieldOption) => {
    onUpdate(buildSingleOptionSelection(opt));
    if (!isCheckbox) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <fieldset
        className="border rounded px-3 py-0 relative min-h-[42px] flex items-center min-w-0 cursor-pointer hover:bg-gray-50 transition-colors"
        style={{ borderColor }}
      >
        <legend className="text-sm px-1 leading-none whitespace-nowrap" style={{ color: labelColor }}>
          {field.name}
        </legend>
        <PopoverTrigger asChild disabled={caseSubmitted}>
          <button
            type="button"
            className="flex items-center gap-2 w-full min-w-0 py-2 pr-1 text-left bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              if (!caseSubmitted) setOpen(true);
            }}
          >
            <SelectedOptionsDisplay
              activeOptions={activeOptions}
              selectedOptionIds={selectedOptionIds}
              multi={isCheckbox}
            />
            <ChevronDown className="h-4 w-4 text-[#7f7f7f] flex-shrink-0 ml-auto" />
            {hasVal && !caseSubmitted ? (
              <CustomCheck size={16} className="text-[#34a853] flex-shrink-0" />
            ) : null}
          </button>
        </PopoverTrigger>
      </fieldset>

      <PopoverContent
        className="w-[min(400px,calc(100vw-2rem))] p-3 max-h-[320px] overflow-y-auto"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {isCheckbox ? (
          <div className="flex flex-col gap-2">
            {activeOptions.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-2 cursor-pointer text-sm text-[#000000] py-1"
              >
                <Checkbox
                  checked={selectedOptionIds.includes(option.id)}
                  disabled={caseSubmitted}
                  onCheckedChange={(checked) => {
                    onUpdate(
                      toggleCheckboxOption(
                        currentSelection,
                        option,
                        checked === true,
                        activeOptions,
                      ),
                    );
                  }}
                />
                {option.image_url ? (
                  <img
                    src={option.image_url}
                    alt={option.name}
                    className="h-8 w-8 object-contain flex-shrink-0"
                  />
                ) : null}
                <span>{option.name}</span>
              </label>
            ))}
          </div>
        ) : isRadio ? (
          <RadioGroup
            value={selectedOptionIds[0]?.toString() ?? ""}
            onValueChange={(value) => {
              const opt = activeOptions.find((o) => o.id.toString() === value);
              if (opt) handleSingleSelect(opt);
            }}
            className="gap-2"
          >
            {activeOptions.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-2 cursor-pointer text-sm text-[#000000] py-1"
              >
                <RadioGroupItem value={option.id.toString()} disabled={caseSubmitted} />
                {option.image_url ? (
                  <img
                    src={option.image_url}
                    alt={option.name}
                    className="h-8 w-8 object-contain flex-shrink-0"
                  />
                ) : null}
                <span>{option.name}</span>
              </label>
            ))}
          </RadioGroup>
        ) : (
          <div className="flex flex-col gap-1">
            {activeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={caseSubmitted}
                className={`flex items-center gap-2 w-full text-left px-2 py-2 rounded text-sm hover:bg-gray-100 ${
                  selectedOptionIds.includes(option.id) ? "bg-gray-50 font-medium" : ""
                }`}
                onClick={() => handleSingleSelect(option)}
              >
                {option.image_url ? (
                  <img
                    src={option.image_url}
                    alt={option.name}
                    className="h-8 w-8 object-contain flex-shrink-0"
                  />
                ) : null}
                <span>{option.name}</span>
                {selectedOptionIds.includes(option.id) ? (
                  <Check size={14} className="text-[#34a853] ml-auto flex-shrink-0" />
                ) : null}
              </button>
            ))}
          </div>
        )}
        {fieldType === "dropdown" || isRadio ? (
          <p className="text-xs text-[#7f7f7f] mt-2 sr-only">Single select ({fieldType})</p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function TextLikeControl({
  field,
  currentSelection,
  borderColor,
  labelColor,
  caseSubmitted,
  onUpdate,
  multiline,
  inputType = "text",
}: AdvanceFieldDynamicControlProps & {
  multiline?: boolean;
  inputType?: "text" | "number";
}) {
  const value = getPlainTextValue(currentSelection);
  const hasVal = value.length > 0;

  return (
    <fieldset
      className="border rounded px-3 py-2 relative min-w-0"
      style={{ borderColor }}
    >
      <legend className="text-sm px-1 leading-none whitespace-nowrap" style={{ color: labelColor }}>
        {field.name}
      </legend>
      <div className="flex items-center gap-2 w-full min-w-0 pt-0.5">
        {multiline ? (
          <Textarea
            value={value}
            disabled={caseSubmitted}
            rows={2}
            className="border-0 shadow-none p-0 min-h-[48px] text-sm resize-none focus-visible:ring-0"
            onChange={(e) => onUpdate(buildTextSelection(e.target.value))}
          />
        ) : (
          <Input
            type={inputType}
            value={value}
            disabled={caseSubmitted}
            className="border-0 shadow-none p-0 h-auto text-sm focus-visible:ring-0"
            onChange={(e) => onUpdate(buildTextSelection(e.target.value))}
          />
        )}
        {hasVal && !caseSubmitted ? (
          <CustomCheck size={16} className="text-[#34a853] flex-shrink-0" />
        ) : null}
      </div>
    </fieldset>
  );
}

function FileUploadControl({
  field,
  currentSelection,
  borderColor,
  labelColor,
  caseSubmitted,
  onUpdate,
  onFileChange,
}: AdvanceFieldDynamicControlProps) {
  const fileName = currentSelection?.fileName ?? getPlainTextValue(currentSelection);
  const hasVal = !!fileName;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <fieldset
      className="border rounded px-3 py-0 relative min-h-[42px] flex items-center min-w-0"
      style={{ borderColor }}
    >
      <legend className="text-sm px-1 leading-none whitespace-nowrap" style={{ color: labelColor }}>
        {field.name}
      </legend>
      <div className="flex items-center gap-2 w-full min-w-0 py-2">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          disabled={caseSubmitted}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            if (file) {
              onUpdate(buildFileSelection(file.name));
              onFileChange?.(file);
            } else {
              onUpdate({ name: "", textValue: "", fileName: "" });
              onFileChange?.(null);
            }
          }}
        />
        <button
          type="button"
          disabled={caseSubmitted}
          className="flex items-center gap-2 min-w-0 flex-1 text-left text-sm text-[#000000]"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4 text-[#7f7f7f] flex-shrink-0" />
          <span className="truncate">{fileName || "Upload file…"}</span>
        </button>
        {hasVal && !caseSubmitted ? (
          <CustomCheck size={16} className="text-[#34a853] flex-shrink-0" />
        ) : null}
      </div>
    </fieldset>
  );
}

/** Renders any advance field type dynamically for fixed-restoration steps. */
export function AdvanceFieldDynamicControl(props: AdvanceFieldDynamicControlProps) {
  const { field, activeOptions } = props;
  const fieldType = normalizeAdvanceFieldType(field.field_type);

  if (isOptionBasedAdvanceField(field) && activeOptions.length > 0) {
    return <OptionPickerPopover {...props} />;
  }

  if (fieldType === "multiline_text") {
    return <TextLikeControl {...props} multiline />;
  }

  if (fieldType === "number") {
    return <TextLikeControl {...props} inputType="number" />;
  }

  if (fieldType === "text") {
    return <TextLikeControl {...props} />;
  }

  if (isFileUploadAdvanceField(field)) {
    return <FileUploadControl {...props} />;
  }

  if (isOptionBasedAdvanceField(field)) {
    return (
      <fieldset
        className="border rounded px-3 py-0 relative h-[42px] flex items-center border-[#d9d9d9]"
      >
        <legend className="text-sm px-1 leading-none text-[#7f7f7f]">{field.name}</legend>
        <span className="text-sm text-[#7f7f7f]">No options configured</span>
      </fieldset>
    );
  }

  return <TextLikeControl {...props} />;
}
