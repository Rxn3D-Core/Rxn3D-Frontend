export const COLORS = {
  primary: "#1162a8",
  primaryHover: "#0f5497",
  blue50: "#f7fbff",
  blue100: "#dfeefb",
  blue200: "#d9e5f0",
  gray50: "#f9f9f9",
  gray100: "#f7fbff",
  gray200: "#e4e6ef",
  gray400: "#948d8d",
  gray500: "#b4b0b0",
} as const

export const CONNECTION_TYPES = [
  { value: "practice", label: "Practice" },
  { value: "lab", label: "Lab" },
  { value: "user", label: "User" },
] as const

export const CONNECTION_STATUS = {
  CONNECTED: "Connected",
  REQUESTED: "Requested",
  PENDING: "Pending",
} as const
