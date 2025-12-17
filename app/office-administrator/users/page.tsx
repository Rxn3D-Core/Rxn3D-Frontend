"use client"

import { UserListTable } from "@/components/office-administrator/user-list-table"

export default function UsersPage() {
  return (
    <UserListTable
      roleFilter="other"
      title="Other Users"
      description="Manage other users and staff members in your office"
    />
  )
}
