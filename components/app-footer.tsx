"use client"

import { Suspense } from "react"
import { usePathname } from "next/navigation"

const HIDDEN_ROUTES = ["/login", "/register"]
/** Shell layouts render AppFooter inside their scroll pane; skip the root sibling there. */
const SHELL_OWNED_FOOTER_ROUTES = ["/lab-case-management"]

function AppFooterInternal({ inline = false }: { inline?: boolean }) {
  const pathname = usePathname()
  const isHidden = pathname
    ? HIDDEN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
    : false
  const shellOwnsFooter = pathname
    ? SHELL_OWNED_FOOTER_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
    : false

  // Root layout mounts AppFooter; shell layouts mount <AppFooter inline />.
  if (isHidden || (!inline && shellOwnsFooter)) {
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

export function AppFooter({ inline = false }: { inline?: boolean } = {}) {
  return (
    <Suspense fallback={null}>
      <AppFooterInternal inline={inline} />
    </Suspense>
  )
}
