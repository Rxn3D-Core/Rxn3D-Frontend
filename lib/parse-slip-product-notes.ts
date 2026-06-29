/**
 * Parse stage / shade values from slip product `notes` text produced by
 * case-design-center `caseNoteBuilder` when structured API fields are empty.
 */

export interface ParsedSlipProductNotes {
  stage: string;
  teethShade: string;
  gumShade: string;
  stumpShade: string;
}

const EMPTY: ParsedSlipProductNotes = {
  stage: "",
  teethShade: "",
  gumShade: "",
  stumpShade: "",
};

function capture(text: string, pattern: RegExp): string {
  const match = text.match(pattern);
  return match?.[1]?.trim() ?? "";
}

/** Stage name from "... in the Bite block stage." (removable, fixed, orthodontic). */
export function parseStageFromSlipProductNotes(notes: string): string {
  if (!notes?.trim()) return "";
  return capture(notes, /\bin the (.+?) stage\b/i);
}

/** Removable teeth shade from "use … denture" (includes optional shade system prefix). */
export function parseRemovableTeethShadeFromNotes(notes: string): string {
  if (!notes?.trim()) return "";
  const withSystem = capture(notes, /\buse\s+(?:.+?\s+)?([A-Za-z0-9][A-Za-z0-9./+\-]*)\s+denture\b/i);
  if (withSystem) return withSystem;
  return capture(notes, /\bUse\s+(.+?)\s+denture teeth\b/i);
}

/** Gum shade from "... with Dark Pink gingiva." or "Use Dark Pink gingiva." */
export function parseGumShadeFromSlipProductNotes(notes: string): string {
  if (!notes?.trim()) return "";
  return (
    capture(notes, /\bwith\s+(.+?)\s+gingiva\b/i) ||
    capture(notes, /\bUse\s+(.+?)\s+gingiva\./i)
  );
}

/** Fixed restoration tooth shade from "Tooth shade: A2." */
export function parseFixedTeethShadeFromNotes(notes: string): string {
  if (!notes?.trim()) return "";
  return capture(notes, /\bTooth shade:\s*([^.,]+)/i);
}

/** Fixed stump shade from "Stump shade: ..." */
export function parseStumpShadeFromSlipProductNotes(notes: string): string {
  if (!notes?.trim()) return "";
  return capture(notes, /\bStump shade:\s*([^.,]+)/i);
}

export function parseSlipProductNotes(notes: string): ParsedSlipProductNotes {
  if (!notes?.trim()) return { ...EMPTY };
  return {
    stage: parseStageFromSlipProductNotes(notes),
    teethShade:
      parseRemovableTeethShadeFromNotes(notes) ||
      parseFixedTeethShadeFromNotes(notes),
    gumShade: parseGumShadeFromSlipProductNotes(notes),
    stumpShade: parseStumpShadeFromSlipProductNotes(notes),
  };
}
