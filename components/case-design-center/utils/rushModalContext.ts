import { addDays, format, startOfDay } from "date-fns";
import type { Matcher } from "react-day-picker";
import type { BusinessHour } from "@/lib/api-business-settings";
import type { Arch, ProductApiData } from "../types";
import { hasRetentionOptions } from "./categoryHelpers";

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const DEFAULT_WEEKEND_CLOSED = new Set([0, 6]);

export interface LabHolidayRef {
  date: string;
  is_recurring?: boolean;
}

export interface LabCalendarContext {
  closedWeekdays: ReadonlySet<number>;
  holidays: ReadonlyArray<LabHolidayRef>;
}

/** Build lab calendar rules from business hours (weekoffs) and holiday list. */
export function buildLabCalendarContext(
  businessHours?: BusinessHour[] | null,
  holidays?: LabHolidayRef[] | null
): LabCalendarContext {
  let closedWeekdays: Set<number>;

  if (businessHours?.length) {
    const openDays = new Set<number>();
    closedWeekdays = new Set<number>();
    for (const hour of businessHours) {
      const key = String(hour.day ?? "").trim().toLowerCase();
      const idx = DAY_NAME_TO_INDEX[key];
      if (idx === undefined) continue;
      if (hour.is_open) openDays.add(idx);
      else closedWeekdays.add(idx);
    }
    if (openDays.size > 0 && closedWeekdays.size === 0) {
      for (let d = 0; d < 7; d += 1) {
        if (!openDays.has(d)) closedWeekdays.add(d);
      }
    }
    if (closedWeekdays.size === 0 && openDays.size === 0) {
      closedWeekdays = new Set(DEFAULT_WEEKEND_CLOSED);
    }
  } else {
    closedWeekdays = new Set(DEFAULT_WEEKEND_CLOSED);
  }

  return {
    closedWeekdays,
    holidays: holidays ?? [],
  };
}

export function isHolidayOnDate(day: Date, ctx: LabCalendarContext): boolean {
  const d = startOfDay(day);
  const iso = format(d, "yyyy-MM-dd");
  const month = d.getMonth() + 1;
  const dateOfMonth = d.getDate();

  for (const holiday of ctx.holidays) {
    if (!holiday.date) continue;
    if (holiday.is_recurring) {
      const parts = holiday.date.split("-");
      if (parts.length >= 3) {
        const m = Number(parts[1]);
        const dom = Number(parts[2]);
        if (m === month && dom === dateOfMonth) return true;
      }
    } else if (holiday.date === iso) {
      return true;
    }
  }
  return false;
}

export function isLabWorkingDay(day: Date, ctx?: LabCalendarContext): boolean {
  const calendar = ctx ?? buildLabCalendarContext();
  const d = startOfDay(day);
  if (calendar.closedWeekdays.has(d.getDay())) return false;
  if (isHolidayOnDate(d, calendar)) return false;
  return true;
}

/** Earliest rush delivery date: today + fixed turnaround lab working days (or next working day). */
export function getEarliestRushDeliveryDate(
  baseDate: Date,
  fixedTurnaroundDays: number | null | undefined,
  ctx?: LabCalendarContext
): Date {
  const calendar = ctx ?? buildLabCalendarContext();
  const base = startOfDay(baseDate);
  const days =
    fixedTurnaroundDays != null && fixedTurnaroundDays > 0
      ? Math.floor(fixedTurnaroundDays)
      : 0;

  if (days === 0) {
    let current = base;
    while (!isLabWorkingDay(current, calendar)) {
      current = addDays(current, 1);
    }
    return current;
  }

  return addLabWorkingDays(base, days, calendar);
}

export function buildRushDateDisabledMatchers(
  ctx: LabCalendarContext,
  minDate?: Date,
  maxDate?: Date
): Matcher[] {
  const matchers: Matcher[] = [(date) => !isLabWorkingDay(date, ctx)];
  if (minDate) matchers.push({ before: startOfDay(minDate) });
  if (maxDate) matchers.push({ after: startOfDay(maxDate) });
  return matchers;
}

const MAXILLARY_TEETH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const MANDIBULAR_TEETH = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

export interface RushArchSlot {
  arch: Arch;
  archLabel: string;
  productName: string;
  apiProductId: number;
  cardId: number;
  repTooth: number;
  isFixed: boolean;
  /** Key used in `rushedProducts` state (matches accordion / panel keys). */
  rushKey: string;
  /** Standard (non-rush) delivery date from stage work days, yyyy-MM-dd. */
  actualDeliveryDate: string;
  workDaysToDeliver: number;
  stageName?: string;
  /** Teeth on this product card, e.g. "#25, 26, 27". */
  toothNumbersLabel: string;
}

/** Parse yyyy-MM-dd in local time (avoids UTC shift from `parse`). */
export function parseLocalDateString(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return startOfDay(new Date(y, m - 1, d));
}

