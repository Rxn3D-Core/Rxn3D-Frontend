import { Skeleton } from "@/components/ui/skeleton"

export default function RetentionLoading() {
  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-32" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-64" />
            </div>
          </div>
        </div>

        {/* Table Header */}
        <div className="bg-gray-50 border-b px-6 py-3">
          <div className="flex items-center gap-6">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>

        {/* Table Rows */}
        <div className="flex-1 bg-white">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-6 px-6 py-4 border-b">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
