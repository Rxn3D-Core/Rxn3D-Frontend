"use client"

import { useAuth } from "@/contexts/auth-context"
import { useIdleSessionTimeout } from "@/hooks/use-idle-session-timeout"

/** Mount inside authenticated layouts to enforce idle sign-out. */
export function IdleSessionWatcher() {
  const { user } = useAuth()
  useIdleSessionTimeout(Boolean(user))
  return null
}
