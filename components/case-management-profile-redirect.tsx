"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  remapCaseManagementPathForProfile,
  type CaseManagementProfile,
} from "@/lib/case-management-routes"
import { getActiveCustomerType } from "@/lib/role-utils"

type CaseManagementProfileRedirectProps = {
  requiredProfile: CaseManagementProfile
}

/**
 * When the active header profile (localStorage customerType) does not match the
 * case-management section being viewed, send the user to the equivalent route
 * under their profile (e.g. office profile on /lab-case-management → /office-case-management).
 */
export function CaseManagementProfileRedirect({
  requiredProfile,
}: CaseManagementProfileRedirectProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirectedRef = useRef(false)

  useEffect(() => {
    redirectedRef.current = false
  }, [pathname])

  useEffect(() => {
    const customerType = getActiveCustomerType()
    if (customerType !== "lab" && customerType !== "office") return
    if (customerType === requiredProfile) return
    if (!pathname || redirectedRef.current) return

    const nextPath = remapCaseManagementPathForProfile(
      pathname,
      customerType as CaseManagementProfile
    )
    const query = searchParams?.toString()
    const href = query ? `${nextPath}?${query}` : nextPath

    redirectedRef.current = true
    router.replace(href)
  }, [pathname, requiredProfile, router, searchParams])

  return null
}
