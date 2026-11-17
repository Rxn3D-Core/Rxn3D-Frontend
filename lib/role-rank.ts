/**
 * Role ranks used to decide who may remove whom. Mirrors the backend table
 * `App\Support\RoleRank` (RXN-83); keep the two in sync.
 */
const ROLE_RANKS: Record<string, number> = {
  superadmin: 100,
  lab_admin: 50,
  office_admin: 50,
  doctor_admin: 40,
  lab_user: 20,
  office_user: 20,
  doctor: 20,
  lab_driver: 10,
  personal_user: 10,
}

/** Rank of a role not in the table (custom roles): same tier as a regular user. */
const DEFAULT_RANK = 20

export function roleRank(role?: string | null): number {
  return (role && ROLE_RANKS[role]) || DEFAULT_RANK
}

/**
 * Whether the signed-in user may remove a member. Equal rank is allowed; a higher
 * rank is not. Superadmin and removing yourself are always allowed. When the member's
 * role is unknown the button stays enabled (the backend still enforces the rule).
 */
export function canRemoveMember(params: {
  actorRole?: string | null
  actorIsSuperadmin?: boolean
  targetRole?: string | null
  isSelf?: boolean
}): boolean {
  const { actorRole, actorIsSuperadmin, targetRole, isSelf } = params
  if (actorIsSuperadmin || isSelf) return true
  if (!targetRole || !actorRole) return true
  return roleRank(targetRole) <= roleRank(actorRole)
}
