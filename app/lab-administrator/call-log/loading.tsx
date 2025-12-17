import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CallLogLoading() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          <Skeleton className="h-8 w-48" />
        </CardTitle>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="rounded-md border">
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
