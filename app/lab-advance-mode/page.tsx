"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LabAdvanceModePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to category as the default page
    router.replace("/lab-advance-mode/category")
  }, [router])

  return null
}
