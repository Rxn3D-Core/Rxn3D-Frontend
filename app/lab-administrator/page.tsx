"use client"

import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Products } from "@/components/lab-administrator/products"
import { Stages } from "@/components/lab-administrator/stages"
import { CategoryAddons } from "@/components/lab-administrator/category-addons"
import { Addons } from "@/components/lab-administrator/addons"
import { HistoryLog } from "@/components/lab-administrator/history-log"

export default function LabAdministrator() {
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab") || "products"

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Lab Administrator</h1>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="stages">Stages</TabsTrigger>
          <TabsTrigger value="category-addons">Categories Add ons</TabsTrigger>
          <TabsTrigger value="addons">Add ons</TabsTrigger>
          <TabsTrigger value="history-log">History Log</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Products />
        </TabsContent>

        <TabsContent value="stages">
          <Stages />
        </TabsContent>

        <TabsContent value="category-addons">
          <CategoryAddons />
        </TabsContent>

        <TabsContent value="addons">
          <Addons />
        </TabsContent>

        <TabsContent value="history-log">
          <HistoryLog />
        </TabsContent>
      </Tabs>
    </div>
  )
}