/** Lab working days strictly between `from` (exclusive) and `to` (exclusive end walk). */
export function countLabWorkingDaysBetween(
  from: Date,
  to: Date,
  ctx?: LabCalendarContext
): number {
  let count = 0;
  let current = startOfDay(from);
  const end = startOfDay(to);
  if (current >= end) return 0;
  while (current < end) {
    current = addDays(current, 1);
    if (isLabWorkingDay(current, ctx)) count += 1;
  }
  return count;
}

/** Add lab working days (skips weekoffs and holidays when `ctx` is provided). */
export function addLabWorkingDays(
  from: Date,
  workDays: number,
  ctx?: LabCalendarContext
): Date {
  let remaining = Math.max(0, Math.floor(workDays));
  let current = startOfDay(from);
  if (remaining === 0) return current;
  while (remaining > 0) {
    current = addDays(current, 1);
    if (isLabWorkingDay(current, ctx)) remaining -= 1;
  }
  return current;
}

export function resolveSlotWorkDays(
  product: ProductApiData | null | undefined,
  stageName?: string
): number {
  if (stageName && product?.stages?.length) {
    const matched = product.stages.find((s) => s.name === stageName);
    if (matched?.days_to_process != null && matched.days_to_process > 0) {
      return matched.days_to_process;
    }
  }
  const defaultStage = product?.stages?.find((s) => s.is_default === "Yes");
  if (defaultStage?.days_to_process != null && defaultStage.days_to_process > 0) {
    return defaultStage.days_to_process;
  }
  return 10;
}

export function resolveSlotStageName(
  arch: Arch,
  repTooth: number,
  isFixed: boolean,
  product: ProductApiData | null | undefined,
  selectedStages?: Record<string, string>,
  getFieldValue?: (arch: Arch, toothNumber: number, step: string) => string | undefined
): string | undefined {
  const stageKey = `${arch}_${isFixed ? "fixed" : "prep"}_${repTooth}`;
  const altFixedKey = `${arch}_fixed_${repTooth}`;
  const fromMap =
    selectedStages?.[stageKey] ??
    selectedStages?.[altFixedKey] ??
    (isFixed
      ? getFieldValue?.(arch, repTooth, "fixed_stage")
      : getFieldValue?.(arch, repTooth, "stage"));
  if (fromMap?.trim()) return fromMap.trim();
  const defaultStage = product?.stages?.find((s) => s.is_default === "Yes");
  return defaultStage?.name;
}

export function buildRushStorageKey(
  arch: Arch,
  repTooth: number,
  isFixed: boolean
): string {
  return `${arch}_${isFixed ? "fixed" : "prep"}_${repTooth}`;
}

/** Same rep-tooth rule as `buildRushArchSlots` (minimum tooth number on the card). */
export function resolveCardRepToothForRush(cardTeeth: readonly number[]): number {
  if (cardTeeth.length === 0) return 0;
  return Math.min(...cardTeeth);
}

