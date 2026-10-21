"use client"

import { Input } from "@/components/ui/input"
import { DEGREE_LABEL, DEGREE_MAX_LENGTH, DEGREE_PLACEHOLDER } from "@/lib/doctor-degree"

interface DoctorDegreeFieldProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  /** Error message from the form (shown by the Input in the error state). */
  error?: string
  className?: string
}

/**
 * Optional "Degree" field for doctors. Free text: there are many degrees, so the doctor types their own
 * (DDS, DMD, "DDS, MS", ...). Leaving it empty is fine.
 */
export function DoctorDegreeField({ value, onChange, onBlur, error, className }: DoctorDegreeFieldProps) {
  return (
    <Input
      label={DEGREE_LABEL}
      placeholder={DEGREE_PLACEHOLDER}
      value={value}
      maxLength={DEGREE_MAX_LENGTH}
      autoComplete="off"
      validationState={error ? "error" : "default"}
      errorMessage={error}
      className={className}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    />
  )
}
