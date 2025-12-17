"use client"

import { ConnectedEntitiesList } from "./connected-entities-list"
import { useConnection } from "@/contexts/connection-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ConnectedEntities() {
  const { totalConnections, isLoading } = useConnection()

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Connected Entities</CardTitle>
        <CardDescription>
          {isLoading ? "Loading connections..." : `You have ${totalConnections} total connections`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="practices">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="practices">Practices</TabsTrigger>
            <TabsTrigger value="labs">Labs</TabsTrigger>
          </TabsList>
          <TabsContent value="practices" className="mt-4">
            <ConnectedEntitiesList type="practices" />
          </TabsContent>
          <TabsContent value="labs" className="mt-4">
            <ConnectedEntitiesList type="labs" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
