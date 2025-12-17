import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="bg-white border border-[#d9d9d9] rounded-lg">
      <div className="p-4 flex justify-between items-center border-b border-[#d9d9d9]">
        <Skeleton className="h-6 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="flex">
        <div className="flex-grow border-r border-[#d9d9d9]">
          <div className="p-4">
            <div className="flex items-center py-3 border-b">
              <Skeleton className="h-5 w-5 mr-4" />
              <Skeleton className="h-5 w-24 mr-8" />
            </div>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center py-4 border-b">
                <Skeleton className="h-5 w-5 mr-4" />
                <Skeleton className="h-5 w-24 mr-8" />
              </div>
            ))}
          </div>
        </div>

        <div className="w-1/3 min-w-[300px]">
          <div className="p-4">
            <div className="flex items-center py-3 border-b">
              <Skeleton className="h-5 w-5 mr-4" />
              <Skeleton className="h-5 w-32" />
            </div>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center py-4 border-b">
                <Skeleton className="h-5 w-5 mr-4" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
