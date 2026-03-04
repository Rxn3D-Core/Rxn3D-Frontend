"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ClipboardList,
  ClipboardCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Maximize2,
} from "lucide-react";
import type { NotesProps, Arch, ProductApiData, RetentionType } from "../types";

// ─── helpers ────────────────────────────────────────────────────────────────

function getCategoryName(product: ProductApiData | null): string {
  return (
    product?.subcategory?.category?.name ||
    (product as any)?.category_name ||
    ""
  );
}

/** Format a sorted, contiguous tooth-number list as "e.g. #4–6, #9" */
function formatTeethNumbers(teeth: number[]): string {
  if (!teeth.length) return "";
  const sorted = [...teeth].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `#${start}` : `#${start}–${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `#${start}` : `#${start}–${end}`);
  return ranges.join(", ");
}

// ─── note builders ───────────────────────────────────────────────────────────

interface NoteGroup {
  arch: Arch;
  category: string;
  note: string;
}

function buildFixedNote(
  arch: Arch,
  teeth: number[],
  product: ProductApiData | null,
  retentionType: RetentionType,
  props: NotesProps,
  /** Right1 or right2 implant info (first implant group for this arch) */
  implantBrand: string,
  implantPlatform: string,
  implantInclusion: string,
): string {
  const productName = product?.name || "restoration";
  const teethStr = formatTeethNumbers(teeth);

  // Stage: keyed as "fixed_<minTooth>" in selectedStages
  const minTooth = teeth.length ? Math.min(...teeth) : 0;
  const stageKey = `fixed_${minTooth}`;
  const stage = props.selectedStages[stageKey] || "";

  // Shades: stored under fixed_<minTooth>
  const toothShade = props.getSelectedShade(stageKey, arch, "tooth_shade");
  const stumpShade = props.getSelectedShade(stageKey, arch, "stump_shade");

  let note = `Please fabricate a ${productName} for teeth ${teethStr}${stage ? ` in the ${stage} stage` : ""}.`;

  if (toothShade) note += ` Tooth shade is ${toothShade}${stumpShade ? `, with stump shade ${stumpShade}` : ""}.`;
  if (retentionType) note += ` Retention Type is ${retentionType === "Implant" ? "Screw-retained" : retentionType.toLowerCase()}.`;

  if (retentionType === "Implant") {
    const implantSize = ""; // not tracked separately yet
    const implantDetails = [implantBrand, implantPlatform, implantSize].filter(Boolean).join(", ");
    if (implantDetails || implantInclusion) {
      note += ` The implant is a ${implantDetails}${implantInclusion ? `, with ${implantInclusion}` : ""}.`;
    }
    note += " For design, please open virtual slip.";
  }

  // Impression: stored under fixed progress of the min tooth
  const impressionText = props.getImpressionDisplayText(stageKey, arch, minTooth);
  if (impressionText) note += ` Impression used: ${impressionText}.`;

  // Add-ons: stored as field value "fixed_addons" on the min tooth
  const addons = props.getFieldValue(arch, minTooth, "fixed_addons");
  if (addons) note += ` Add-ons requested: ${addons}.`;

  return note;
}

