import { getAuthToken, clearAuthData } from './auth-storage'
import { clearSessionStorage } from './clear-session-storage'

export { getAuthToken }

export const redirectToLogin = () => {
  clearSessionStorage()
  window.location.href = "/login"
}
