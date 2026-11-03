"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { setupGlobalFetchInterceptor } from "@/lib/fetch-interceptor"
import { PLAN_UPGRADE_NOTICE_EVENT } from "@/lib/plan-error-reaction"
import { PLAN_SUBSCRIPTIONS_PATH } from "@/lib/plan-guard"
import { toast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
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
  useEffect(() => {
    const onPlanUpgradeNotice = () => {
      const t = i18n.t.bind(i18n)
      toast({
        title: t("planUpgrade.title", "Upgrade required"),
        description: t("planUpgrade.description", "This feature is not available on your current plan."),
        action: (
          <ToastAction
            altText={t("planUpgrade.action", "View plans")}
            onClick={() => router.push(PLAN_SUBSCRIPTIONS_PATH)}
          >
            {t("planUpgrade.action", "View plans")}
          </ToastAction>
        ),
      })
    }
    window.addEventListener(PLAN_UPGRADE_NOTICE_EVENT, onPlanUpgradeNotice)
    return () => window.removeEventListener(PLAN_UPGRADE_NOTICE_EVENT, onPlanUpgradeNotice)
  }, [router])

  return null
}
