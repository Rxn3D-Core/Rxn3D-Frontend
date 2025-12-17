import { redirect } from "next/navigation"

export default function AnalyticsPage() {
  // Redirect to the dashboard page which now contains all analytics
  redirect("/dashboard")
}
