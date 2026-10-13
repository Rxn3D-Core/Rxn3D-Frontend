"use client"

import { Suspense } from "react"
import { usePathname } from "next/navigation"

const HIDDEN_ROUTES = ["/login", "/register"]
/** Shell layouts render AppFooter inside their own scroll pane; skip the root sibling. */
const SHELL_OWNED_FOOTER_ROUTES = ["/lab-case-management"]

function AppFooterInternal() {
  const pathname = usePathname()
  const isHidden = pathname
    ? HIDDEN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
    : false
  const shellOwnsFooter = pathname
    ? SHELL_OWNED_FOOTER_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
    : false

  // Root layout still mounts <AppFooter />; shell layouts mount their own copy.
  // Detect nested render via a data attribute set by the shell-owned instance.
  if (isHidden) {
    return null
  }

  return (
    <footer className="flex justify-center py-2 print:hidden">
      <p className="px-3 text-[10px] leading-4 text-gray-500">
        Powered by Rxn3D · © 2026 Rxn3D. All rights reserved.
      </p>
    </footer>
  )
}

export function AppFooter() {
  return (
    <Suspense fallback={null}>
      <AppFooterInternal />
    </Suspense>
  )
}
