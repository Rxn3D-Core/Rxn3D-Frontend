export const USER_STATUSES = [
  "Active",
  "Inactive",
  "Suspended",
  "Pending",
  "Archived",
  "Invited",
] as const

export type UserStatus = (typeof USER_STATUSES)[number]

/** Map API/UI input to the Title Case status the backend validates. */
export function formatUserStatusForApi(status: string): UserStatus {
  const match = USER_STATUSES.find((option) => option.toLowerCase() === status.trim().toLowerCase())
  if (!match) {
    throw new Error(
      `The status must be one of: ${USER_STATUSES.join(", ")}.`,
    )
  }
  return match
}

/** Normalize API responses for display in the UI. */
export function normalizeUserStatus(status: string | undefined | null): UserStatus {
  const match = USER_STATUSES.find((option) => option.toLowerCase() === (status || "").trim().toLowerCase())
  return match ?? "Inactive"
}
