"use client"

import { useConnection } from "@/contexts/connection-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface ConnectedEntitiesListProps {
  type: "practices" | "labs"
  limit?: number
}

export function ConnectedEntitiesList({ type, limit = 5 }: ConnectedEntitiesListProps) {
  const { practices, labs, isLoading, error } = useConnection()

  const entities = type === "practices" ? practices : labs
  const title = type === "practices" ? "Connected Practices" : "Connected Labs"
  const displayEntities = limit ? entities.slice(0, limit) : entities

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Loading connected {type}...</CardDescription>
        </CardHeader>
        <CardContent>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 mb-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="text-red-500">Error loading {type}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Failed to load connected {type}. Please try again later.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Your connected {type}</CardDescription>
      </CardHeader>
      <CardContent>
        {displayEntities.length === 0 ? (
          <p className="text-muted-foreground">No connected {type} found.</p>
        ) : (
          <div className="space-y-4">
            {displayEntities.map((connection) => (
              <div key={connection.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={connection.partner.logo_url || ""} alt={connection.partner.name} />
                    <AvatarFallback>{connection.partner.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{connection.partner.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {connection.partner.city}, {connection.partner.state}
                    </p>
                  </div>
                </div>
                <Badge variant={connection.status.toLowerCase() === "active" ? "default" : "outline"}>
                  {connection.status}
                </Badge>
              </div>
            ))}

            {entities.length > limit && (
              <p className="text-sm text-muted-foreground text-center pt-2">
                +{entities.length - limit} more {type}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
