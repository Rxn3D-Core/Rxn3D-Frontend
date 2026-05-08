"use client";

import type { ProductFormFlags } from "../utils/productFormFlow";

interface Step {
  key: keyof ProductFormFlags;
  label: string;
}

const STEPS: Step[] = [
  { key: "hasExtractions", label: "Extractions" },
  { key: "hasGrade", label: "Grade" },
  { key: "hasStage", label: "Stage" },
  { key: "hasTeethShade", label: "Tooth Shade" },
  { key: "hasGumShade", label: "Gum Shade" },
  { key: "hasVariations", label: "Variations" },
  { key: "hasAdvanceFields", label: "Adv. Fields" },
  { key: "hasImpressions", label: "Impression" },
  { key: "hasAddons", label: "Add-ons" },
];

interface ProductFormFlowIndicatorProps {
  flags: ProductFormFlags;
  completedSteps: Set<string>;
}

export function ProductFormFlowIndicator({ flags, completedSteps }: ProductFormFlowIndicatorProps) {
  const applicableSteps = STEPS.filter((s) => flags[s.key]);
  if (applicableSteps.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {applicableSteps.map((step) => {
        const done = completedSteps.has(step.key);
        return (
          <span
            key={step.key}
            className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
              done
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-blue-50 text-blue-600 border border-blue-200"
            }`}
          >
            {step.label}
          </span>
        );
      })}
    </div>
  );
}
