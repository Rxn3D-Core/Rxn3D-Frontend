"use client"

import { UserListTable } from "@/components/office-administrator/user-list-table"

export default function DoctorsPage() {
  return (
    <UserListTable
      roleFilter="doctor"
      title="Doctors"
      description="Manage doctors and their information in your office"
    />
  )
}
