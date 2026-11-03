import type { Connection, ConnectionHold } from "@/contexts/connection-context"
import { getPrimaryRole } from "@/lib/get-primary-role"

type UserWithRoles = Parameters<typeof getPrimaryRole>[0]

/** Lab-side users see connected offices as practices; office-side users see connected labs. */
export function categorizeConnections(
  connections: Connection[],
  role: string,
): { practices: Connection[]; labs: Connection[] } {
  const isLabSide = role === "lab_admin" || role === "lab_user" || role === "lab_driver" || role === "superadmin"

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

/** Lab↔office link paused from the dashboard (API status `OnHold`). */
export function isOnHoldConnection(connection: { status?: string | null }): boolean {
  const status = connection.status?.toLowerCase().replace(/[\s_-]/g, "") ?? ""
  return status === "onhold"
}

export interface ConnectionHoldState {
  onHold: boolean
  /** The viewer's side placed the hold. */
  isMine: boolean
  heldBySide: "lab" | "office" | null
  canHold: boolean
  canResume: boolean
  /** A request can be sent now (permission, not the holder, not throttled). */
  canRequestResume: boolean
  /** A request was sent and the 24 h throttle has not passed yet. */
  requestPending: boolean
  requestedAt: string | null
  requestAvailableAt: string | null
}

function isFutureIso(value: string | null | undefined, now: number): boolean {
  if (!value) return false
  const time = Date.parse(value)
  return Number.isFinite(time) && time > now
}

/**
 * Hold actions for one connection, from the API `hold` block.
 * Old backend (no `hold`): falls back to `status`, with the previous behaviour
 * (Hold when Active, Resume when OnHold, no Request to Resume).
 */
export function getHoldState(
  connection: { status?: string | null; hold?: ConnectionHold | null },
  now: number = Date.now(),
): ConnectionHoldState {
  const hold = connection.hold

  if (!hold) {
    const onHold = isOnHoldConnection(connection)
    return {
      onHold,
      isMine: false,
      heldBySide: null,
      canHold: !onHold,
      canResume: onHold,
      canRequestResume: false,
      requestPending: false,
      requestedAt: null,
      requestAvailableAt: null,
    }
  }

  const onHold = !!hold.is_on_hold
  const isMine = onHold && !!hold.is_mine
  const requestPending = onHold && !isMine && isFutureIso(hold.request_resume_available_at, now)

  return {
    onHold,
    isMine,
    heldBySide: onHold ? hold.held_by_side ?? null : null,
    canHold: !onHold && !!hold.can_hold,
    canResume: onHold && !!hold.can_resume,
    canRequestResume: onHold && !isMine && !!hold.can_request_resume && !requestPending,
    requestPending,
    requestedAt: onHold ? hold.resume_requested_at ?? null : null,
    requestAvailableAt: requestPending ? hold.request_resume_available_at : null,
  }
}

/** i18n key (under `connections.hold`) for the connected-status badge. */
export function getHoldBadgeKey(state: ConnectionHoldState): string {
  if (!state.onHold) return "badgeConnected"
  if (state.isMine) return "badgeOnHoldByYou"
  if (state.heldBySide === "lab") return "badgeOnHoldByLab"
  if (state.heldBySide === "office") return "badgeOnHoldByOffice"
  return "badgeOnHold"
}

/** Connected tab should list Active and OnHold partners. */
export function isVisibleDashboardConnection(connection: Connection): boolean {
  return isActiveConnection(connection) || isOnHoldConnection(connection)
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
