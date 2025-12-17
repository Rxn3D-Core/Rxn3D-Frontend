"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function GlobalAdvanceModePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to category as the default page
    router.replace("/global-advance-mode/category")
  }, [router])

  return null
}
