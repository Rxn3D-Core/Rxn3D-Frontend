"use client";

import type { ReactNode } from "react";
import { Check } from "@/components/ui/custom-check";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Arch, ProductApiData } from "../../types";
import type { FieldStep } from "../../hooks/useToothFieldProgress";
import { resolveCardFieldValue } from "../../utils/resolveAddedCardProduct";
import {
  getSelectableMaterials,
  parseMaterialFieldValue,
  resolveSelectedMaterial,
  serializeMaterialFieldValue,
} from "../../utils/materialHelpers";

/** "Product - Material" dropdown for one product card. */
export function MaterialField({
  arch,
  cardId,
  toothNumbers,
  repTooth,
  product,
  getFieldValue,
  storeFieldValue,
  caseSubmitted = false,
  fallback = null,
}: {
  arch: Arch;
  cardId: number;
  toothNumbers: readonly number[];
  repTooth: number;
  product: ProductApiData | null | undefined;
  getFieldValue: (arch: Arch, toothNumber: number, step: FieldStep) => string;
  storeFieldValue: (arch: Arch, toothNumber: number, step: FieldStep, value: string) => void;
  caseSubmitted?: boolean;
  /** Rendered instead when there is no material to choose or show. */
  fallback?: ReactNode;
}) {
  const options = getSelectableMaterials(product);
  const raw = resolveCardFieldValue(arch, cardId, toothNumbers, repTooth, "material", getFieldValue);
  // A submitted slip shows what was saved, even if the product no longer links it.
  const savedName = caseSubmitted ? parseMaterialFieldValue(raw).name : "";
  if (options.length === 0 && !savedName) return <>{fallback}</>;

  const selected = resolveSelectedMaterial(product, raw);
  const name = savedName || selected?.name || "";
  const complete = !!name && !caseSubmitted;
  const missing = !name && !caseSubmitted;

  return (
    <fieldset
      className={`border rounded px-3 py-0 relative h-[42px] flex items-center min-w-0 ${
        complete ? "border-[#34a853]" : missing ? "border-[#cf0202]" : "border-[#b4b0b0]"
      }`}
    >
      <legend
        className={`text-sm px-1 leading-none whitespace-nowrap ${
          complete ? "text-[#34a853]" : missing ? "text-[#cf0202]" : "text-[#7f7f7f]"
        }`}
      >
        Product - Material
      </legend>
      <div className="flex items-center gap-2 min-w-0 w-full">
        {caseSubmitted ? (
          <span className="text-lg text-[#000000] leading-tight truncate flex-1">{name}</span>
        ) : (
          <Select
            value={selected ? String(selected.material_id) : ""}
            onValueChange={(id) => {
              const option = options.find((m) => String(m.material_id) === id);
              if (!option) return;
              // Every tooth of the card, so the choice survives a change of representative tooth.
              for (const tn of new Set([repTooth, ...toothNumbers])) {
                storeFieldValue(arch, tn, "material", serializeMaterialFieldValue(option));
              }
            }}
          >
            <SelectTrigger
              aria-label="Product - Material"
              className="flex-1 text-lg text-[#000000] bg-transparent border-0 shadow-none outline-none leading-tight cursor-pointer min-w-0 h-auto py-0 px-0 focus:ring-0 [&>span]:truncate"
            >
              <SelectValue placeholder="Select material" />
            </SelectTrigger>
            <SelectContent className="z-[10050]">
              {options.map((m) => (
                <SelectItem key={m.material_id} value={String(m.material_id)}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {complete && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
      </div>
    </fieldset>
  );
}
