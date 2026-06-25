/**
 * Helpers for the "splinted" feature: connecting two adjacent teeth of a single
 * product with a diamond marker.
 *
 * A splint "link" is identified by the LOWER tooth number of an adjacent pair.
 * e.g. link `6` connects tooth 6 and tooth 7. Links are scoped per product card.
 *
 * Adjacency is purely numeric (the arch midline is not treated as a break), and a
 * link is only eligible when BOTH teeth of the pair belong to the same product.
 */
import {
  DEFAULT_RETENTION_RULES,
  type RetentionRules,
} from "./RetentionOptionsRules.ts";

// Re-export the rule catalog so existing importers of splintHelpers keep working;
// the catalog itself lives in RetentionOptionsRules.ts (easy to find).
export {
  DEFAULT_RETENTION_RULES,
  type RetentionRules,
  type RetentionRuleMeta,
  type SplintRuleS1,
} from "./RetentionOptionsRules.ts";

/** Returns sorted ascending copy of the given teeth. */
function sortedTeeth(teeth: number[]): number[] {
  return [...teeth].sort((a, b) => a - b);
}

/**
 * Adjacent (consecutive-number) pairs within a single product's teeth.
 * Each eligible gap is identified by the lower tooth number.
 */
export function getSplintableLinks(teeth: number[]): number[] {
  const sorted = sortedTeeth(teeth);
  const links: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] === sorted[i] + 1) {
      links.push(sorted[i]);
    }
  }
  return links;
}

/** True when tooth `lower` and `lower + 1` are both present and consecutive. */
export function isSplintableLink(teeth: number[], lower: number): boolean {
  return teeth.includes(lower) && teeth.includes(lower + 1);
}

/**
 * Groups the product's teeth into maximal runs connected by active splint links.
 * Only groups of 2+ connected teeth are returned (singletons are omitted).
 */
export function computeSplintGroups(teeth: number[], links: number[]): number[][] {
  const sorted = sortedTeeth(teeth);
  const linkSet = new Set(links);
  const groups: number[][] = [];
  let current: number[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const tooth = sorted[i];
    if (current.length === 0) {
      current = [tooth];
      continue;
    }
    const prev = current[current.length - 1];
    // Continue the run only when the previous tooth links to this consecutive one.
    if (tooth === prev + 1 && linkSet.has(prev)) {
      current.push(tooth);
    } else {
      if (current.length >= 2) groups.push(current);
      current = [tooth];
    }
  }
  if (current.length >= 2) groups.push(current);
  return groups;
}

/**
 * Human-readable summary of splinted groups, e.g. "6-7-8, 11-12".
 * Returns "" when nothing is splinted.
 */
export function formatSplintGroups(teeth: number[], links: number[]): string {
  return computeSplintGroups(teeth, links)
    .map((group) => group.join("-"))
    .join(", ");
}

/** Drops links whose teeth are no longer both present in the product selection. */
export function pruneSplintLinks(teeth: number[], links: number[]): number[] {
  return links.filter((lower) => isSplintableLink(teeth, lower));
}

/**
 * Stable key for splint links scoped to one product card (matches panel chart logic).
 * Links for the same card share one array even when teeth are non-contiguous.
 */
export function splintKeyForProductCard(
  cardId: number,
  productId: number | null | undefined
): string {
  if (cardId !== 0) return `card:${cardId}`;
  if (productId != null && productId > 0) return `fixed:${productId}`;
  return "card0";
}

/**
 * API payload shape for `splinted_teeth`: one comma-separated group per connected run,
 * e.g. `["4,5,6", "10,11"]`.
 */
export function formatSplintGroupsForApi(teeth: number[], links: number[]): string[] {
  return computeSplintGroups(teeth, links).map((group) => group.join(","));
}

/**
 * Parse slip API `splinted_teeth` (e.g. `["8,9,10", "12,13"]`) into splint link
 * lowers for chart rendering — one link per consecutive adjacent pair in each group.
 */
export function parseSplintedTeethToLinks(splintedTeeth: unknown): number[] {
  if (!Array.isArray(splintedTeeth)) return [];
  const links: number[] = [];
  for (const group of splintedTeeth) {
    const teeth = String(group)
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((tooth) => Number.isFinite(tooth) && tooth > 0)
      .sort((a, b) => a - b);
    links.push(...getSplintableLinks(teeth));
  }
  return [...new Set(links)].sort((a, b) => a - b);
}

/** True when a slip product row is marked splinted in catalog or on the slip line. */
export function isSplintedSlipProduct(apiProduct: unknown): boolean {
  if (!apiProduct || typeof apiProduct !== "object") return false;
  const row = apiProduct as {
    is_splinted?: string;
    product?: { is_splinted?: string };
  };
  return row.is_splinted === "Yes" || row.product?.is_splinted === "Yes";
}

