"use client"

import { RegistrationProvider } from "@/contexts/registration-context"

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <RegistrationProvider>{children}</RegistrationProvider>
}
