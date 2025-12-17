import { cn } from "@/lib/utils"

interface LoadingSkeletonProps {
  className?: string
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200",
        className
      )}
    />
  )
}

export function TableRowSkeleton() {
  return (
    <tr className="border-b border-gray-100">
      <td className="pl-6 py-4">
        <LoadingSkeleton className="h-4 w-4" />
      </td>
      <td className="py-4">
        <div className="flex items-center gap-2">
          <LoadingSkeleton className="h-5 w-5 rounded-md" />
          <LoadingSkeleton className="h-4 w-20" />
        </div>
      </td>
      <td className="py-4">
        <div className="flex flex-col gap-1">
          <LoadingSkeleton className="h-4 w-32" />
          <div className="flex items-center gap-1">
            <LoadingSkeleton className="h-3 w-16" />
            <LoadingSkeleton className="h-3 w-2" />
            <LoadingSkeleton className="h-3 w-20" />
          </div>
        </div>
      </td>
      <td className="py-4">
        <LoadingSkeleton className="h-4 w-24" />
      </td>
      <td className="py-4">
        <LoadingSkeleton className="h-4 w-16" />
      </td>
      <td className="py-4">
        <LoadingSkeleton className="h-4 w-12" />
      </td>
      <td className="py-4">
        <LoadingSkeleton className="h-4 w-16" />
      </td>
      <td className="py-4 text-center">
        <div className="flex items-center justify-center gap-1">
          <LoadingSkeleton className="h-8 w-8" />
          <LoadingSkeleton className="h-8 w-8" />
          <LoadingSkeleton className="h-8 w-8" />
        </div>
      </td>
    </tr>
  )
}
