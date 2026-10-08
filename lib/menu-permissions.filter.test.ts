import { describe, expect, it } from "vitest"
import { filterMenuByEntitlements } from "./menu-permissions"
import type { MenuItem } from "@/config/sidebar-menu"

describe("filterMenuByEntitlements", () => {
  const menu: MenuItem[] = [
    { id: "subscriptions", title: "Subscriptions", path: "/billing/subscriptions" },
    {
      id: "charge-management",
      title: "Charge Management",
      path: "/billing/charge-management",
      planFeature: "billing.charge_management",
    },
    {
      id: "generate-statements",
      title: "Generate Statements",
      path: "/billing/generate-statements",
      planFeature: "billing.statements",
    },
  ]

  it("omits charge-management on Freemium", () => {
    const filtered = filterMenuByEntitlements(menu, {
      "billing.charge_management": { key: "billing.charge_management", value: false },
      "billing.statements": { key: "billing.statements", value: false },
    })

    expect(filtered.map((item) => item.id)).toEqual(["subscriptions"])
  })

  it("keeps paid billing menus when features are true", () => {
    const filtered = filterMenuByEntitlements(menu, {
      "billing.charge_management": { key: "billing.charge_management", value: true },
      "billing.statements": { key: "billing.statements", value: true },
    })

    expect(filtered.map((item) => item.id)).toEqual([
      "subscriptions",
      "charge-management",
      "generate-statements",
    ])
  })
})