/* ------------------------------------------------------------------ */
/*  Auto-splint + Wing retainer derivation (from retention types)      */
/* ------------------------------------------------------------------ */

/** Per-tooth fixed retention role driving auto-splint and wing rules. */
export type RetentionRole = "Implant" | "Prep" | "Pontic";

/** Per-tooth retention role map. Stored as an array per tooth (popover allows one). */
export type RetentionRoleByTooth = Record<
  number,
  RetentionRole | RetentionRole[] | string | string[] | null | undefined
>;

/** Resolve a single role for a tooth (first entry when stored as an array). */
export function roleForTooth(
  roleByTooth: RetentionRoleByTooth,
  tooth: number
): RetentionRole | null {
  const raw = roleByTooth[tooth];
  const value = Array.isArray(raw) ? (raw.length > 0 ? raw[0] : null) : raw ?? null;
  if (value === "Implant" || value === "Prep" || value === "Pontic") return value;
  return null;
}

/**
 * Rule S1/S2/S3 — auto-splint links derived from retention roles + the rule catalog.
 *
 * A splint link (lower tooth of an adjacent consecutive pair) is created when the
 * two teeth are adjacent, both carry a role, and one is a Pontic whose neighbor's
 * role is in `S1.supportRoles`.
 *
 * - S1: `#13 Prep – #14 Pontic – #15 Prep` → links `13, 14` (chains into `13-14-15`).
 * - S2: all Prep/Implant, no Pontic → no auto links (independent single crowns).
 * - S3: a lone tooth → no auto links (no adjacent pair).
 *
 * When `S1.enabled` is false, no auto-splint links are produced.
 */
export function deriveAutoSplintLinks(
  teeth: number[],
  roleByTooth: RetentionRoleByTooth,
  rules: RetentionRules = DEFAULT_RETENTION_RULES
): number[] {
  if (!rules.S1.enabled) return [];
  const support = new Set<RetentionRole>(rules.S1.supportRoles);
  const sorted = sortedTeeth(teeth);
  const links: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const lower = sorted[i];
    if (sorted[i + 1] !== lower + 1) continue;
    const a = roleForTooth(roleByTooth, lower);
    const b = roleForTooth(roleByTooth, lower + 1);
    if (!a || !b) continue;
    if ((a === "Pontic" && support.has(b)) || (b === "Pontic" && support.has(a))) {
      links.push(lower);
    }
  }
  return links;
}

/**
 * True when the connected unit containing `tooth` already has a real abutment
 * (Prep or Implant). The "unit" is the maximal run of adjacent (consecutive-number)
 * teeth that all carry a role. A supported pontic does not need a wing.
 */
function unitHasAbutment(roleByTooth: RetentionRoleByTooth, tooth: number): boolean {
  const isAbutment = (t: number): boolean => {
    const r = roleForTooth(roleByTooth, t);
    return r === "Prep" || r === "Implant";
  };
  const isRoled = (t: number): boolean => roleForTooth(roleByTooth, t) !== null;
  if (isAbutment(tooth)) return true;
  for (let t = tooth - 1; isRoled(t); t--) if (isAbutment(t)) return true;
  for (let t = tooth + 1; isRoled(t); t++) if (isAbutment(t)) return true;
  return false;
}

/**
 * Wing retainer positions (Rule W1–W3): a wing appears on a Pontic's **empty** arch
 * neighbor ONLY when the pontic is otherwise unsupported — i.e. its connected unit
 * contains no Prep/Implant (a true Maryland / unsupported-pontic case).
 *
 * - W1: an unsupported pontic's empty neighbor → wing.
 * - W3: no wing when the neighbor is Prep/Implant/Pontic, when there is no neighbor
 *   (arch end), or when the pontic's unit already has a Prep/Implant abutment
 *   (e.g. `10 Prep – 11 Pontic` → no wing on 12; `13 Prep – 14 Pontic – 15 Pontic`
 *   → no wing on 16, supported through the splinted chain).
 *
 * `archTeeth` bounds valid tooth numbers for the arch (e.g. 1..16). `ponticTeeth`
 * optionally restricts which pontics generate wings (for per-product scoping).
 * When `W1.enabled` is false, no wings are produced.
 */
