"use client"

import { Departments } from "@/components/lab-administrator/departments"

export default function DepartmentsPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Lab Administrator</h1>
      <Departments />
    </div>
  )
}
