"use client"

import { UserListTable } from "@/components/office-administrator/user-list-table"

export default function LabDriversPage() {
  return (
    <UserListTable
      roleFilter="lab_driver"
      title="Lab Drivers"
      description="Manage lab drivers for pickup and drop-off"
    />
  )
}
