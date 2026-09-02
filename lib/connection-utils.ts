import type { Connection } from "@/contexts/connection-context"
import { getPrimaryRole } from "@/lib/get-primary-role"

type UserWithRoles = Parameters<typeof getPrimaryRole>[0]

/** Lab-side users see connected offices as practices; office-side users see connected labs. */
export function categorizeConnections(
  connections: Connection[],
  role: string,
): { practices: Connection[]; labs: Connection[] } {
  const isLabSide = role === "lab_admin" || role === "lab_user" || role === "superadmin"

  if (isLabSide) {
    return { practices: connections, labs: [] }
  }

  return { practices: [], labs: connections }
}

export function categorizeConnectionsForUser(
  connections: Connection[],
  user?: UserWithRoles,
): { practices: Connection[]; labs: Connection[] } {
  return categorizeConnections(connections, getPrimaryRole(user))
}

export function isActiveConnection(connection: Connection): boolean {
  return connection.status?.toLowerCase() === "active"
}

export function getConnectionPartner(connection: Connection) {
  return connection.partner
}

export function getConnectionPartnerId(connection: Connection): number {
  return connection.partner?.id ?? connection.id
}

export function getConnectionPartnerName(connection: Connection): string {
  return connection.partner?.name ?? connection.name ?? "Unknown"
}

export function getConnectionPartnerEmail(connection: Connection): string {
  return connection.partner?.email ?? connection.email ?? ""
}

export function getConnectionPartnerLocation(connection: Connection): string {
  const partner = connection.partner
  if (!partner) return ""
  return [partner.city, partner.state].filter(Boolean).join(", ")
}
