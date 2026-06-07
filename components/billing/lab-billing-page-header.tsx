"use client"

import { Breadcrumb } from "@/components/breadcrumb"

/**
 * Standard page title + breadcrumb row for Lab Admin billing routes
 * (matches dashboard shell: “Lab Admin” + Home > … trail).
 */
export function LabBillingPageHeader() {
  return (
    <div className="mb-8 flex flex-col gap-2">
      <h1 className="text-2xl font-bold text-gray-900">Lab Admin</h1>
      <Breadcrumb />
    </div>
  )
}
