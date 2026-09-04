import { getRoleDisplayLabel } from "@/lib/user-role-labels"

export interface UserCustomerRoleLink {
  customerId: number
  customerName: string
  customerType?: string | null
  roleId?: number | null
  roleName: string
  departments: string[]
  isPrimary?: boolean
}

export interface UserCustomerRoleDisplay {
  customerNameDisplay: string
  roleDisplay: string
  customerNamesList: string[]
  roleNamesList: string[]
  departmentsList: string[]
  customerRoles: UserCustomerRoleLink[]
  /** Lines for hover: "Customer — Role" */
  associationHoverLines: string[]
}

const formatFirstPlusCount = (items: string[]) => {
  if (!items || items.length === 0) return "N/A"
  if (items.length === 1) return items[0]
  return `${items[0]} +${items.length - 1}`
}

const extractRoleName = (role: unknown): string => {
  if (!role) return ""
  if (typeof role === "string") return role
  if (typeof role === "object" && role !== null && "name" in role) {
    return String((role as { name?: string }).name || "")
  }
  return ""
}

const extractRoleId = (role: unknown): number | null => {
  if (!role || typeof role !== "object") return null
  const id = (role as { id?: number }).id
  return typeof id === "number" ? id : null
}

/**
 * Normalize UserResource / legacy payloads into customer–role links.
 * List/show API uses `customers[]` (id, name, type, role, departments).
 * Older shapes may use `customer_users[]`.
 */
export function extractUserCustomerRoleLinks(
  userData: any,
  customerNameById?: Record<string, string>,
): UserCustomerRoleLink[] {
  const fromCustomers = Array.isArray(userData?.customers)
    ? userData.customers
        .map((c: any) => {
          const customerId = Number(c?.id ?? c?.customer_id ?? c?.customer?.id)
          if (!customerId) return null
          const roleName = extractRoleName(c?.role) || extractRoleName(c?.pivot?.role)
          const roleId =
            extractRoleId(c?.role) ??
            (typeof c?.pivot?.role_id === "number" ? c.pivot.role_id : null)
          const departments = Array.isArray(c?.departments)
            ? c.departments
                .map((d: any) => d?.name || d?.department?.name)
                .filter((name: unknown): name is string => typeof name === "string" && name.trim().length > 0)
            : []
          return {
            customerId,
            customerName:
              c?.name ||
              c?.customer?.name ||
              customerNameById?.[String(customerId)] ||
              `Customer #${customerId}`,
            customerType: c?.type || c?.customer?.type || null,
            roleId,
            roleName,
            departments,
            isPrimary: Boolean(c?.is_primary ?? c?.pivot?.is_primary),
          } satisfies UserCustomerRoleLink
        })
        .filter(Boolean)
    : []

  if (fromCustomers.length > 0) {
    return fromCustomers as UserCustomerRoleLink[]
  }

  const customerUsers = Array.isArray(userData?.customer_users)
    ? userData.customer_users
    : Array.isArray(userData?.customerUsers)
      ? userData.customerUsers
      : []

  return customerUsers
    .map((cu: any) => {
      const customerId = Number(cu?.customer_id || cu?.customer?.id)
      if (!customerId) return null
      const roleName = extractRoleName(cu?.role)
      const roleId = extractRoleId(cu?.role)
      const departments = Array.isArray(cu?.departments)
        ? cu.departments
            .map((d: any) => d?.name || d?.department?.name)
            .filter((name: unknown): name is string => typeof name === "string" && name.trim().length > 0)
        : []
      return {
        customerId,
        customerName:
          cu?.customer?.name ||
          customerNameById?.[String(customerId)] ||
          `Customer #${customerId}`,
        customerType: cu?.customer?.type || null,
        roleId,
        roleName,
        departments,
        isPrimary: Boolean(cu?.is_primary),
      } satisfies UserCustomerRoleLink
    })
    .filter(Boolean) as UserCustomerRoleLink[]
}

export function buildUserCustomerRoleDisplay(
  userData: any,
  options?: {
    selectedCustomerId?: number
    customerNameById?: Record<string, string>
  },
): UserCustomerRoleDisplay {
  const mapped = extractUserCustomerRoleLinks(userData, options?.customerNameById)
  const selectedCustomerId = options?.selectedCustomerId
  const scoped = selectedCustomerId
    ? mapped.filter((item) => item.customerId === selectedCustomerId)
    : mapped
  const source = scoped.length > 0 ? scoped : mapped

  const customerNames = Array.from(
    new Set(source.map((item) => item.customerName).filter((name) => name.trim().length > 0)),
  )
  const roleNames = Array.from(
    new Set(
      source
        .map((item) => item.roleName)
        .filter((name) => name.trim().length > 0)
        .map((name) => getRoleDisplayLabel(name)),
    ),
  )
  const departmentNames = Array.from(
    new Set(source.flatMap((item) => item.departments).filter((name) => name.trim().length > 0)),
  )

  const associationHoverLines = mapped.map((item) => {
    const roleLabel = item.roleName ? getRoleDisplayLabel(item.roleName) : "No role"
    return `${item.customerName} — ${roleLabel}`
  })

  return {
    customerNameDisplay: formatFirstPlusCount(customerNames),
    roleDisplay: formatFirstPlusCount(roleNames),
    customerNamesList: customerNames,
    roleNamesList: roleNames,
    departmentsList: departmentNames,
    customerRoles: mapped,
    associationHoverLines,
  }
}

/** Roles allowed for a customer type when linking/editing. */
export function rolesForCustomerType(customerType?: string | null): string[] {
  const type = (customerType || "").toLowerCase()
  if (type === "lab") return ["lab_admin", "lab_user"]
  if (type === "office") return ["office_admin", "office_user", "doctor", "doctor_admin"]
  return ["lab_admin", "lab_user", "office_admin", "office_user", "doctor", "doctor_admin"]
}

/**
 * Role picker options for create/update forms.
 * Omits `doctor_admin` — that composite is created via the “also Doctor/Admin” checkboxes.
 */
export function roleSelectOptionsForCustomerType(
  customerType?: string | null,
): Array<{ value: string; label: string }> {
  const type = (customerType || "").toLowerCase()
  const values =
    type === "lab"
      ? ["lab_admin", "lab_user"]
      : type === "office"
        ? ["office_admin", "office_user", "doctor"]
        : []

  return values.map((value) => ({
    value,
    label: getRoleDisplayLabel(value),
  }))
}
