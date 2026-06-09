/**
 * Synchronous access to the logged-in user stored in localStorage under "user".
 * Used for the driver drop-off flow, where the current user's name is captured
 * automatically as the signature (no manual signature entry).
 */

export type StoredCurrentUser = {
  id?: number;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
};

export function getCurrentUser(): StoredCurrentUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCurrentUser;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Full display name of the logged-in user, e.g. "Jane Doe". Empty string if unknown. */
export function getCurrentUserName(): string {
  const user = getCurrentUser();
  if (!user) return "";
  const full = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  if (full) return full;
  if (typeof user.name === "string" && user.name.trim()) return user.name.trim();
  return "";
}
