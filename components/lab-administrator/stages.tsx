"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { TeethChart } from "./teeth-chart"

export function Stages() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Stage Management</h2>
      </div>

      <Tabs defaultValue="extractions">
        <TabsList>
          <TabsTrigger value="extractions">Extractions</TabsTrigger>
          <TabsTrigger value="impressions">Impressions</TabsTrigger>
          <TabsTrigger value="tooth-shades">Tooth Shades</TabsTrigger>
          <TabsTrigger value="gum-shades">Gum Shades</TabsTrigger>
          <TabsTrigger value="stage-notes">Stage Notes</TabsTrigger>
          <TabsTrigger value="rush-dates">Rush Dates</TabsTrigger>
        </TabsList>

        <TabsContent value="extractions" className="mt-6">
          <div className="flex justify-between mb-4">
            <Button variant="outline">Manage Default Extractions</Button>
            <Button>Add New extraction</Button>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <TeethChart type="upper" />
            <TeethChart type="lower" />
          </div>
        </TabsContent>

        {/* Add other TabsContent components for remaining tabs */}
      </Tabs>
    </div>
  )
}
