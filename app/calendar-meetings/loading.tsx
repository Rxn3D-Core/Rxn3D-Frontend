import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container mx-auto py-6">
      <Skeleton className="h-8 w-64 mb-6" />
      <div className="grid gap-6">
        <Skeleton className="h-[600px] w-full" />
      </div>
    </div>
  )
}
