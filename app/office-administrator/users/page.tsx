"use client"

import { UserListTable } from "@/components/office-administrator/user-list-table"

export default function UsersPage() {
  return (
    <UserListTable
      roleFilter="office_user"
      title="Office Users"
      description="Manage office users and staff members in your office"
    />
  )
}
