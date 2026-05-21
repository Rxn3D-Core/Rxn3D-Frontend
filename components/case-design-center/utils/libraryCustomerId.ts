/**
 * customer_id for GET /v1/library/categories — must match NewCaseWizard logic:
 * office_admin → selected lab id; lab_admin / doctor / others → logged-in customerId.
 */
export function resolveLibraryCustomerId(
  completedLabId?: number | null
): number | undefined {
  if (typeof window === "undefined") return undefined;

  const role = localStorage.getItem("role");

  if (role === "office_admin") {
    if (completedLabId != null && Number.isFinite(completedLabId)) {
      return completedLabId;
    }
    const raw = localStorage.getItem("selectedLabId");
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  const raw = localStorage.getItem("customerId");
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}
