import { z } from "zod"

/**
 * Optional doctor degree / credentials (e.g. DDS, DMD, "DDS, MS"), shown after the doctor's name on prescriptions.
 * Free text so any degree can be entered; mirrors the backend rule (max 50, plain characters only).
 */

export const DEGREE_MAX_LENGTH = 50
export const DEGREE_LABEL = "Degree (optional)"
export const DEGREE_PLACEHOLDER = "e.g. DDS, DMD"

const DEGREE_PATTERN = /^[\p{L}\p{N}\s.,&()/-]*$/u
export const DEGREE_FORMAT_ERROR = "Use letters, numbers, spaces and . , & ( ) / - only"
export const DEGREE_LENGTH_ERROR = `Degree can be at most ${DEGREE_MAX_LENGTH} characters`

/** Zod field for forms: optional, so an empty value is valid. */
export const degreeField = z
  .string()
  .max(DEGREE_MAX_LENGTH, DEGREE_LENGTH_ERROR)
  .regex(DEGREE_PATTERN, DEGREE_FORMAT_ERROR)
  .optional()

/** Error message for a typed degree, or null when it is empty or valid (for forms that do not use zod). */
export function validateDegree(value?: string | null): string | null {
  const clean = normalizeDegree(value)
  if (clean.length > DEGREE_MAX_LENGTH) return DEGREE_LENGTH_ERROR
  if (!DEGREE_PATTERN.test(clean)) return DEGREE_FORMAT_ERROR
  return null
}

/** Trimmed, single-spaced degree, or "" when none. */
export function normalizeDegree(value?: string | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim()
}

/** "Maria Pavlova" + "DDS" -> "Maria Pavlova, DDS". Without a degree the name is unchanged. */
export function withDegree(name: string, degree?: string | null): string {
  const clean = normalizeDegree(degree)
  return clean ? `${name}, ${clean}` : name
}

/**
 * A doctor record's saved degree, wherever the API put it: top-level `degree` (slip, case and user
 * responses) or `doctor_info.degree` (office doctors list). "" when none is saved.
 */
export function getDoctorDegree(doctor?: unknown): string {
  if (!doctor || typeof doctor !== "object") return ""
  const record = doctor as { degree?: unknown; doctor_info?: { degree?: unknown } | null }
  const raw = record.degree ?? record.doctor_info?.degree
  return typeof raw === "string" ? normalizeDegree(raw) : ""
}
