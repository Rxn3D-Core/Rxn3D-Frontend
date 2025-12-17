import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-8 w-64" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-4">
        {/* Left side - Gum Shades */}
        <div className="bg-white rounded-md shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1"></div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-60" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Right side - Grade Groups */}
        <div className="bg-white rounded-md shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1"></div>
            <Skeleton className="h-10 w-32" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
