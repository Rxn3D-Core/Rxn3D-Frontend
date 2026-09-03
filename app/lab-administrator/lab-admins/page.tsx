"use client"

import { UserListTable } from "@/components/office-administrator/user-list-table"

export default function LabAdminsPage() {
  return (
    <UserListTable
      roleFilter="lab_admin"
      title="Lab Administrators"
      description="Manage lab administrators and their permissions"
    />
  )
}
