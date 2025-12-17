import type React from "react"
import { AuthHeader } from "@/components/auth-header"

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AuthHeader />
      {children}
    </div>
  )
}
