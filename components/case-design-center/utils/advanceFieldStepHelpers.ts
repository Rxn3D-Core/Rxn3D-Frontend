/** Stored selection for a single advance field within a fixed-restoration step JSON blob. */
export type StoredAdvanceSelection = {
  name: string;
  optionId?: number;
  optionIds?: number[];
  /** Plain text / number / multiline / file label. */
  textValue?: string;
  fileName?: string;
};

export type AdvanceFieldLike = {
  id: number;
  name?: string;
  field_type?: string;
  options?: Array<{ id: number; name: string; status?: string; [key: string]: unknown }>;
};

export function normalizeAdvanceFieldType(fieldType?: string | null): string {
  return (fieldType ?? "dropdown").toLowerCase().trim();
}

export function isCheckboxAdvanceField(field?: { field_type?: string } | null): boolean {
  return normalizeAdvanceFieldType(field?.field_type) === "checkbox";
}

export function isRadioAdvanceField(field?: { field_type?: string } | null): boolean {
  return normalizeAdvanceFieldType(field?.field_type) === "radio";
}

export function isDropdownAdvanceField(field?: { field_type?: string } | null): boolean {
  return normalizeAdvanceFieldType(field?.field_type) === "dropdown";
}

export function isFileUploadAdvanceField(field?: { field_type?: string } | null): boolean {
  const t = normalizeAdvanceFieldType(field?.field_type);
  return t === "file_upload" || t === "file";
}

export function isTextAdvanceField(field?: { field_type?: string } | null): boolean {
  const t = normalizeAdvanceFieldType(field?.field_type);
  return t === "text" || t === "multiline_text" || t === "number";
}

export function isOptionBasedAdvanceField(field?: { field_type?: string } | null): boolean {
  const t = normalizeAdvanceFieldType(field?.field_type);
  return t === "dropdown" || t === "radio" || t === "checkbox";
}

/** Fields with dedicated UI elsewhere in the fixed flow. */
export function isSpecialAdvanceField(field?: { field_type?: string } | null): boolean {
  const t = normalizeAdvanceFieldType(field?.field_type);
  return t === "shade_guide" || t === "implant_library";
}

export function getActiveAdvanceOptions<T extends { status?: string }>(
  field: AdvanceFieldLike | undefined,
): T[] {
  return ((field?.options ?? []) as T[]).filter(
    (opt) => opt.status === "Active" || opt.status === undefined,
  );
}

export function getSelectedOptionIds(
  selection: StoredAdvanceSelection | undefined,
): number[] {
  if (!selection) return [];
  if (Array.isArray(selection.optionIds) && selection.optionIds.length > 0) {
    return selection.optionIds;
  }
  if (selection.optionId && selection.optionId > 0) return [selection.optionId];
  return [];
}

export function getPlainTextValue(selection: StoredAdvanceSelection | undefined): string {
  if (!selection) return "";
  const text = selection.textValue ?? selection.name ?? "";
  return typeof text === "string" ? text.trim() : "";
}

export function isAdvanceSelectionComplete(
  field: { field_type?: string },
  selection: StoredAdvanceSelection | undefined,
): boolean {
  if (isSpecialAdvanceField(field)) return true;

  if (isOptionBasedAdvanceField(field)) {
    return getSelectedOptionIds(selection).length > 0;
  }

  if (isFileUploadAdvanceField(field)) {
    return !!(selection?.fileName?.trim() || getPlainTextValue(selection));
  }

  if (isTextAdvanceField(field)) {
    return getPlainTextValue(selection).length > 0;
  }

  return getPlainTextValue(selection).length > 0 || getSelectedOptionIds(selection).length > 0;
}

export function buildCheckboxSelection(
  optionIds: number[],
  activeOptions: Array<{ id: number; name: string }>,
): StoredAdvanceSelection {
  const names = activeOptions.filter((o) => optionIds.includes(o.id)).map((o) => o.name);
  return { name: names.join(", "), optionIds };
}

export function buildSingleOptionSelection(opt: {
  id: number;
  name: string;
}): StoredAdvanceSelection {
  return { name: opt.name, optionId: opt.id };
}

export function buildTextSelection(value: string): StoredAdvanceSelection {
  const trimmed = value.trim();
  return { name: trimmed, textValue: trimmed };
}

export function buildFileSelection(fileName: string): StoredAdvanceSelection {
  const trimmed = fileName.trim();
  return { name: trimmed, fileName: trimmed, textValue: trimmed };
}

export function toggleCheckboxOption(
  selection: StoredAdvanceSelection | undefined,
  opt: { id: number; name: string },
  checked: boolean,
  activeOptions: Array<{ id: number; name: string }>,
): StoredAdvanceSelection {
  const prev = getSelectedOptionIds(selection);
  const next = checked
    ? [...new Set([...prev, opt.id])]
    : prev.filter((id) => id !== opt.id);
  return buildCheckboxSelection(next, activeOptions);
}

export function allAdvanceFieldsComplete(
  fields: Array<{ id: number; field_type?: string }>,
  values: Record<string, StoredAdvanceSelection>,
): boolean {
  return fields.every((f) => isAdvanceSelectionComplete(f, values[f.id]));
}

/** Format `advance_field_value` for slip create. */
export function formatAdvanceFieldPayloadValue(
  field: { field_type?: string },
  selection: StoredAdvanceSelection | undefined,
): string | null {
  if (isFileUploadAdvanceField(field) || isTextAdvanceField(field)) {
    const text = getPlainTextValue(selection);
    return text || null;
  }

  const optionIds = getSelectedOptionIds(selection);
  if (optionIds.length === 0) return null;
  if (isCheckboxAdvanceField(field)) {
    return JSON.stringify(optionIds);
  }
  return String(optionIds[0]);
}
