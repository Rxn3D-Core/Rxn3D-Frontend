"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { resetTwoFactorState } from "@/lib/redux/features/twoFactorSlice"
import {
  useGetTwoFactorStatusQuery,
  useGenerateTwoFactorMutation,
  useVerifyTwoFactorMutation,
  useDisableTwoFactorMutation,
  useRegenerateBackupCodesMutation,
} from "@/lib/redux/api/twoFactorApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertCircle,
  CheckCircle,
  Copy,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Key,
  Loader2,
  ArrowRight,
  LockKeyhole,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "react-i18next"

export function TwoFactorAuth() {
  const { t } = useTranslation()
  // Use try-catch to handle potential Redux errors
  const dispatch = useAppDispatch()

  // Use try-catch for RTK Query hooks
  let statusData,
    isStatusLoading,
    generateTwoFactor,
    isGenerating,
    verifyTwoFactor,
    isVerifying,
    disableTwoFactor,
    isDisabling,
    regenerateBackupCodes,
    isRegenerating

  // Fetch status unconditionally to prevent hook order changes
  const statusResult = useGetTwoFactorStatusQuery()
  statusData = statusResult.data
  isStatusLoading = statusResult.isLoading

  // Initialize all mutations unconditionally
  const generateResult = useGenerateTwoFactorMutation()
  generateTwoFactor = generateResult[0]
  isGenerating = generateResult[1].isLoading

  try {
    const verifyResult = useVerifyTwoFactorMutation()
    verifyTwoFactor = verifyResult[0]
    isVerifying = verifyResult[1].isLoading

    const disableResult = useDisableTwoFactorMutation()
    disableTwoFactor = disableResult[0]
    isDisabling = disableResult[1].isLoading

    const regenerateResult = useRegenerateBackupCodesMutation()
    regenerateBackupCodes = regenerateResult[0]
    isRegenerating = regenerateResult[1].isLoading
  } catch (error) {
    console.error("Failed to initialize RTK Query hooks:", error)
  }

  // Default state in case Redux fails
  const defaultTwoFactorState = {
    isEnabled: false,
    verificationStatus: "idle" as const,
    setupStatus: "idle" as const,
  }

  // Use try-catch for useAppSelector
  let twoFactorState = defaultTwoFactorState
  try {
    const state = useAppSelector((state) => state.twoFactor)
    if (state) {
      twoFactorState = state
    }
  } catch (error) {
    console.error("Failed to get twoFactorState:", error)
  }

  const [verificationCode, setVerificationCode] = useState("")
  const [disableCode, setDisableCode] = useState("")
  const [activeTab, setActiveTab] = useState("setup")
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [setupStep, setSetupStep] = useState(1)
  const [codeInputFocused, setCodeInputFocused] = useState(false)

  // Reset setup step when setup status changes
  useEffect(() => {
    if (twoFactorState?.setupStatus === "idle") {
      setSetupStep(1)
    } else if (twoFactorState?.setupStatus === "awaiting_verification") {
      setSetupStep(2)
    }
  }, [twoFactorState?.setupStatus])

  const handleGenerateSetup = async () => {
    if (!generateTwoFactor) return

    try {
      await generateTwoFactor().unwrap()
    } catch (error) {
      console.error("Failed to generate 2FA setup:", error)
    }
  }

  const handleVerifySetup = async () => {
    if (!verificationCode || !twoFactorState?.secret || !verifyTwoFactor) return

    try {
      await verifyTwoFactor({
        token: verificationCode,
        secret: twoFactorState.secret,
      }).unwrap()
      setActiveTab("backup-codes")
      setSetupStep(3)
    } catch (error) {
      console.error("Failed to verify 2FA setup:", error)
    }
  }

  const handleDisable2FA = async () => {
    if (!disableCode || !disableTwoFactor) return

    try {
      await disableTwoFactor({ token: disableCode }).unwrap()
      setDisableCode("")
      dispatch(resetTwoFactorState())
    } catch (error) {
      console.error("Failed to disable 2FA:", error)
    }
  }

  const handleRegenerateBackupCodes = async () => {
    if (!verificationCode || !regenerateBackupCodes) return

    try {
      await regenerateBackupCodes({ token: verificationCode }).unwrap()
      setVerificationCode("")
    } catch (error) {
      console.error("Failed to regenerate backup codes:", error)
    }
  }

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const copyAllBackupCodes = () => {
    if (!twoFactorState?.backupCodes) return

    const allCodes = twoFactorState.backupCodes.join("\n")
    navigator.clipboard.writeText(allCodes)
    setCopiedIndex(-1) // Use -1 to indicate all codes were copied
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  // Add mock data for preview purposes
  const mockStatusData = { isEnabled: false }

  if (isStatusLoading) {
    return (
      <Card className="w-full border-indigo-100">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-500" />
            <CardTitle>Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </CardContent>
      </Card>
    )
  }

  // Use statusData if available, otherwise use mock data
  const isEnabled = (statusData || mockStatusData)?.isEnabled || twoFactorState?.isEnabled || false

  return (
    <Card className="w-full border-indigo-100 shadow-sm">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEnabled ? (
              <ShieldCheck className="h-5 w-5 text-green-500" />
            ) : (
              <Shield className="h-5 w-5 text-indigo-500" />
            )}
            <CardTitle>{t("twoFactorAuth.title")}</CardTitle>
          </div>
          {isEnabled && (
            <Badge variant="default" className="bg-green-500">
              {t("twoFactorAuth.enabled")}
            </Badge>
          )}
        </div>
        <CardDescription className="mt-1">{t("twoFactorAuth.description")}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {isEnabled ? (
          <div className="space-y-6">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>{t("twoFactorAuth.isEnabled")}</AlertTitle>
              <AlertDescription>{t("twoFactorAuth.accountProtected")}</AlertDescription>
            </Alert>

            <div className="space-y-4 bg-gray-50 p-5 rounded-lg border">
              <div className="flex items-start gap-3">
                <div className="mt-1 bg-red-100 p-2 rounded-full">
                  <LockKeyhole className="h-5 w-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-medium">{t("twoFactorAuth.disable")}</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-3">{t("twoFactorAuth.disableDescription")}</p>
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative">
                      <Input
                        value={disableCode}
                        onChange={(e) => setDisableCode(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="000000"
                        maxLength={6}
                        className={`w-32 text-center font-mono text-lg ${disableCode.length === 6 ? "border-green-500" : ""}`}
                        onFocus={() => setCodeInputFocused(true)}
                        onBlur={() => setCodeInputFocused(false)}
                      />
                      {disableCode.length === 6 && (
                        <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <Button
                      onClick={handleDisable2FA}
                      disabled={disableCode.length !== 6 || isDisabling}
                      variant="destructive"
                      className="min-w-[120px]"
                    >
                      {isDisabling ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("twoFactorAuth.disabling")}
                        </>
                      ) : (
                        t("twoFactorAuth.disableButton")
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {twoFactorState?.backupCodes && twoFactorState.backupCodes.length > 0 && (
              <div className="space-y-4 bg-gray-50 p-5 rounded-lg border">
                <div className="flex items-start gap-3">
                  <div className="mt-1 bg-amber-100 p-2 rounded-full">
                    <Key className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-medium">Backup Codes</h3>
                      <Button variant="outline" size="sm" onClick={copyAllBackupCodes} className="h-8">
                        {copiedIndex === -1 ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
                            Copied All
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-3 w-3" />
                            Copy All
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 mb-3">
                      Save these backup codes in a secure place. Each code can only be used once.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {twoFactorState.backupCodes.map((code, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                          <code className="text-sm font-mono">{code}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(code, index)}
                            className="h-7 w-7 p-0"
                          >
                            {copiedIndex === index ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3 items-center mt-4">
                      <div className="relative">
                        <Input
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="000000"
                          maxLength={6}
                          className={`w-32 text-center font-mono text-lg ${verificationCode.length === 6 ? "border-green-500" : ""}`}
                        />
                        {verificationCode.length === 6 && (
                          <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <Button
                        onClick={handleRegenerateBackupCodes}
                        disabled={verificationCode.length !== 6 || isRegenerating}
                        variant="outline"
                        className="min-w-[180px]"
                      >
                        {isRegenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          "Generate New Codes"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger
                value="setup"
                className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"
              >
                {t("twoFactorAuth.setup")}
              </TabsTrigger>
              <TabsTrigger
                value="backup-codes"
                disabled={!twoFactorState?.backupCodes}
                className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"
              >
                {t("twoFactorAuth.backupCodes")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-6 mt-2">
              {twoFactorState?.setupStatus === "idle" ? (
                <div className="space-y-6">
                  <Alert className="bg-indigo-50 border-indigo-200">
                    <ShieldAlert className="h-4 w-4 text-indigo-500" />
                    <AlertTitle>Protect your account</AlertTitle>
                    <AlertDescription>
                      Two-factor authentication adds an extra layer of security to your account. Once enabled, you'll
                      need to enter a code from your authenticator app when signing in.
                    </AlertDescription>
                  </Alert>

                  <div className="bg-gray-50 p-5 rounded-lg border">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 bg-indigo-100 p-2 rounded-full">
                        <Smartphone className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div>
                        <h3 className="text-base font-medium">Set up authenticator app</h3>
                        <p className="text-sm text-gray-500 mt-1 mb-4">
                          Use an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy to
                          generate time-based codes.
                        </p>
                        <Button
                          onClick={handleGenerateSetup}
                          disabled={isGenerating || !generateTwoFactor}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Setting up...
                            </>
                          ) : (
                            "Begin Setup"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : twoFactorState?.setupStatus === "generating" ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mb-4" />
                  <p className="text-lg font-medium">Generating your 2FA setup...</p>
                  <p className="text-sm text-gray-500 mt-2">This will only take a moment</p>
                </div>
              ) : twoFactorState?.setupStatus === "awaiting_verification" && twoFactorState?.qrCodeUrl ? (
                <div className="space-y-8">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <div className="flex items-center space-x-2 bg-white px-3">
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-medium">
                          Step {setupStep} of 3
                        </Badge>
                        <span className="text-gray-500">Setup your authenticator</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-5 rounded-lg border">
                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                      <div className="flex-1 order-2 md:order-1">
                        <h3 className="text-base font-medium mb-2">1. Scan QR code</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Open your authenticator app and scan this QR code to add your account.
                        </p>

                        <div className="bg-white p-4 rounded-lg border mb-6 max-w-xs mx-auto md:mx-0">
                          <Image
                            src={twoFactorState.qrCodeUrl || "/placeholder.svg?height=200&width=200"}
                            alt="QR Code for 2FA setup"
                            width={200}
                            height={200}
                            className="mx-auto"
                          />
                        </div>

                        {twoFactorState?.secret && (
                          <div className="mb-6">
                            <h3 className="text-base font-medium mb-2">Or enter this code manually:</h3>
                            <div className="p-3 bg-white rounded-lg border font-mono text-sm break-all relative group">
                              {twoFactorState.secret}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => copyToClipboard(twoFactorState.secret || "", -2)}
                              >
                                {copiedIndex === -2 ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 order-1 md:order-2">
                        <h3 className="text-base font-medium mb-2">2. Enter verification code</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Enter the 6-digit code from your authenticator app to verify setup.
                        </p>

                        <div className="space-y-4">
                          <div className="relative">
                            <Input
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ""))}
                              placeholder="000000"
                              maxLength={6}
                              className={`text-center font-mono text-xl h-14 ${verificationCode.length === 6 ? "border-green-500" : ""}`}
                              onFocus={() => setCodeInputFocused(true)}
                              onBlur={() => setCodeInputFocused(false)}
                            />
                            {verificationCode.length === 6 && (
                              <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                            )}
                          </div>

                          <Button
                            onClick={handleVerifySetup}
                            disabled={verificationCode.length !== 6 || isVerifying || !verifyTwoFactor}
                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                          >
                            {isVerifying ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              <>
                                Verify and Continue
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </div>

                        {twoFactorState?.verificationStatus === "error" && (
                          <Alert variant="destructive" className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Verification Failed</AlertTitle>
                            <AlertDescription>
                              {twoFactorState.error || "The code you entered is incorrect. Please try again."}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <Alert className="bg-indigo-50 border-indigo-200">
                    <ShieldAlert className="h-4 w-4 text-indigo-500" />
                    <AlertTitle>Protect your account</AlertTitle>
                    <AlertDescription>
                      Two-factor authentication adds an extra layer of security to your account. Once enabled, you'll
                      need to enter a code from your authenticator app when signing in.
                    </AlertDescription>
                  </Alert>

                  <div className="bg-gray-50 p-5 rounded-lg border">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 bg-indigo-100 p-2 rounded-full">
                        <Smartphone className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div>
                        <h3 className="text-base font-medium">Set up authenticator app</h3>
                        <p className="text-sm text-gray-500 mt-1 mb-4">
                          Use an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy to
                          generate time-based codes.
                        </p>
                        <Button
                          onClick={handleGenerateSetup}
                          disabled={isGenerating || !generateTwoFactor}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Setting up...
                            </>
                          ) : (
                            "Begin Setup"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="backup-codes" className="space-y-6 mt-2">
              {twoFactorState?.backupCodes && twoFactorState.backupCodes.length > 0 ? (
                <div className="space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <div className="flex items-center space-x-2 bg-white px-3">
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-medium">
                          Step 3 of 3
                        </Badge>
                        <span className="text-gray-500">Save your backup codes</span>
                      </div>
                    </div>
                  </div>

                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <AlertTitle>Important: Save your backup codes</AlertTitle>
                    <AlertDescription>
                      Keep these backup codes in a safe place. You can use them to sign in if you lose access to your
                      authenticator app. Each code can only be used once.
                    </AlertDescription>
                  </Alert>

                  <div className="bg-gray-50 p-5 rounded-lg border">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-base font-medium">Your backup codes</h3>
                      <Button variant="outline" size="sm" onClick={copyAllBackupCodes}>
                        {copiedIndex === -1 ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            Copied All
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy All
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                      {twoFactorState.backupCodes.map((code, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-indigo-200 transition-colors"
                        >
                          <code className="text-sm font-mono">{code}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(code, index)}
                            className="h-8 w-8 p-0"
                          >
                            {copiedIndex === index ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <p className="text-sm font-medium text-green-800">
                          Two-factor authentication has been successfully enabled
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="border-green-200 hover:bg-green-100 hover:text-green-800"
                        onClick={() => setActiveTab("setup")}
                      >
                        Return to Settings
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Key className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium">No backup codes available</h3>
                  <p className="text-sm text-gray-500 mt-2 max-w-md">
                    Please complete the 2FA setup process first to generate your backup codes.
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => setActiveTab("setup")}>
                    Return to Setup
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-400" />
          <p>{t("twoFactorAuth.securityLayer")}</p>
        </div>
      </CardFooter>
    </Card>
  )
}
