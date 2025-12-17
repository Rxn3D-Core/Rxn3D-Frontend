import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

const logoutUser = async (): Promise<void> => {
  const token = localStorage.getItem("token")

  if (token) {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    // Even if the logout request fails, we still want to clear local data
    // So we don't throw an error here
  }

  // Clear all localStorage data
  localStorage.removeItem("user")
  localStorage.removeItem("token")
  localStorage.removeItem("selectedLocation")
  localStorage.removeItem("customerId")
  localStorage.removeItem("customerType")
  localStorage.removeItem("library_token")
  localStorage.removeItem("role")
}

export function useLogoutMutation() {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      // Clear all React Query cache
      queryClient.clear()
      
      // Redirect to login
      router.replace("/login")

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
        variant: "default",
      })
    },
    onError: () => {
      // Even if logout fails, clear local data and redirect
      queryClient.clear()
      router.replace("/login")

      toast({
        title: "Logged Out",
        description: "You have been logged out.",
        variant: "default",
      })
    },
  })
}
