"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { setupGlobalFetchInterceptor } from "@/lib/fetch-interceptor"
import { PLAN_UPGRADE_NOTICE_EVENT } from "@/lib/plan-error-reaction"
import { PLAN_SUBSCRIPTIONS_PATH } from "@/lib/plan-guard"
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import i18n from "@/lib/i18n"

// Install as soon as this client module loads.
if (typeof window !== "undefined") {
  setupGlobalFetchInterceptor()
}

/**
 * Client-only bootstrap. A side-effect import from the server `layout.tsx`
 * never runs in the browser, so the interceptor must be mounted here.
 */
export function FetchInterceptorBootstrap() {
  const router = useRouter()

  useEffect(() => {
    setupGlobalFetchInterceptor()
  }, [])

  // Plan-gated request failed: tell the user instead of redirecting them.
  // Own toast provider and viewport (bottom-right) so the app's single-slot toast store
  // (TOAST_LIMIT = 1) cannot replace it when the failing request's caller shows its own error toast.
  const [noticeKey, setNoticeKey] = useState(0)
  const [noticeOpen, setNoticeOpen] = useState(false)

  useEffect(() => {
    const onPlanUpgradeNotice = () => {
      setNoticeKey((k) => k + 1)
      setNoticeOpen(true)
    }
    window.addEventListener(PLAN_UPGRADE_NOTICE_EVENT, onPlanUpgradeNotice)
    return () => window.removeEventListener(PLAN_UPGRADE_NOTICE_EVENT, onPlanUpgradeNotice)
  }, [])

  const t = i18n.t.bind(i18n)
  return (
    <ToastProvider duration={8000}>
      {noticeKey > 0 && (
        <Toast key={noticeKey} open={noticeOpen} onOpenChange={setNoticeOpen} data-testid="plan-upgrade-notice">
          <div className="grid gap-1">
            <ToastTitle>{t("planUpgrade.title", "Upgrade required")}</ToastTitle>
            <ToastDescription>
              {t("planUpgrade.description", "This feature is not available on your current plan.")}
            </ToastDescription>
          </div>
          <ToastAction
            altText={t("planUpgrade.action", "View plans")}
            onClick={() => router.push(PLAN_SUBSCRIPTIONS_PATH)}
          >
            {t("planUpgrade.action", "View plans")}
          </ToastAction>
          <ToastClose />
        </Toast>
      )}
      <ToastViewport
        label="Plan notifications ({hotkey})"
        className="top-auto bottom-0 md:max-w-[420px]"
      />
    </ToastProvider>
  )
}
