/** Minimum length for name words that count toward the two-word requirement. */
export const PATIENT_NAME_WORD_MIN_LENGTH = 2;

/** How many words must meet {@link PATIENT_NAME_WORD_MIN_LENGTH}. */
export const PATIENT_NAME_REQUIRED_QUALIFYING_WORDS = 2;

/** @deprecated Use {@link PATIENT_NAME_WORD_MIN_LENGTH}. */
export const PATIENT_FIRST_NAME_MIN_LENGTH = PATIENT_NAME_WORD_MIN_LENGTH;

/** @deprecated Single-character middle initials are allowed; not every word needs this length. */
export const PATIENT_OTHER_NAME_MIN_LENGTH = 1;

export function getPatientNameParts(name: string): string[] {
  return name.trim().split(/\s+/).filter((part) => part.length > 0);
}

export function countPatientNameWordsAtMinLength(
  parts: string[],
  minLength = PATIENT_NAME_WORD_MIN_LENGTH
): number {
  return parts.filter((part) => part.length >= minLength).length;
}

/**
 * Patient name rules:
 * - At least two words total
 * - At least two words must be 2+ characters (e.g. first + last)
 * - Other words may be a single character (e.g. "Heidi C Reyes")
 */
export function isValidPatientName(name: string): boolean {
  const parts = getPatientNameParts(name);
  if (parts.length < 2) return false;
  return (
    countPatientNameWordsAtMinLength(parts) >=
    PATIENT_NAME_REQUIRED_QUALIFYING_WORDS
  );
}

/** Show gender when the name is valid, or while typing toward a valid name. */
export function shouldShowPatientGenderField(name: string): boolean {
  if (isValidPatientName(name)) return true;
  const parts = getPatientNameParts(name);
  if (parts.length < 2) return false;
  if (parts[0].length < PATIENT_NAME_WORD_MIN_LENGTH) return false;
  if (
    countPatientNameWordsAtMinLength(parts) >=
    PATIENT_NAME_REQUIRED_QUALIFYING_WORDS
  ) {
    return true;
  }
  return parts[parts.length - 1].length === PATIENT_OTHER_NAME_MIN_LENGTH;
}

/** Auto-open gender when the name is valid or the user finishes a typical name segment. */
export function shouldAutoOpenPatientGender(name: string, gender: string): boolean {
  if (gender.trim() !== "") return false;
  if (isValidPatientName(name)) return true;
  const parts = getPatientNameParts(name);
  if (parts.length < 2) return false;
  if (parts[0].length < PATIENT_NAME_WORD_MIN_LENGTH) return false;

  const last = parts[parts.length - 1];
  const qualifyingCount = countPatientNameWordsAtMinLength(parts);

  if (
    parts.length === 2 &&
    qualifyingCount >= PATIENT_NAME_REQUIRED_QUALIFYING_WORDS &&
    last.length === PATIENT_NAME_WORD_MIN_LENGTH
  ) {
    return true;
  }

  if (parts.length === 2 && last.length === PATIENT_OTHER_NAME_MIN_LENGTH) {
    return true;
  }

  if (
    parts.length >= 3 &&
    qualifyingCount >= PATIENT_NAME_REQUIRED_QUALIFYING_WORDS &&
    last.length === PATIENT_NAME_WORD_MIN_LENGTH
  ) {
    return true;
  }

  return false;
}

/** Dynamic floating label for the patient name field. */
export function getPatientNameFieldLabel(
  name: string,
  baseLabel = "Patient name"
): string {
  if (!name.trim()) return baseLabel;
  if (isValidPatientName(name)) return baseLabel;
  const parts = getPatientNameParts(name);
  const firstWord = parts[0] ?? "";
  if (firstWord.length >= PATIENT_NAME_WORD_MIN_LENGTH && parts.length < 2) {
    return "Enter patient's last name";
  }
  if (firstWord.length > 0 && firstWord.length < PATIENT_NAME_WORD_MIN_LENGTH) {
    return "Enter patient's full name";
  }
  if (firstWord.length >= PATIENT_NAME_WORD_MIN_LENGTH) {
    return "Enter patient's last name";
  }
  return baseLabel;
}
