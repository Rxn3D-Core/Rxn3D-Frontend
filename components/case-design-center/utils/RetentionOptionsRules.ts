/**
 * Retention-options rule catalog — the single, easy-to-find home for the
 * splint (S1–S3) and wing (W1–W3) rules that drive the fixed-restoration tooth
 * chart.
 *
 * Each rule carries its meaning (`description`), a few worked `examples`, an
 * on/off `enabled` flag, and any parameters. The derivation helpers in
 * `splintHelpers.ts` read from this catalog (defaulting to `DEFAULT_RETENTION_RULES`),
 * so behavior is fully described in one place.
 *
 * To add or change a rule in the future: edit/add an entry here (with its
 * examples) and the small piece of logic that consumes it — nothing in the
 * panels, SVG charts, or submit payload needs to change.
 */
import type { RetentionRole } from "./splintHelpers.ts";

/** Common shape for every rule entry: id + human description + examples + on/off. */
export interface RetentionRuleMeta {
  id: string;
  label: string;
  description: string;
  /** Worked examples (`selection → result`) kept with the rule for documentation. */
  examples: string[];
  enabled: boolean;
}

/** S1 also carries which neighbor roles count as "support" for a pontic. */
export interface SplintRuleS1 extends RetentionRuleMeta {
  supportRoles: RetentionRole[];
}

/** The full rule catalog driving auto-splint and wing derivation. */
export interface RetentionRules {
  S1: SplintRuleS1;
  S2: RetentionRuleMeta;
  S3: RetentionRuleMeta;
  W1: RetentionRuleMeta;
  W2: RetentionRuleMeta;
  W3: RetentionRuleMeta;
}

/** Default catalog — encodes today's behavior. */
export const DEFAULT_RETENTION_RULES: RetentionRules = {
  S1: {
    id: "S1",
    label: "Auto-splint with abutment",
    description:
      "A Pontic adjacent to a support tooth (Prep / Implant / another Pontic) auto-splints; " +
      "chains into one connected group.",
    examples: [
      "13 Prep – 14 Pontic – 15 Prep → splint [\"13,14,15\"]",
      "5 Prep – 6 Pontic (cantilever) → splint [\"5,6\"]",
      "5 Implant – 6 Pontic → splint [\"5,6\"]",
      "14 Pontic – 15 Pontic → splint [\"14,15\"]",
      "13 Prep – 14 Pontic – 15 Pontic – 16 Prep → splint [\"13,14,15,16\"]",
    ],
    enabled: true,
    supportRoles: ["Prep", "Implant", "Pontic"],
  },
  S2: {
    id: "S2",
    label: "Manual splint when no pontic",
    description:
      "All Prep/Implant with no Pontic → independent single crowns; the user may splint them manually.",
    examples: [
      "13 Prep – 14 Prep – 15 Implant (no pontic) → — (manual only)",
    ],
    enabled: true,
  },
  S3: {
    id: "S3",
    label: "Single tooth never splinted",
    description: "A lone selected tooth is never splinted (no adjacent pair to connect).",
    examples: ["6 alone (Prep/Implant) → —"],
    enabled: true,
  },
  W1: {
    id: "W1",
    label: "Wing on empty neighbor",
    description: "A Pontic's immediate arch neighbor that is empty shows a wing retainer.",
    examples: [
      "14 Pontic, 13 & 15 empty → wings [\"13,14,15\"]",
      "1 Pontic (arch end), 2 empty → wings [\"1,2\"]",
      "13 Prep – 14 Pontic, 15 empty (hybrid) → splint [\"13,14\"] + wing [\"14,15\"]",
    ],
    enabled: true,
  },
  W2: {
    id: "W2",
    label: "Never auto-assign wing",
    description:
      "A wing is never assigned as a tooth role; it is purely derived from the chart state each render.",
    examples: [
      "13 empty – 14 Pontic – 15 empty, then user sets 13 Prep → splint [\"13,14\"], wing [\"14,15\"] (15 still empty)",
    ],
    enabled: true,
  },
  W3: {
    id: "W3",
    label: "Hide wing when not applicable",
    description:
      "No wing when the neighbor is Prep/Implant/Pontic (a splint case) or there is no neighbor (arch end).",
    examples: [
      "13 Prep – 14 Pontic – 15 Implant → no wings (both neighbors filled)",
    ],
    enabled: true,
  },
};
