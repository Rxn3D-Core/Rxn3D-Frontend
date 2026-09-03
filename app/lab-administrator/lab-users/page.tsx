"use client"

import { UserListTable } from "@/components/office-administrator/user-list-table"

export default function LabUsersPage() {
  return (
    <UserListTable
      roleFilter="lab_user"
      title="Lab Users"
      description="Manage lab users and staff members"
    />
  )
}
