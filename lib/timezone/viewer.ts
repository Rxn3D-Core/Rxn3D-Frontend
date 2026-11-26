import { DEFAULT_TIME_ZONE, resolveViewerTimeZone } from "./index"

/**
 * The viewer's zone outside React (RXN-123): the selected profile in the session copy that the
 * auth context keeps in localStorage. America/Los_Angeles on the server, in tests and on errors.
 * Components should prefer `useViewerTimeZone()`; this is for plain formatting helpers.
 */
export function readViewerTimeZone(): string {
  if (typeof window === "undefined") return DEFAULT_TIME_ZONE
  try {
    const raw = window.localStorage.getItem("user")
    const user = raw ? JSON.parse(raw) : null
    return resolveViewerTimeZone(user, window.localStorage.getItem("customerId"))
  } catch {
    return DEFAULT_TIME_ZONE
  }
}