function isRushStoreEntry(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function rushKeyCandidates(
  arch: Arch,
  cardId: number,
  repTooth: number,
  isFixed: boolean
): string[] {
  return [
    buildRushStorageKey(arch, repTooth, isFixed),
    buildRushStorageKey(arch, repTooth, !isFixed),
    `${arch}_${cardId}`,
    `${arch}_prep_${repTooth}`,
    `${arch}_fixed_${repTooth}`,
    `${arch}_${repTooth}`,
  ];
}

/** Resolve rush UI state regardless of which legacy key format was used. */
export function getRushFromStore(
  rushedProducts: Record<string, unknown> | undefined,
  arch: Arch,
  cardId: number,
  repTooth: number,
  isFixed: boolean
): Record<string, unknown> | null {
  if (!rushedProducts) return null;
  const candidates = rushKeyCandidates(arch, cardId, repTooth, isFixed);
  const candidateSet = new Set(candidates);

  for (const key of candidates) {
    const value = rushedProducts[key];
    if (isRushStoreEntry(value)) {
      return value;
    }
  }

  for (const value of Object.values(rushedProducts)) {
    if (!isRushStoreEntry(value)) continue;
    const entryKey = typeof value.rushKey === "string" ? value.rushKey : "";
    if (entryKey && candidateSet.has(entryKey)) {
      return value;
    }
    if (value.arch === arch) {
      const entryRep =
        typeof value.repTooth === "number" ? value.repTooth : undefined;
      const entryCardId =
        typeof value.cardId === "number" ? value.cardId : undefined;
      if (
        entryRep === repTooth &&
        (entryCardId === undefined || entryCardId === cardId)
      ) {
        return value;
      }
    }
  }

  return null;
}

/** Whether a product card has rush saved under any legacy or current storage key. */
export function isProductRushed(
  rushedProducts: Record<string, unknown> | undefined,
  arch: Arch,
  cardId: number,
  repTooth: number,
  isFixed: boolean
): boolean {
  return !!getRushFromStore(rushedProducts, arch, cardId, repTooth, isFixed);
}

export interface BuildRushArchSlotsParams {
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null;
  getToothProductCard: (arch: Arch, toothNumber: number) => number | null | undefined;
  maxillaryRetentionTypes: Record<number, string[]>;
  mandibularRetentionTypes: Record<number, string[]>;
  maxillaryTeeth: number[];
  mandibularTeeth: number[];
  selectedStages?: Record<string, string>;
  getFieldValue?: (arch: Arch, toothNumber: number, step: string) => string | undefined;
  /** Base date for "after submission" (defaults to today). */
  submissionBaseDate?: Date;
}

function findAllSlotsForArch(arch: Arch, params: BuildRushArchSlotsParams): RushArchSlot[] {
  const allTeeth = arch === "maxillary" ? MAXILLARY_TEETH : MANDIBULAR_TEETH;
  const retentionTypes =
    arch === "maxillary"
      ? params.maxillaryRetentionTypes
      : params.mandibularRetentionTypes;
  const selectedRemovable =
    arch === "maxillary" ? params.maxillaryTeeth : params.mandibularTeeth;

  const cardToRepTooth = new Map<number, number>();
  const cardToTeeth = new Map<number, number[]>();

  for (const toothNumber of allTeeth) {
    const hasRetention = (retentionTypes[toothNumber]?.length ?? 0) > 0;
    const onRemovable = selectedRemovable.includes(toothNumber);
    if (!hasRetention && !onRemovable) continue;

    const cardId = params.getToothProductCard(arch, toothNumber);
    if (cardId == null || cardId < 0) continue;

    const teeth = cardToTeeth.get(cardId) ?? [];
    teeth.push(toothNumber);
    cardToTeeth.set(cardId, teeth);

    const existing = cardToRepTooth.get(cardId);
    if (existing === undefined || toothNumber < existing) {
      cardToRepTooth.set(cardId, toothNumber);
    }
  }

  if (cardToTeeth.size === 0) return [];

  const archLabel = arch === "maxillary" ? "Maxillary (Upper)" : "Mandibular (Lower)";

  return Array.from(cardToTeeth.keys())
    .sort((a, b) => a - b)
    .map((cardId) => {
      const repTooth = cardToRepTooth.get(cardId)!;
      const product = params.getToothProduct(arch, repTooth);
      const isFixed = hasRetentionOptions(product);
      const teeth = [...(cardToTeeth.get(cardId) ?? [])].sort((a, b) => a - b);

      // Resolve stage: try repTooth first, then fall back to other teeth on the
      // same card (handles cases where stage was saved under a non-minimum tooth).
      let resolvedStageName = resolveSlotStageName(arch, repTooth, isFixed, product, params.selectedStages, params.getFieldValue);
      if (!resolvedStageName) {
        for (const t of teeth) {
          if (t === repTooth) continue;
          const s = resolveSlotStageName(arch, t, isFixed, product, params.selectedStages, params.getFieldValue);
          if (s) { resolvedStageName = s; break; }
        }
      }

      const workDaysToDeliver = resolveSlotWorkDays(product, resolvedStageName);
      const actualDelivery = addLabWorkingDays(
        params.submissionBaseDate ?? new Date(),
        workDaysToDeliver
      );

      return {
        arch,
        archLabel,
        productName: product?.name?.trim() || "Product",
        apiProductId: product?.id ?? 0,
        cardId,
        repTooth,
        isFixed,
        rushKey: buildRushStorageKey(arch, repTooth, isFixed),
        actualDeliveryDate: format(actualDelivery, "yyyy-MM-dd"),
        workDaysToDeliver,
        stageName: resolvedStageName,
        toothNumbersLabel: teeth.map((n) => `#${n}`).join(", "),
      };
    });
}

/** One rush slot per product card on each arch that has teeth selected. */
export function buildRushArchSlots(params: BuildRushArchSlotsParams): RushArchSlot[] {
  return [
    ...findAllSlotsForArch("maxillary", params),
    ...findAllSlotsForArch("mandibular", params),
  ];
}

export function rushSlotsShareProduct(slots: RushArchSlot[]): boolean {
  const maxillary = slots.filter((s) => s.arch === "maxillary");
  const mandibular = slots.filter((s) => s.arch === "mandibular");
  if (maxillary.length !== 1 || mandibular.length !== 1) return false;
  const sameProduct =
    maxillary[0].apiProductId > 0 &&
    maxillary[0].apiProductId === mandibular[0].apiProductId;
  if (!sameProduct) return false;
  // Only mirror (collapse to one column) when stage also matches.
  const maxStage = maxillary[0].stageName?.trim() || "";
  const mandStage = mandibular[0].stageName?.trim() || "";
  return maxStage === mandStage;
}
