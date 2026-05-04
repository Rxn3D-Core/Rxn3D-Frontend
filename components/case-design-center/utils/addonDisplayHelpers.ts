/**
 * Parses the stored add-ons label string (comma-separated, from CaseDesignCenter) into
 * rows we should show in the UI. Omits empty selections such as "0 selected".
 */
export function parseAddonDisplayItems(addonsVal: string | undefined | null): string[] {
  const raw = (addonsVal ?? "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      const lower = s.toLowerCase();
      if (lower === "0 selected") return false;
      return true;
    });
}

export function hasVisibleAddonDisplay(addonsVal: string | undefined | null): boolean {
  return parseAddonDisplayItems(addonsVal).length > 0;
}
