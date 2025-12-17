import { getAuthToken, clearAuthData } from './auth-storage'

export { getAuthToken }

export const redirectToLogin = () => {
  clearAuthData()
  // Also clear additional items that might be stored
  if (typeof window !== "undefined") {
    localStorage.removeItem("library_token")
    localStorage.removeItem("customerId")
    localStorage.removeItem("customerid")
    localStorage.removeItem("customerType")
    localStorage.removeItem("selectedLabId")
  }
  window.location.href = "/login"
}
