"use client";

import { useEffect, useMemo, useState } from "react";
import type { NewStageEligibilityProduct } from "@/lib/api/slip-new-stage-eligibility";
import { fetchNewStageEligibility } from "@/lib/api/slip-new-stage-eligibility";
import {
  buildStagePickerOptions,
  type StagePickerOption,
} from "@/lib/add-stage/stage-options";
import type { AddStageSelections } from "@/lib/add-stage/session";
import { slipTypeToArch } from "@/lib/add-stage/session";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ArchKey = "maxillary" | "mandibular";

export type ArchPickerRow = {
  arch: ArchKey;
  label: string;
  eligibilityProduct: NewStageEligibilityProduct;
  apiProduct: Record<string, unknown>;
  options: StagePickerOption[];
};

type Props = {
  sourceSlipId: number;
  rows: ArchPickerRow[];
  onCancel: () => void;
  onContinue: (selections: AddStageSelections) => void;
};

export function AddNewStageStagePicker({
  sourceSlipId,
  rows,
  onCancel,
  onContinue,
}: Props) {
  const [selectedByArch, setSelectedByArch] = useState<
    Partial<Record<ArchKey, number>>
  >(() => {
    const init: Partial<Record<ArchKey, number>> = {};
    for (const row of rows) {
      const lastId = row.eligibilityProduct.last_stage?.stage_id;
      if (lastId) {
        const next = row.options.find((o) => !o.isRepeatLast);
        init[row.arch] = next?.stageId ?? lastId;
      }
    }
    return init;
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [perArchError, setPerArchError] = useState<Partial<Record<ArchKey, string>>>(
    {}
  );

  const allSelected = useMemo(
    () => rows.every((r) => selectedByArch[r.arch] != null),
    [rows, selectedByArch]
  );

  useEffect(() => {
    setValidationError(null);
    setPerArchError({});
  }, [selectedByArch]);

  const handleContinue = async () => {
    if (!allSelected) {
      setValidationError("Select a stage for each arch with a product.");
      return;
    }
    setValidating(true);
    setValidationError(null);
    setPerArchError({});

    const selections: AddStageSelections = {};
    const errors: Partial<Record<ArchKey, string>> = {};

    try {
      for (const row of rows) {
        const stageId = selectedByArch[row.arch];
        if (!stageId) continue;
        const option = row.options.find((o) => o.stageId === stageId);
        if (!option) continue;

        const res = await fetchNewStageEligibility(sourceSlipId, {
          product_id: row.eligibilityProduct.product_id,
          proposed_stage_id: stageId,
        });
        const productLine = res.data?.products?.find(
          (p) => p.product_id === row.eligibilityProduct.product_id
        );
        const proposed = productLine?.proposed_stage;
        if (proposed && proposed.valid === false) {
          errors[row.arch] =
            proposed.message ??
            productLine?.reason ??
            res.data?.message ??
            "Selected stage is not allowed.";
          continue;
        }
        if (productLine && productLine.eligible === false) {
          errors[row.arch] =
            productLine.reason ?? res.data?.message ?? "This product line is not eligible.";
          continue;
        }

        const arch = slipTypeToArch(row.eligibilityProduct.type);
        if (!arch) continue;
        const entry = {
          productId: row.eligibilityProduct.product_id,
          slipProductId: row.eligibilityProduct.slip_product_id,
          type: row.eligibilityProduct.type as "Upper" | "Lower",
          stageId,
          stageName: option.stageName,
        };
        if (arch === "maxillary") selections.maxillary = entry;
        else selections.mandibular = entry;
      }

      if (Object.keys(errors).length > 0) {
        setPerArchError(errors);
        setValidationError("Fix stage selections for the arches listed below.");
        return;
      }

      if (!selections.maxillary && !selections.mandibular) {
        setValidationError("No valid stage selections.");
        return;
      }

      onContinue(selections);
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : "Could not validate stage selection."
      );
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="font-sans text-2xl font-bold text-[#4C4D55]">
          Add new stage
        </h1>
        <p className="mt-2 text-sm text-[#64748B]">
          Choose the stage for each arch. You can advance to the next stage or repeat
          the last completed stage, then review and edit details before submitting.
        </p>
      </div>

      {rows.map((row) => (
        <section
          key={row.arch}
          className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm"
        >
          <h2 className="font-sans text-lg font-semibold text-[#4C4D55]">
            {row.label}
          </h2>
          {row.eligibilityProduct.last_stage ? (
            <p className="mt-1 text-xs text-[#64748B]">
              Last completed: {row.eligibilityProduct.last_stage.stage_name} (
              {row.eligibilityProduct.last_stage.slip_number})
            </p>
          ) : null}
          {!row.eligibilityProduct.eligible && row.eligibilityProduct.reason ? (
            <p className="mt-2 text-sm text-amber-800">{row.eligibilityProduct.reason}</p>
          ) : null}

          <div className="mt-3">
            <Select
              value={
                selectedByArch[row.arch] != null
                  ? String(selectedByArch[row.arch])
                  : undefined
              }
              onValueChange={(v) =>
                setSelectedByArch((prev) => ({
                  ...prev,
                  [row.arch]: Number(v),
                }))
              }
              disabled={!row.eligibilityProduct.eligible}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {row.options.map((opt) => (
                  <SelectItem key={opt.stageId} value={String(opt.stageId)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {row.eligibilityProduct.stage_history.length > 0 ? (
            <ul className="mt-4 space-y-1 border-t border-[#E2E8F0] pt-3 text-xs text-[#64748B]">
              <li className="font-medium text-[#4C4D55]">Stage history</li>
              {row.eligibilityProduct.stage_history.map((h, idx) => (
                <li key={`${h.slip_id}-${h.stage_id}-${idx}`}>
                  {h.slip_number} — {h.stage_name}
                  {h.completed_on ? ` (${h.completed_on})` : ""}
                </li>
              ))}
            </ul>
          ) : null}

          {perArchError[row.arch] ? (
            <p className={cn("mt-2 text-sm text-red-600")}>{perArchError[row.arch]}</p>
          ) : null}
        </section>
      ))}

      {validationError ? (
        <p className="text-sm text-red-600">{validationError}</p>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => void handleContinue()}
          disabled={validating || !allSelected}
        >
          {validating ? "Validating…" : "Continue to case design"}
        </Button>
      </div>
    </div>
  );
}
