import { describe, expect, it, vi, beforeEach } from "vitest"
import { filterGroupedForActiveContext } from "./permissions"

vi.mock("@/lib/role-utils", () => ({
  isLabCustomerContext: vi.fn(() => false),
  isOfficeCustomerContext: vi.fn(() => false),
  getActiveCustomerType: vi.fn(() => null),
}))

import { isLabCustomerContext, isOfficeCustomerContext } from "@/lib/role-utils"

describe("filterGroupedForActiveContext", () => {
  const grouped = {
    Cases: ["submit_new_case", "edit_slip"],
    Lab: ["manage_lab", "view_lab"],
  }
  const labBundle = ["manage_lab", "view_lab"]

  beforeEach(() => {
    vi.mocked(isLabCustomerContext).mockReturnValue(false)
    vi.mocked(isOfficeCustomerContext).mockReturnValue(false)
  })

  it("returns full catalog for superadmin", () => {
    expect(filterGroupedForActiveContext(grouped, labBundle, true)).toEqual(grouped)
  })

  it("filters to lab bundle in lab context", () => {
    vi.mocked(isLabCustomerContext).mockReturnValue(true)
    expect(filterGroupedForActiveContext(grouped, labBundle, false)).toEqual({
      Lab: ["manage_lab", "view_lab"],
    })
  })

  it("excludes lab-only permissions in office context when no office bundle", () => {
    vi.mocked(isOfficeCustomerContext).mockReturnValue(true)
    expect(filterGroupedForActiveContext(grouped, labBundle, false)).toEqual({
      Cases: ["submit_new_case", "edit_slip"],
    })
  })

  it("uses office_role_bundle when provided", () => {
    vi.mocked(isOfficeCustomerContext).mockReturnValue(true)
    const officeBundle = ["submit_new_case"]
    expect(
      filterGroupedForActiveContext(grouped, labBundle, false, officeBundle),
    ).toEqual({
      Cases: ["submit_new_case"],
    })
  })
})
