import { Skeleton } from "@/components/ui/skeleton"

export function CaseTrackingSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left w-12">
              <Skeleton className="h-4 w-4" />
            </th>
            <th className="px-4 py-3 text-left">
              <Skeleton className="h-4 w-32" />
            </th>
            <th className="px-4 py-3 text-left">
              <Skeleton className="h-4 w-24" />
            </th>
            <th className="px-4 py-3 text-left">
              <Skeleton className="h-4 w-20" />
            </th>
            <th className="px-4 py-3 text-left">
              <Skeleton className="h-4 w-16" />
            </th>
            <th className="px-4 py-3 text-left">
              <Skeleton className="h-4 w-40" />
            </th>
            <th className="px-4 py-3 text-left">
              <Skeleton className="h-4 w-32" />
            </th>
            <th className="px-4 py-3 text-left">
              <Skeleton className="h-4 w-24" />
            </th>
            <th className="px-4 py-3 text-left">
              <Skeleton className="h-4 w-24" />
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 10 }).map((_, index) => (
            <tr key={index} className={`border-b ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-4" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-5 w-32" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-6 w-20" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-12" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-8 w-12 rounded" />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-6 w-6 rounded" />
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-2 w-24 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-10 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}





















