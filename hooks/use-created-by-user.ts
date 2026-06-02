import { useEffect, useState } from "react"
import { fetchCurrentUserProfile } from "@/services/user-profile-service"
import { getUserProfileImageUrl } from "@/utils/avatar-utils"

type CreatedByUserFields = {
  first_name?: string
  last_name?: string
  image?: string | null
  avatar?: string | null
}

function applyCreatedByUser(
  user: CreatedByUserFields,
  setName: (name: string) => void,
  setImageUrl: (url: string) => void,
) {
  setName(`${user.first_name || ""} ${user.last_name || ""}`.trim())
  const url = getUserProfileImageUrl(user)
  if (url) setImageUrl(url)
}

/**
 * Loads the logged-in user's display name and profile photo for "Created By" UI.
 * Reads localStorage first, then refreshes from GET /me so avatar uploads are visible.
 */
export function useCreatedByUser(enabled = true) {
  const [createdByName, setCreatedByName] = useState("")
  const [createdByImageUrl, setCreatedByImageUrl] = useState("")

  useEffect(() => {
    if (!enabled) return

    try {
      const userStr = localStorage.getItem("user")
      if (userStr) {
        applyCreatedByUser(JSON.parse(userStr), setCreatedByName, setCreatedByImageUrl)
      }
    } catch {
      // ignore malformed localStorage
    }

    let cancelled = false
    fetchCurrentUserProfile()
      .then((profile) => {
        if (!cancelled) {
          applyCreatedByUser(profile, setCreatedByName, setCreatedByImageUrl)
        }
      })
      .catch(() => {
        // keep localStorage values on failure
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  return { createdByName, createdByImageUrl }
}
