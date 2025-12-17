import { useMutation } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

interface ForgotPasswordRequest {
  email: string
}

interface ResetPasswordRequest {
  token: string
  password: string
  password_confirmation: string
  email: string
}

interface SetupAccountRequest {
  token: string
  password: string
  password_confirmation: string
  email: string
  verification_token: string
}

// Forgot Password
const forgotPassword = async (data: ForgotPasswordRequest): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const result = await response.json()
    throw new Error(result.error_description || result.message || "Failed to send password reset email")
  }
}

export function useForgotPasswordMutation() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: forgotPassword,
    onSuccess: () => {
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your email for password reset instructions.",
        variant: "default",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })
}

// Reset Password
const resetPassword = async (data: ResetPasswordRequest): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok || result.success === false) {
    const errorPayload = {
      message: result?.error_description || result?.message || "Reset password failed",
      errors: result?.errors || null,
      status: result?.status_code || response.status,
    }
    throw errorPayload
  }
}

export function useResetPasswordMutation() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      toast({
        title: "Password Reset Successful",
        description: "Your password has been reset successfully. You can now log in with your new password.",
        variant: "default",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Password Reset Failed",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      })
    },
  })
}

// Setup Account
const setupAccount = async (data: SetupAccountRequest): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/registration/setup-account`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok || result.success === false) {
    const errorPayload = {
      message: result?.error || "Setup Account failed",
      errors: result?.errors || null,
      status: result?.status_code || response.status,
    }
    throw errorPayload
  }
}

export function useSetupAccountMutation() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: setupAccount,
    onSuccess: () => {
      toast({
        title: "Account Setup Successful",
        description: "Your account has been set up successfully. You can now log in.",
        variant: "default",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Account Setup Failed",
        description: error.message || "Failed to setup account",
        variant: "destructive",
      })
    },
  })
}
