"use client";

import { createContext, useContext } from "react";

/**
 * When true, the field auto-open helpers (stage, teeth/stump shade, gum shade,
 * impression) are suppressed for every panel descendant.
 *
 * Used by the edit-slip flow: the slip is fully preloaded with the selections the
 * user already made, so the design center must display those values (exactly like
 * the read-only virtual slip) without re-prompting for each already-selected field.
 * The normal (new-slip / add-stage) flows leave this false so their guided
 * auto-open prompts keep working.
 */
export const AutoOpenSuppressionContext = createContext(false);

export function useAutoOpenSuppressed(): boolean {
  return useContext(AutoOpenSuppressionContext);
}
