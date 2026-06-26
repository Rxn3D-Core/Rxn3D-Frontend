import { getActiveCustomerId } from "@/lib/customer-scope"
import { isOfficeCustomerContext } from "@/lib/role-utils"

/** Lab id for slip/product APIs: office profiles use selected lab; lab profiles use active customer. */
export function getSlipLabIdForCurrentProfile(): string | null {
  if (typeof window === "undefined") return null
  if (isOfficeCustomerContext()) {
    return localStorage.getItem("selectedLabId")
  }
  return getActiveCustomerId()
}
