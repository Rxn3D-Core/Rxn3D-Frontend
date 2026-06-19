import type { ReactNode } from "react"

type V2CaseIconProps = {
  className?: string
}

type SvgIconProps = V2CaseIconProps & {
  children: ReactNode
}

function SvgIcon({ className, children }: SvgIconProps) {
  return (
    <svg
      aria-hidden={true}
      className={className}
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 16 16"
      width="16"
    >
      {children}
    </svg>
  )
}

export function ProgressIcon({ className }: V2CaseIconProps) {
  return (
    <SvgIcon className={className}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 4.75V8l2.25 1.35" />
    </SvgIcon>
  )
}

export function HoldIcon({ className }: V2CaseIconProps) {
  return (
    <SvgIcon className={className}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M6.25 5.75v4.5M9.75 5.75v4.5" />
    </SvgIcon>
  )
}

export function CancelledIcon({ className }: V2CaseIconProps) {
  return (
    <SvgIcon className={className}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="m5.75 5.75 4.5 4.5m0-4.5-4.5 4.5" />
    </SvgIcon>
  )
}

export function DoneIcon({ className }: V2CaseIconProps) {
  return (
    <SvgIcon className={className}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="m5.25 8 1.75 1.75 3.75-3.75" />
    </SvgIcon>
  )
}

export function ViewIcon({ className }: V2CaseIconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M1.75 8s2.25-3.5 6.25-3.5S14.25 8 14.25 8 12 11.5 8 11.5 1.75 8 1.75 8Z" />
      <circle cx="8" cy="8" r="1.5" />
    </SvgIcon>
  )
}

export function PrintIcon({ className }: V2CaseIconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M4.25 5V2.25h7.5V5M4.25 11H2.5V6.25h11V11h-1.75" />
      <path d="M4.25 9.25h7.5v4.5h-7.5zM11.5 7.5h.01" />
    </SvgIcon>
  )
}

export function PhoneIcon({ className }: V2CaseIconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M5.4 2.25 7 5.35 5.65 6.7a10.2 10.2 0 0 0 3.65 3.65L10.65 9l3.1 1.6-.5 2.4c-.12.57-.63.98-1.22.98A10.02 10.02 0 0 1 2.02 3.97c0-.59.41-1.1.98-1.22l2.4-.5Z" />
    </SvgIcon>
  )
}

export function PaperclipIcon({ className }: V2CaseIconProps) {
  return (
    <SvgIcon className={className}>
      <path d="m5.25 8.75 4.4-4.4a2.12 2.12 0 1 1 3 3l-5.4 5.4a3 3 0 0 1-4.25-4.25l5.1-5.1" />
      <path d="m6.2 9.8 4.6-4.6" />
    </SvgIcon>
  )
}

export function CopyIcon({ className }: V2CaseIconProps) {
  return (
    <SvgIcon className={className}>
      <rect x="5.25" y="5.25" width="8" height="8" rx="1.25" />
      <path d="M10.75 5.25v-1.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1.5" />
    </SvgIcon>
  )
}

export function MoreIcon({ className }: V2CaseIconProps) {
  return (
    <SvgIcon className={className}>
      <circle cx="3.25" cy="8" r=".65" />
      <circle cx="8" cy="8" r=".65" />
      <circle cx="12.75" cy="8" r=".65" />
    </SvgIcon>
  )
}

export function CalendarIcon({ className }: V2CaseIconProps) {
  return (
    <SvgIcon className={className}>
      <rect x="2.25" y="3.5" width="11.5" height="10" rx="1.5" />
      <path d="M5 2.25v2.5m6-2.5v2.5M2.25 6.5h11.5" />
    </SvgIcon>
  )
}

export function LabLocationIcon({ className }: V2CaseIconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M13 6.5c0 3.7-5 7.25-5 7.25S3 10.2 3 6.5a5 5 0 0 1 10 0Z" />
      <path d="M5.75 8.25v-3.5h4.5v3.5M7.25 4.75v3.5m1.5-3.5v3.5" />
    </SvgIcon>
  )
}
