export const LAB_CASE_MANAGEMENT_PREFIX = "/lab-case-management"
export const OFFICE_CASE_MANAGEMENT_PREFIX = "/office-case-management"

export type CaseManagementProfile = "lab" | "office"

export function getCaseManagementBasePath(profile: CaseManagementProfile): string {
  return profile === "lab"
    ? LAB_CASE_MANAGEMENT_PREFIX
    : OFFICE_CASE_MANAGEMENT_PREFIX
}

/** Map a lab/office case-management path to the equivalent path for the target profile. */
export function remapCaseManagementPathForProfile(
  pathname: string,
  targetProfile: CaseManagementProfile
): string {
  const targetBase = getCaseManagementBasePath(targetProfile)
  const sourceBase =
    targetProfile === "lab"
      ? OFFICE_CASE_MANAGEMENT_PREFIX
      : LAB_CASE_MANAGEMENT_PREFIX

  if (pathname === sourceBase || pathname.startsWith(`${sourceBase}/`)) {
    return pathname.replace(sourceBase, targetBase)
  }

  return targetBase
}
