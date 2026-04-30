import { redirect } from "next/navigation"

/** Canonical entry: business hours (lab + office). Do not import sibling `page.tsx` modules as components. */
export default function OnboardingIndexPage() {
  redirect("/onboarding/business-hours")
}
