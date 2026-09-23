import type React from "react"
import { AuthHeader } from "@/components/auth-header"
import { SiteCopyrightFooter } from "@/components/site-copyright-footer"

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AuthHeader />
      <div className="flex-1">{children}</div>
      <SiteCopyrightFooter />
    </div>
  )
}