export function deriveWingTeeth(
  roleByTooth: RetentionRoleByTooth,
  archTeeth: number[],
  ponticTeeth?: number[],
  rules: RetentionRules = DEFAULT_RETENTION_RULES
): number[] {
  if (!rules.W1.enabled) return [];
  const archSet = new Set(archTeeth);
  const ponticFilter = ponticTeeth ? new Set(ponticTeeth) : null;
  const wings = new Set<number>();
  for (const tooth of archTeeth) {
    if (roleForTooth(roleByTooth, tooth) !== "Pontic") continue;
    if (ponticFilter && !ponticFilter.has(tooth)) continue;
    // Supported pontic (unit already has a Prep/Implant abutment) → no wing.
    if (unitHasAbutment(roleByTooth, tooth)) continue;
    for (const neighbor of [tooth - 1, tooth + 1]) {
      if (!archSet.has(neighbor)) continue;
      if (roleForTooth(roleByTooth, neighbor) === null) wings.add(neighbor);
    }
  }
  return [...wings].sort((a, b) => a - b);
}

/**
 * API payload groups for wings: each pontic+wing pair joined, merged into connected
 * runs the same way as `splinted_teeth` (e.g. a pontic at 14 with empty 13 & 15 →
 * `["13,14,15"]`). Same input shape as splinted teeth.
 */
export function formatWingGroupsForApi(
  roleByTooth: RetentionRoleByTooth,
  archTeeth: number[],
  ponticTeeth?: number[],
  rules: RetentionRules = DEFAULT_RETENTION_RULES
): string[] {
  const wings = deriveWingTeeth(roleByTooth, archTeeth, ponticTeeth, rules);
  if (wings.length === 0) return [];
  // Teeth that participate in a wing unit: each wing plus the pontic it attaches to.
  const unitTeeth = new Set<number>(wings);
  const links: number[] = [];
  for (const wing of wings) {
    for (const pontic of [wing - 1, wing + 1]) {
      if (roleForTooth(roleByTooth, pontic) === "Pontic") {
        unitTeeth.add(pontic);
        links.push(Math.min(wing, pontic));
      }
    }
  }
  return formatSplintGroupsForApi([...unitTeeth], links);
}

/** Switch for how auto-splint and manual edits combine on recompute. */
export type SplintRecomputeMode = "preserve-manual" | "recompute-wins";

/**
 * Hybrid behavior flag (see feature spec). `preserve-manual` keeps the user's
 * manual add/remove edits when retention types change; `recompute-wins` discards
 * them and re-derives splint groups purely from retention roles.
 */
export const SPLINT_RECOMPUTE_MODE: SplintRecomputeMode = "preserve-manual";

/** Manual overlay on top of auto-derived splint links, scoped to one product. */
export interface SplintOverlay {
  /** Links the user added on gaps auto-splint did not connect. */
  added: number[];
  /** Auto links the user explicitly broke. */
  removed: number[];
}

export const EMPTY_SPLINT_OVERLAY: SplintOverlay = { added: [], removed: [] };

/**
 * Effective splint links = auto-derived links combined with the user's manual
 * overlay, per `SPLINT_RECOMPUTE_MODE`.
 */
export function combineSplintLinks(
  autoLinks: number[],
  overlay: SplintOverlay | undefined,
  mode: SplintRecomputeMode = SPLINT_RECOMPUTE_MODE
): number[] {
  if (mode === "recompute-wins" || !overlay) {
    return [...new Set(autoLinks)].sort((a, b) => a - b);
  }
  const removed = new Set(overlay.removed);
  const result = new Set(autoLinks.filter((l) => !removed.has(l)));
  for (const l of overlay.added) result.add(l);
  return [...result].sort((a, b) => a - b);
}

/**
 * Toggle a splint link in the manual overlay relative to the current auto links.
 * Toggling an auto link off records a removal; toggling it back on clears that
 * removal. Toggling a non-auto link on records an addition; off clears it.
 */
export function toggleSplintOverlay(
  overlay: SplintOverlay | undefined,
  autoLinks: number[],
  lower: number
): SplintOverlay {
  const base: SplintOverlay = overlay
    ? { added: [...overlay.added], removed: [...overlay.removed] }
    : { added: [], removed: [] };
  const isAuto = autoLinks.includes(lower);
  const currentlyOn = combineSplintLinks(autoLinks, base).includes(lower);

  if (isAuto) {
    if (currentlyOn) {
      if (!base.removed.includes(lower)) base.removed.push(lower);
    } else {
      base.removed = base.removed.filter((l) => l !== lower);
    }
  } else {
    if (currentlyOn) {
      base.added = base.added.filter((l) => l !== lower);
    } else {
      if (!base.added.includes(lower)) base.added.push(lower);
    }
  }
  base.added.sort((a, b) => a - b);
  base.removed.sort((a, b) => a - b);
  return base;
}
