"use client"

import { useEffect, useMemo, useState } from "react"
import { BreadcrumbBar } from "@/components/billing-subscription/breadcrumb-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { getStripeSettings, type StripeMode, upsertStripeSettings } from "@/lib/api/stripe-settings"

type StripeFormState = {
  mode: StripeMode
  publishable_key: string
  secret_key: string
  webhook_secret: string
  default_currency: string
  statement_descriptor: string
  is_active: boolean
  metadata_text: string
}

type FormErrors = Record<string, string>
type ByModeBoolean = Record<StripeMode, boolean>
type ByModeString = Record<StripeMode, string>

const DEFAULT_FORM: StripeFormState = {
  mode: "test",
  publishable_key: "",
  secret_key: "",
  webhook_secret: "",
  default_currency: "USD",
  statement_descriptor: "",
  is_active: true,
  metadata_text: "{}",
}

export default function BillingSettingsPage() {
  const [activeTab, setActiveTab] = useState("stripe")
  const [testForm, setTestForm] = useState<StripeFormState>({ ...DEFAULT_FORM, mode: "test" })
  const [liveForm, setLiveForm] = useState<StripeFormState>({ ...DEFAULT_FORM, mode: "live" })
  const [errorsByMode, setErrorsByMode] = useState<Record<StripeMode, FormErrors>>({ test: {}, live: {} })
  const [isFetchingByMode, setIsFetchingByMode] = useState<Record<StripeMode, boolean>>({ test: false, live: false })
  const [isSavingByMode, setIsSavingByMode] = useState<Record<StripeMode, boolean>>({ test: false, live: false })
  const [statusByMode, setStatusByMode] = useState<Record<StripeMode, string>>({ test: "", live: "" })
  const [secretEditedByMode, setSecretEditedByMode] = useState<ByModeBoolean>({ test: false, live: false })
  const [maskedSecretByMode, setMaskedSecretByMode] = useState<ByModeString>({ test: "", live: "" })

  const maskSecret = (secret?: string): string => {
    const value = secret || ""
    if (!value) return ""
    const prefix = value.slice(0, 10)
    return `${prefix}*****`
  }

  const metadataPreviewError = useMemo(() => {
    const byMode: Record<StripeMode, string> = { test: "", live: "" }
    ;(["test", "live"] as StripeMode[]).forEach((mode) => {
      const form = mode === "test" ? testForm : liveForm
      if (!form.metadata_text.trim()) {
        byMode[mode] = ""
        return
      }
      try {
        const parsed = JSON.parse(form.metadata_text)
        if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
          byMode[mode] = ""
          return
        }
        byMode[mode] = "Metadata must be a JSON object."
      } catch {
        byMode[mode] = "Metadata must be valid JSON."
      }
    })
    return byMode
  }, [testForm, liveForm])

  const loadSettings = async (mode: StripeMode) => {
    setIsFetchingByMode((prev) => ({ ...prev, [mode]: true }))
    setStatusByMode((prev) => ({ ...prev, [mode]: "" }))
    try {
      const settings = await getStripeSettings(mode)
      const nextForm: StripeFormState = {
        mode,
        publishable_key: settings.publishable_key || "",
        secret_key: maskSecret(settings.secret_key || ""),
        webhook_secret: settings.webhook_secret || "",
        default_currency: (settings.default_currency || "USD").toUpperCase(),
        statement_descriptor: settings.statement_descriptor || "",
        is_active: settings.is_active ?? true,
        metadata_text: JSON.stringify(settings.metadata || {}, null, 2),
      }
      if (mode === "test") setTestForm(nextForm)
      else setLiveForm(nextForm)
      setMaskedSecretByMode((prev) => ({ ...prev, [mode]: maskSecret(settings.secret_key || "") }))
      setSecretEditedByMode((prev) => ({ ...prev, [mode]: false }))
      setErrorsByMode((prev) => ({ ...prev, [mode]: {} }))
      setStatusByMode((prev) => ({ ...prev, [mode]: `${mode.toUpperCase()} settings loaded.` }))
    } catch (error: any) {
      setStatusByMode((prev) => ({ ...prev, [mode]: error?.message || `Failed to load ${mode} settings.` }))
    } finally {
      setIsFetchingByMode((prev) => ({ ...prev, [mode]: false }))
    }
  }

  useEffect(() => {
    loadSettings("test")
    loadSettings("live")
  }, [])

  const validateForm = (mode: StripeMode, form: StripeFormState): boolean => {
    const nextErrors: FormErrors = {}

    if (!form.publishable_key.trim()) nextErrors.publishable_key = "Publishable key is required."
    if (secretEditedByMode[mode] && !form.secret_key.trim()) nextErrors.secret_key = "Secret key is required when updating."
    if (!form.default_currency.trim()) nextErrors.default_currency = "Default currency is required."
    if (!/^[A-Za-z]{3}$/.test(form.default_currency.trim())) {
      nextErrors.default_currency = "Default currency must be a 3-letter code."
    }
    if (form.statement_descriptor && form.statement_descriptor.length > 22) {
      nextErrors.statement_descriptor = "Statement descriptor must be 22 characters or fewer."
    }
    if (metadataPreviewError[mode]) nextErrors.metadata_text = metadataPreviewError[mode]

    setErrorsByMode((prev) => ({ ...prev, [mode]: nextErrors }))
    return Object.keys(nextErrors).length === 0
  }

  const handleSave = async (mode: StripeMode) => {
    const form = mode === "test" ? testForm : liveForm
    if (!validateForm(mode, form)) return
    setIsSavingByMode((prev) => ({ ...prev, [mode]: true }))
    setStatusByMode((prev) => ({ ...prev, [mode]: "" }))
    try {
      const payload = {
        mode,
        publishable_key: form.publishable_key.trim(),
        secret_key: secretEditedByMode[mode] ? form.secret_key.trim() : undefined,
        webhook_secret: form.webhook_secret.trim() || undefined,
        default_currency: form.default_currency.trim().toUpperCase(),
        statement_descriptor: form.statement_descriptor.trim() || undefined,
        is_active: form.is_active,
        metadata: form.metadata_text.trim() ? JSON.parse(form.metadata_text) : {},
      }

      await upsertStripeSettings(payload)
      if (secretEditedByMode[mode]) {
        const masked = maskSecret(form.secret_key)
        updateModeForm(mode, (prev) => ({ ...prev, secret_key: masked }))
        setMaskedSecretByMode((prev) => ({ ...prev, [mode]: masked }))
        setSecretEditedByMode((prev) => ({ ...prev, [mode]: false }))
      }
      setStatusByMode((prev) => ({ ...prev, [mode]: `${mode.toUpperCase()} settings saved successfully.` }))
    } catch (error: any) {
      setStatusByMode((prev) => ({ ...prev, [mode]: error?.message || `Failed to save ${mode} settings.` }))
    } finally {
      setIsSavingByMode((prev) => ({ ...prev, [mode]: false }))
    }
  }

  const updateModeForm = (mode: StripeMode, updater: (prev: StripeFormState) => StripeFormState) => {
    if (mode === "test") setTestForm(updater)
    else setLiveForm(updater)
  }

  const clearModeError = (mode: StripeMode, field: string) => {
    setErrorsByMode((prev) => ({ ...prev, [mode]: { ...prev[mode], [field]: "" } }))
  }

  const setModeActive = (mode: StripeMode, checked: boolean) => {
    updateModeForm(mode, (prev) => ({ ...prev, is_active: checked }))
    if (!checked) return
    const otherMode: StripeMode = mode === "test" ? "live" : "test"
    updateModeForm(otherMode, (prev) => ({ ...prev, is_active: false }))
    setStatusByMode((prev) => ({
      ...prev,
      [mode]: `${mode.toUpperCase()} mode set active.`,
      [otherMode]: `${otherMode.toUpperCase()} mode set inactive.`,
    }))
  }

  return (
    <div className="w-full space-y-3 px-2 py-3 md:px-3">
      <div className="space-y-1">
        <BreadcrumbBar
          items={[
            { label: "Billing & Subscription", href: "/billing-subscription/billing-configuration" },
            { label: "Settings" },
          ]}
        />
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Billing Settings</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <TabsList className="h-9 rounded-md bg-muted/40 p-1">
          <TabsTrigger value="stripe" className="h-7 rounded-md px-3 text-xs data-[state=active]:bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] data-[state=active]:text-white">
            Stripe Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stripe" className="mt-0">
          <div className="grid gap-3 xl:grid-cols-2">
            {(["test", "live"] as StripeMode[]).map((mode) => {
              const form = mode === "test" ? testForm : liveForm
              const errors = errorsByMode[mode]
              const isFetching = isFetchingByMode[mode]
              const isSaving = isSavingByMode[mode]
              return (
                <Card key={mode} className="border-[#1162A8]/25">
                  <CardHeader className="px-4 pb-2 pt-4">
                    <CardTitle className="text-base capitalize">{mode} Mode</CardTitle>
                    <CardDescription className="text-xs">
                      Configure Stripe {mode} credentials and defaults.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 px-4 pb-4">
                    <Input
                      label="Publishable Key *"
                      placeholder={mode === "test" ? "pk_test_..." : "pk_live_..."}
                      value={form.publishable_key}
                      onChange={(e) => {
                        updateModeForm(mode, (prev) => ({ ...prev, publishable_key: e.target.value }))
                        clearModeError(mode, "publishable_key")
                      }}
                      validationState={errors.publishable_key ? "error" : "default"}
                      errorMessage={errors.publishable_key}
                    />

                    <Input
                      label="Secret Key *"
                      placeholder={mode === "test" ? "sk_test_..." : "sk_live_..."}
                      value={form.secret_key}
                      onChange={(e) => {
                        updateModeForm(mode, (prev) => ({ ...prev, secret_key: e.target.value }))
                        setSecretEditedByMode((prev) => ({ ...prev, [mode]: e.target.value !== maskedSecretByMode[mode] }))
                        clearModeError(mode, "secret_key")
                      }}
                      onFocus={() => {
                        if (!secretEditedByMode[mode] && form.secret_key === maskedSecretByMode[mode]) {
                          updateModeForm(mode, (prev) => ({ ...prev, secret_key: "" }))
                        }
                      }}
                      validationState={errors.secret_key ? "error" : "default"}
                      errorMessage={errors.secret_key || (!secretEditedByMode[mode] ? "Secret key is masked. Edit to replace it." : "")}
                    />

                    <Input
                      label="Webhook Secret"
                      placeholder="whsec_..."
                      value={form.webhook_secret}
                      onChange={(e) => updateModeForm(mode, (prev) => ({ ...prev, webhook_secret: e.target.value }))}
                    />

                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        label="Default Currency *"
                        placeholder="USD"
                        value={form.default_currency}
                        onChange={(e) => {
                          updateModeForm(mode, (prev) => ({ ...prev, default_currency: e.target.value.toUpperCase() }))
                          clearModeError(mode, "default_currency")
                        }}
                        validationState={errors.default_currency ? "error" : "default"}
                        errorMessage={errors.default_currency}
                      />
                      <Input
                        label="Statement Descriptor (max 22 chars)"
                        placeholder="RXN3D LAB BILLING"
                        value={form.statement_descriptor}
                        onChange={(e) => {
                          updateModeForm(mode, (prev) => ({ ...prev, statement_descriptor: e.target.value }))
                          clearModeError(mode, "statement_descriptor")
                        }}
                        validationState={errors.statement_descriptor ? "error" : "default"}
                        errorMessage={errors.statement_descriptor}
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Metadata (JSON object)</p>
                      <Textarea
                        value={form.metadata_text}
                        onChange={(e) => {
                          updateModeForm(mode, (prev) => ({ ...prev, metadata_text: e.target.value }))
                          clearModeError(mode, "metadata_text")
                        }}
                        className="min-h-[120px]"
                      />
                      {errors.metadata_text ? <p className="text-xs text-[#CF0202]">{errors.metadata_text}</p> : null}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">Active</span>
                      <Switch
                        checked={form.is_active}
                        onCheckedChange={(checked) => setModeActive(mode, checked)}
                      />
                    </div>

                    {statusByMode[mode] ? <p className="text-xs text-muted-foreground">{statusByMode[mode]}</p> : null}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        onClick={() => loadSettings(mode)}
                        disabled={isFetching || isSaving}
                      >
                        {isFetching ? "Loading..." : "Reload"}
                      </Button>
                      <Button
                        className="h-8 px-3 text-xs"
                        onClick={() => handleSave(mode)}
                        disabled={isSaving || isFetching}
                      >
                        {isSaving ? "Saving..." : `Save ${mode === "test" ? "Test" : "Live"}`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

