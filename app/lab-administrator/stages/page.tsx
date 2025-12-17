import { ElegantStageManager } from "@/components/lab-administrator/elegant-stage-manager"

export default function StagesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Stage Management</h1>
        <p className="text-muted-foreground">
          Configure extractions, impressions, shades, and other stage details for your dental lab
        </p>
      </div>

      <ElegantStageManager />
    </div>
  )
}
