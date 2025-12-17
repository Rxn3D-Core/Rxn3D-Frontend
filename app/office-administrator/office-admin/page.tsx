"use client"

import { UserListTable } from "@/components/office-administrator/user-list-table"

export default function OfficeAdminPage() {
  return (
    <UserListTable
      roleFilter="office_admin"
      title="Office Administrators"
      description="Manage office administrators and their permissions"
    />
  )
}
