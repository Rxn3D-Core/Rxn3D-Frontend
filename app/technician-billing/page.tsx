import { ReduxProvider } from "@/components/redux-provider"
import { TechnicianBillingTable } from "@/components/technician-billing/technician-billing-table"

export default function TechnicianBillingPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Technician Billing</h1>
      <ReduxProvider>
        <TechnicianBillingTable />
      </ReduxProvider>
    </div>
  )
}
