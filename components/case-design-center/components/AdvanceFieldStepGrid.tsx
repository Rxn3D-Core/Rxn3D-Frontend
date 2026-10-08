"use client";

import type { Arch } from "../types";
import type { FieldStep } from "../hooks/useToothFieldProgress";
import { AdvanceFieldDynamicControl } from "./AdvanceFieldDynamicControl";
import {
  advanceFieldFileKey,
  setAdvanceFieldFile,
} from "../utils/advanceFieldFileStore";
import {
  allAdvanceFieldsComplete,
  getActiveAdvanceOptions,
  isAdvanceSelectionComplete,
  isSpecialAdvanceField,
  type StoredAdvanceSelection,
} from "../utils/advanceFieldStepHelpers";

type AdvanceFieldRecord = {
  id: number;
  name: string;
  field_type?: string;
  options?: Array<{ id: number; name: string; status?: string; sequence?: number; image_url?: string | null; is_default?: string }>;
  sequence?: number;
};

function applyAdvanceStepSelectionUpdate(
  storedValues: Record<string, StoredAdvanceSelection>,
  field: { id: number; field_type?: string },
  selection: StoredAdvanceSelection,
  stepFields: Array<{ id: number; field_type?: string }>,
  arch: Arch,
  firstToothNumber: number,
  stepKey: FieldStep,
  completeFieldStep: (arch: Arch, tooth: number, step: FieldStep, value: string) => void,
  storeFieldValue: (arch: Arch, tooth: number, step: FieldStep, value: string) => void,
  uncompleteFieldStep: (arch: Arch, tooth: number, step: FieldStep) => void,
) {
  const updated = { ...storedValues, [field.id]: selection };
  const completable = stepFields.filter((f) => !isSpecialAdvanceField(f));
  if (allAdvanceFieldsComplete(completable, updated)) {
    completeFieldStep(arch, firstToothNumber, stepKey, JSON.stringify(updated));
  } else {
    storeFieldValue(arch, firstToothNumber, stepKey, JSON.stringify(updated));
    uncompleteFieldStep(arch, firstToothNumber, stepKey);
  }
}

export type AdvanceFieldStepGridProps = {
  stepKey: FieldStep;
  fields: AdvanceFieldRecord[];
  storedValues: Record<string, StoredAdvanceSelection>;
  arch: Arch;
  cardId: number;
  firstToothNumber: number;
  caseSubmitted: boolean;
  completeFieldStep: (arch: Arch, tooth: number, step: FieldStep, value: string) => void;
  storeFieldValue: (arch: Arch, tooth: number, step: FieldStep, value: string) => void;
  uncompleteFieldStep: (arch: Arch, tooth: number, step: FieldStep) => void;
};

export function AdvanceFieldStepGrid({
  stepKey,
  fields,
  storedValues,
  arch,
  cardId,
  firstToothNumber,
  caseSubmitted,
  completeFieldStep,
  storeFieldValue,
  uncompleteFieldStep,
}: AdvanceFieldStepGridProps) {
  const stepFields = fields.filter((f) => !isSpecialAdvanceField(f));
  if (stepFields.length === 0) return null;

  const isSubFieldVisible = (index: number) => {
    for (let i = 0; i < index; i++) {
      const prior = stepFields[i];
      if (!isAdvanceSelectionComplete(prior, storedValues[prior.id])) return false;
    }
    return true;
  };

  const visibleFields = stepFields.filter((_, idx) => isSubFieldVisible(idx));
  const colCount = Math.min(visibleFields.length, 4);

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
      {visibleFields.map((field) => {
        const activeOptions = getActiveAdvanceOptions(field)
          .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        const currentSelection = storedValues[field.id];
        const hasVal = isAdvanceSelectionComplete(field, currentSelection);
        const borderColor = hasVal && !caseSubmitted ? "#119933" : hasVal ? "#b4b0b0" : "#CF0202";
        const labelColor = hasVal && !caseSubmitted ? "#119933" : hasVal ? "#b4b0b0" : "#CF0202";
        const fileKey = advanceFieldFileKey(arch, cardId, field.id);

        return (
          <AdvanceFieldDynamicControl
            key={field.id}
            field={field}
            activeOptions={activeOptions}
            currentSelection={currentSelection}
            borderColor={borderColor}
            labelColor={labelColor}
            caseSubmitted={caseSubmitted}
            onUpdate={(selection) => {
              applyAdvanceStepSelectionUpdate(
                storedValues,
                field,
                selection,
                stepFields,
                arch,
                firstToothNumber,
                stepKey,
                completeFieldStep,
                storeFieldValue,
                uncompleteFieldStep,
              );
            }}
            onFileChange={(file) => {
              setAdvanceFieldFile(fileKey, file);
              if (!file) return;
              applyAdvanceStepSelectionUpdate(
                storedValues,
                field,
                { name: file.name, fileName: file.name, textValue: file.name },
                stepFields,
                arch,
                firstToothNumber,
                stepKey,
                completeFieldStep,
                storeFieldValue,
                uncompleteFieldStep,
              );
            }}
          />
        );
      })}
    </div>
  );
}

export function parseStepStoredValues(fieldVal: string): Record<string, StoredAdvanceSelection> {
  if (!fieldVal || !fieldVal.startsWith("{")) return {};
  try {
    return JSON.parse(fieldVal) as Record<string, StoredAdvanceSelection>;
  } catch {
    return {};
  }
}
