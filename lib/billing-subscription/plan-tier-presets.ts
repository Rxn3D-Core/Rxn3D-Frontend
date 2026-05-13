/**
 * Preset copy aligned with RXN3D Pricing & Membership Framework (marketing cards).
 * Replace with API-driven data when subscription endpoints are available.
 */

export type PlanTierId = "freemium" | "starter" | "professional" | "enterprise"

export interface PlanTierCardModel {
  id: PlanTierId
  name: string
  badge: string
  badgeVariant: "muted" | "success" | "primary" | "premium"
  monthlyLabel: string
  lines: string[]
  activeLabsLabel: string
  highlighted?: boolean
}

export const PLAN_TIER_PRESETS: PlanTierCardModel[] = [
  {
    id: "freemium",
    name: "Freemium",
    badge: "Acquisition",
    badgeVariant: "muted",
    monthlyLabel: "$0.00/mo",
    lines: [
      "Included slips: 20 (one-time)",
      "Included storage: 15 GB",
      "Max user seats: 1",
      "Priority support: Not included",
      "Custom branding: Not included",
    ],
    activeLabsLabel: "— active labs (API)",
  },
  {
    id: "starter",
    name: "Starter",
    badge: "Growth",
    badgeVariant: "success",
    monthlyLabel: "$97.00/mo",
    lines: [
      "Included slips: 300 / month",
      "Standard overage: $0.50 / slip",
      "Included storage: 200 GB",
      "Max user seats: 1 admin",
      "Driver module: Included",
    ],
    activeLabsLabel: "— active labs (API)",
  },
  {
    id: "professional",
    name: "Professional",
    badge: "Most popular",
    badgeVariant: "primary",
    monthlyLabel: "$297.00/mo",
    highlighted: true,
    lines: [
      "Included slips: 500 / month",
      "Standard overage: $0.50 / slip",
      "Included storage: 500 GB",
      "Max user seats: 1 admin",
      "Driver module: Included",
    ],
    activeLabsLabel: "— active labs (API)",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    badge: "Premium",
    badgeVariant: "premium",
    monthlyLabel: "Custom pricing",
    lines: [
      "Included slips: Unlimited",
      "Overage: Custom",
      "Included storage: 2 TB+",
      "User seats: Unlimited",
      "White-label / APIs: Per contract",
    ],
    activeLabsLabel: "— active labs (API)",
  },
]
