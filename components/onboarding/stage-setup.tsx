"use client"

import { ElegantStageManager } from "@/components/lab-administrator/elegant-stage-manager"

export function StageSetup() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Stage Setup</h2>
        <p className="text-muted-foreground">Configure the stage settings for your dental lab</p>
      </div>

      <ElegantStageManager />
    </div>
  )
}
