"use client"

import { Grades } from "@/components/lab-administrator/grades"

export default function GradesPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Lab Administrator</h1>
      <Grades />
    </div>
  )
}
