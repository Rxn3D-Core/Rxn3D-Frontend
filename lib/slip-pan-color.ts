/** Shared pan-row color assignment on lab listing. */
export type SlipPanColorAssignment = {
  color: string
  assignedBy: {
    id: number
    first_name: string
    last_name: string
  }
}

export function formatPanAssigneeName(assignedBy?: {
  first_name?: string
  last_name?: string
} | null): string {
  if (!assignedBy) return "another user"
  const name = [assignedBy.first_name, assignedBy.last_name]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ")
  return name || "another user"
}

export function mapApiPanColorAssignment(raw: unknown): SlipPanColorAssignment | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const obj = raw as Record<string, unknown>
  const color = typeof obj.color === "string" ? obj.color : ""
  if (!color) return undefined
  const assigned = (obj.assigned_by && typeof obj.assigned_by === "object"
    ? obj.assigned_by
    : {}) as Record<string, unknown>
  return {
    color,
    assignedBy: {
      id: Number(assigned.id) || 0,
      first_name: String(assigned.first_name ?? ""),
      last_name: String(assigned.last_name ?? ""),
    },
  }
}
