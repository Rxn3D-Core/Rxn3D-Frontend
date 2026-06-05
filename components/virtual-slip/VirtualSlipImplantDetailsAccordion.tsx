"use client";

import { useMemo } from "react";
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

export function VirtualSlipImplantDetailsAccordion({
  implants,
}: {
  implants: ImplantVM[];
}) {
  const groups = useMemo(() => groupVirtualSlipImplants(implants), [implants]);

  if (groups.length === 0) return null;

  if (groups.length === 1) {
    const group = groups[0];
    return (
      <div className="w-full border-b border-[#4C4D55]/25">
        <div className={HEADER_CLASS}>
          {formatImplantAccordionLabel(group.toothNumbers, group.retentionHeader)}
        </div>
        <div className="pb-2">
          <ImplantGroupDetails group={group} />
        </div>
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="w-full">
      {groups.map((group) => (
        <AccordionItem
          key={group.id}
          value={group.id}
          className="border-b border-[#4C4D55]/25 last:border-b-0"
        >
          <AccordionTrigger className={`${HEADER_CLASS} hover:no-underline`}>
            {formatImplantAccordionLabel(
              group.toothNumbers,
              group.retentionHeader
            )}
          </AccordionTrigger>
          <AccordionContent className="pb-2 pt-0">
            <ImplantGroupDetails group={group} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
