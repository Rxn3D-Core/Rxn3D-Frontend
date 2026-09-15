"use client";

import { useMemo } from "react";
import { Pencil, Plus } from "lucide-react";
import type { ImplantVM } from "@/lib/virtual-slip-view-model";
import {
  formatImplantAccordionLabel,
  groupVirtualSlipImplants,
  type VirtualSlipImplantGroup,
} from "@/lib/virtual-slip-implant-groups";
import { hasDisplayValue } from "@/lib/virtual-slip-display";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const HEADER_CLASS =
  "py-2 font-sans text-[15px] font-bold tracking-[-0.02em] text-[#4C4D55]";

function Detail({ label, value }: { label: string; value: string }) {
  if (!hasDisplayValue(value)) return null;
  return (
    <div className="flex items-center gap-[14px] py-[1px] font-sans text-[15.4px] tracking-[-0.02em]">
      <span className="min-w-[129px] font-bold text-[#4C4D55]">{label}:</span>
      <span className="text-[#4C4D55]">{value}</span>
    </div>
  );
}

function ImplantGroupDetails({ group }: { group: VirtualSlipImplantGroup }) {
  if (!group.brand && !group.platform) {
    return <Detail label="Status" value="Lab recommendation requested" />;
  }
  return (
    <>
      <Detail label="Implant Brand" value={group.brand} />
      <Detail label="Implant Platform" value={group.platform} />
      <Detail label="Implant Size" value={group.size} />
      <Detail label="Abutment Type" value={group.abutmentType} />
      <Detail label="Abutment Option" value={group.abutmentOption} />
    </>
  );
}

function ImplantHeaderAction({
  onSelect,
  onEdit,
}: {
  onSelect?: () => void;
  onEdit?: () => void;
}) {
  if (onEdit) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#1162a8] hover:bg-[#1162a8]/10"
        aria-label="Edit implant"
        title="Edit implant"
      >
        <Pencil className="h-4 w-4" />
      </button>
    );
  }
  if (onSelect) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#1162a8] hover:bg-[#1162a8]/10"
        aria-label="Select implant"
        title="Select implant"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
      </button>
    );
  }
  return null;
}

function ImplantHeaderRow({
  label,
  onSelect,
  onEdit,
}: {
  label: string;
  onSelect?: () => void;
  onEdit?: () => void;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 ${HEADER_CLASS}`}>
      <span className="min-w-0 truncate">{label}</span>
      <ImplantHeaderAction onSelect={onSelect} onEdit={onEdit} />
    </div>
  );
}

export function VirtualSlipImplantDetailsAccordion({
  implants,
  onSelectLabImplants,
  onEditLabImplants,
}: {
  implants: ImplantVM[];
  onSelectLabImplants?: () => void;
  onEditLabImplants?: () => void;
}) {
  const groups = useMemo(() => groupVirtualSlipImplants(implants), [implants]);

  if (groups.length === 0) return null;

  if (groups.length === 1) {
    const group = groups[0];
    return (
      <div className="w-full border-b border-[#4C4D55]/25">
        <ImplantHeaderRow
          label={formatImplantAccordionLabel(group.toothNumbers, group.retentionHeader)}
          onSelect={onSelectLabImplants}
          onEdit={onEditLabImplants}
        />
        <div className="pb-2">
          <ImplantGroupDetails group={group} />
        </div>
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="w-full">
      {groups.map((group, index) => (
        <AccordionItem
          key={group.id}
          value={group.id}
          className="border-b border-[#4C4D55]/25 last:border-b-0"
        >
          <div className="flex items-center gap-1">
            <AccordionTrigger className={`${HEADER_CLASS} flex-1 hover:no-underline`}>
              {formatImplantAccordionLabel(
                group.toothNumbers,
                group.retentionHeader
              )}
            </AccordionTrigger>
            {index === 0 ? (
              <ImplantHeaderAction
                onSelect={onSelectLabImplants}
                onEdit={onEditLabImplants}
              />
            ) : null}
          </div>
          <AccordionContent className="pb-2 pt-0">
            <ImplantGroupDetails group={group} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