function buildRemovableNote(
  arch: Arch,
  teeth: number[],
  product: ProductApiData | null,
  repTooth: number,
  props: NotesProps,
): string {
  const productName = product?.name || "removable";
  const teethStr = formatTeethNumbers(teeth);
  const gradeRaw = props.getFieldValue(arch, repTooth, "grade");
  let grade = gradeRaw;
  try { const p = JSON.parse(gradeRaw); grade = p.name ?? gradeRaw; } catch {}
  const stage = props.getFieldValue(arch, repTooth, "stage");
  const teethShadeRaw = props.getFieldValue(arch, repTooth, "teeth_shade");
  let teethShade = teethShadeRaw;
  try { const p = JSON.parse(teethShadeRaw); teethShade = p.name ?? teethShadeRaw; } catch {}
  const gumShadeRaw = props.getFieldValue(arch, repTooth, "gum_shade");
  let gumShade = gumShadeRaw;
  try { const p = JSON.parse(gumShadeRaw); gumShade = p.name ?? gumShadeRaw; } catch {}
  const impression = props.getImpressionDisplayText(`prep_${repTooth}`, arch, repTooth);
  const addons = props.getFieldValue(arch, repTooth, "addons");

  let note = `Please fabricate a${grade ? ` ${grade}` : ""} ${productName} replacing teeth ${teethStr}${stage ? `, in the ${stage} stage` : ""}.`;
  if (teethShade || gumShade) {
    note += ` Use${teethShade ? ` ${teethShade} denture teeth` : ""}${gumShade ? ` with ${gumShade} gingiva` : ""}.`;
  }
  if (impression) note += ` Impression is ${impression}.`;
  if (addons) note += ` Add-ons include: ${addons}.`;

  return note;
}

function buildOrthoNote(
  arch: Arch,
  teeth: number[],
  product: ProductApiData | null,
  repTooth: number,
  props: NotesProps,
): string {
  const productName = product?.name || "orthodontic appliance";
  const details = props.getFieldValue(arch, repTooth, "addons");
  return `Please fabricate a ${productName} with the following details: ${details || "—"}.`;
}

// ─── main note builder ───────────────────────────────────────────────────────

function buildNoteGroups(props: NotesProps): NoteGroup[] {
  const groups: NoteGroup[] = [];

  const MAXILLARY_ALL = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
  const MANDIBULAR_ALL = [17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32];

  for (const arch of ["maxillary", "mandibular"] as Arch[]) {
    const retTypes = arch === "maxillary"
      ? props.maxillaryRetentionTypes
      : props.mandibularRetentionTypes;

    const selectedTeeth = arch === "maxillary"
      ? props.maxillaryTeeth
      : props.mandibularTeeth;

    const allArchTeeth = arch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;

    // ── Fixed Restoration groups (Prep / Implant retention) ──────────────
    // Group teeth by product ID (or toothNumber if no product assigned yet)
    const fixedTeethByProductKey = new Map<string, number[]>();
    for (const toothStr of Object.keys(retTypes)) {
      const tn = Number(toothStr);
      const product = props.getToothProduct(arch, tn);
      const category = getCategoryName(product);
      if (category.toLowerCase().includes("ortho")) continue; // handled separately
      const key = product?.id != null ? String(product.id) : `solo_${tn}`;
      if (!fixedTeethByProductKey.has(key)) fixedTeethByProductKey.set(key, []);
      fixedTeethByProductKey.get(key)!.push(tn);
    }

    for (const [, teeth] of fixedTeethByProductKey) {
      const minTooth = Math.min(...teeth);
      const product = props.getToothProduct(arch, minTooth);
      const category = getCategoryName(product);
      if (category.toLowerCase().includes("ortho")) continue;

      const retentionArr = retTypes[minTooth] || retTypes[teeth[0]] || [];
      const retentionType: RetentionType = retentionArr[0] || "Prep";

      // Determine which implant slot corresponds to this arch
      const implantBrand = arch === "maxillary" ? props.right2Brand : props.right1Brand;
      const implantPlatform = arch === "maxillary" ? props.right2Platform : props.right1Platform;
      const implantInclusion = arch === "maxillary" ? props.right2Inclusion : props.right1Inclusion;

      const note = buildFixedNote(
        arch, teeth, product, retentionType, props,
        implantBrand, implantPlatform, implantInclusion,
      );

      groups.push({ arch, category: "Fixed Restoration", note });
    }

    // ── Removable & Orthodontic groups ────────────────────────────────────
    // Group removable/ortho teeth by product card ID (representative tooth approach)
    const cardToRepTooth = new Map<number, number>();
    for (const tn of allArchTeeth) {
      const product = props.getToothProduct(arch, tn);
      if (!product) continue;
      const card = props.getToothProductCard(arch, tn);
      if (card != null && !cardToRepTooth.has(card)) {
        cardToRepTooth.set(card, tn);
      }
    }

    const cardToTeeth = new Map<number, number[]>();
    for (const tn of selectedTeeth) {
      const card = props.getToothProductCard(arch, tn);
      if (card == null) continue;
      if (!cardToTeeth.has(card)) cardToTeeth.set(card, []);
      cardToTeeth.get(card)!.push(tn);
    }

    for (const [card, repTooth] of cardToRepTooth) {
      const product = props.getToothProduct(arch, repTooth);
      const category = getCategoryName(product);
      const cardTeeth = cardToTeeth.get(card) || [repTooth];

      if (category.toLowerCase().includes("ortho")) {
        groups.push({
          arch,
          category: "Orthodontic",
          note: buildOrthoNote(arch, cardTeeth, product, repTooth, props),
        });
      } else if (
        category.toLowerCase().includes("removable") ||
        category.toLowerCase().includes("removables")
      ) {
        groups.push({
          arch,
          category: "Removable",
          note: buildRemovableNote(arch, cardTeeth, product, repTooth, props),
        });
      }
    }
  }

  return groups;
}

