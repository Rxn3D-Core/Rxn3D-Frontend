export interface TwoFactorAuthState {
  isEnabled: boolean
  secret?: string
  qrCodeUrl?: string
  backupCodes?: string[]
  verificationStatus: "idle" | "pending" | "success" | "error"
  setupStatus: "idle" | "generating" | "awaiting_verification" | "complete"
  error?: string
}

export interface VerifyTwoFactorRequest {
  token: string
  secret: string
}

export interface VerifyTwoFactorResponse {
  success: boolean
  backupCodes?: string[]
  message?: string
}

export interface GenerateTwoFactorResponse {
  secret: string
  qrCodeUrl: string
}

export interface DisableTwoFactorResponse {
  success: boolean
  message: string
}
