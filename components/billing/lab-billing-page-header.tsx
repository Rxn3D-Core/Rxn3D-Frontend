"use client"

import { Breadcrumb } from "@/components/breadcrumb"

/**
 * Standard page title + breadcrumb row for Lab Admin billing routes
 * (matches dashboard shell: “Lab Admin” + Home > … trail).
 */
export function LabBillingPageHeader() {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <h1 className="text-2xl font-bold text-gray-900 shrink-0">Lab Admin</h1>
      <div className="sm:pt-0.5 sm:text-right sm:max-w-[min(100%,42rem)]">
        <Breadcrumb />
      </div>
    </div>
  )
}