function buildSectionText(arch: Arch, groups: NoteGroup[]): string {
  const archGroups = groups.filter((g) => g.arch === arch);
  if (!archGroups.length) return "";

  const archLabel = arch === "maxillary" ? "MAXILLARY" : "MANDIBULAR";
  const lines: string[] = [archLabel];

  // Group by category
  const byCategory = new Map<string, NoteGroup[]>();
  for (const g of archGroups) {
    if (!byCategory.has(g.category)) byCategory.set(g.category, []);
    byCategory.get(g.category)!.push(g);
  }

  for (const [category, cGroups] of byCategory) {
    lines.push(`${category}`);
    for (const g of cGroups) {
      lines.push(g.note);
    }
  }

  return lines.join("\n");
}

// ─── component ───────────────────────────────────────────────────────────────

export function CaseSummaryNotes(props: NotesProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "maxillary" | "mandibular">("summary");
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [manualOverride, setManualOverride] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Build dynamic note text from state
  const dynamicNoteText = useMemo(() => {
    const groups = buildNoteGroups(props);
    const maxText = buildSectionText("maxillary", groups);
    const mandText = buildSectionText("mandibular", groups);
    const parts = [maxText, mandText].filter(Boolean);
    return parts.join("\n\n");
  }, [
    props.maxillaryRetentionTypes,
    props.mandibularRetentionTypes,
    props.maxillaryTeeth,
    props.mandibularTeeth,
    props.selectedStages,
    props.right1Brand,
    props.right1Platform,
    props.right2Brand,
    props.right2Platform,
    props.right1Inclusion,
    props.right2Inclusion,
    // getters are stable refs — include the objects they read from instead
  ]);

  // Reset manual override when dynamic text changes (user edited a field)
  const noteText = manualOverride ?? dynamicNoteText;

  const getDisplayValue = () => {
    if (activeTab === "summary") return noteText;
    if (activeTab === "maxillary") {
      const match = noteText.match(/MAXILLARY[\s\S]*?(?=\n\nMANDIBULAR|$)/i);
      return match ? match[0].trim() : noteText;
    }
    const match = noteText.match(/MANDIBULAR[\s\S]*$/i);
    return match ? match[0].trim() : noteText;
  };

  const handleChange = (newValue: string) => {
    if (activeTab === "summary") {
      setManualOverride(newValue);
    } else if (activeTab === "maxillary") {
      const mandMatch = noteText.match(/(\n\nMANDIBULAR[\s\S]*$)/i);
      setManualOverride(newValue + (mandMatch ? mandMatch[1] : ""));
    } else {
      const maxMatch = noteText.match(/^(MAXILLARY[\s\S]*?\n\n)(?=MANDIBULAR)/i);
      setManualOverride((maxMatch ? maxMatch[1] : "") + newValue);
    }
  };

  const tabs = [
    { key: "summary" as const, icon: ClipboardList, title: "Stage Notes" },
    { key: "maxillary" as const, icon: ClipboardCheck, title: "Maxillary Notes" },
    { key: "mandibular" as const, icon: CheckCircle2, title: "Lab Connect Notes" },
  ];

  return (
    <div
      className="mx-2 sm:mx-4 mb-4 transition-transform duration-500 ease-out"
      style={{ transform: visible ? "translateY(0)" : "translateY(100%)" }}
    >
      <div className="flex items-start">
        {/* Left side icon buttons */}
        {!collapsed && (
          <div className="flex flex-col flex-shrink-0">
            {tabs.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const isFirst = idx === 0;
              const isLast = idx === tabs.length - 1;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-[30px] sm:w-[37px] h-[44px] sm:h-[53px] flex items-center justify-center border border-[#7f7f7f] -my-[1px] transition-colors ${
                    isFirst ? "rounded-tl-[11px]" : ""
                  } ${isLast ? "rounded-bl-[11px]" : ""} ${
                    isActive
                      ? "bg-[#1162a8] border-[#1162a8]"
                      : "bg-white hover:bg-[#f0f0f0]"
                  }`}
                  title={tab.title}
                >
                  <Icon size={16} className={isActive ? "text-white" : "text-[#7f7f7f]"} />
                </button>
              );
            })}
          </div>
        )}

        {/* Right side - textarea as fieldset */}
        <fieldset
          className={`flex-1 min-w-0 relative border border-[#7f7f7f] bg-white transition-all ${
            collapsed
              ? "rounded-[8px] h-[40px]"
              : expanded
                ? "rounded-r-[8px] h-[300px]"
                : "rounded-r-[8px] h-[130px] sm:h-[158px]"
          }`}
        >
          <legend className="ml-2 px-1 text-xs sm:text-sm text-[#7f7f7f] font-normal tracking-[0.05em] leading-none">
            Case summary notes
          </legend>

          {collapsed ? (
            <div className="flex items-center justify-between px-2 sm:px-[15px] h-[20px]">
              <span className="text-xs sm:text-sm text-[#7f7f7f] truncate flex-1">
                {getDisplayValue().slice(0, 80)}...
              </span>
              <div className="flex items-center gap-[5px] flex-shrink-0 ml-2">
                <button onClick={() => setCollapsed(false)} title="Expand">
                  <ChevronDown size={14} className="text-[#b4b0b0] hover:text-[#7f7f7f] transition-colors" />
                </button>
                <button onClick={() => { setCollapsed(false); setExpanded(true); }} title="Full view">
                  <Maximize2 size={14} className="text-[#b4b0b0] hover:text-[#7f7f7f] transition-colors" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start px-2 sm:px-[15px] pb-[5px] h-[calc(100%-14px)]">
              <textarea
                value={getDisplayValue()}
                onChange={(e) => handleChange(e.target.value)}
                className="flex-1 min-w-0 h-full text-[13px] sm:text-lg leading-[18px] sm:leading-[22px] text-black font-normal resize-none outline-none bg-transparent"
              />
              <div className="flex items-center gap-[5px] flex-shrink-0 ml-1 sm:ml-2 pt-1">
                <button onClick={() => { setCollapsed(true); setExpanded(false); }} title="Collapse">
                  <ChevronUp size={14} className="text-[#b4b0b0] hover:text-[#7f7f7f] transition-colors" />
                </button>
                <button onClick={() => setExpanded(!expanded)} title={expanded ? "Default size" : "Expand"}>
                  <Maximize2 size={14} className={`hover:text-[#7f7f7f] transition-colors ${expanded ? "text-[#1162a8]" : "text-[#b4b0b0]"}`} />
                </button>
              </div>
            </div>
          )}
        </fieldset>
      </div>
    </div>
  );
}
