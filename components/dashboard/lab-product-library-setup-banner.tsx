"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, PackageOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getLabProductLibraryCloneStatus,
  postLabCloneProductLibrary,
} from "@/lib/api-lab-product-library-clone"
import { useOnboardingStatus } from "@/hooks/use-onboarding-status"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"

const POLL_INTERVAL_MS = 8000

interface LabProductLibrarySetupBannerProps {
  customerId: number
}

function getPrimaryCustomer(user: ReturnType<typeof useAuth>["user"]) {
  if (!user?.customers?.length) return null
  return (
    user.customers.find(
      (c: { is_primary?: boolean | number | string }) =>
        c?.is_primary === true || c?.is_primary === 1 || c?.is_primary === "1",
    ) ?? user.customers[0]
  )
}

export function LabProductLibrarySetupBanner({ customerId }: LabProductLibrarySetupBannerProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const { onboardingStatus, refetch, isLoading } = useOnboardingStatus()
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollTimerRef = useRef<number | null>(null)

  useEffect(() => {
    void refetch()
  }, [refetch])

  const primaryCustomer = useMemo(() => getPrimaryCustomer(user), [user])

  const cloneStatus =
    onboardingStatus?.product_library_clone_status ||
    (primaryCustomer as { product_library_clone_status?: string } | null)
      ?.product_library_clone_status ||
    (onboardingStatus?.product_library_clone_completed ||
    primaryCustomer?.product_library_clone_completed
      ? "completed"
      : "pending")

  const isLab =
    onboardingStatus?.type === "lab" ||
    (primaryCustomer?.type || "").toLowerCase() === "lab"

  const cloneCompleted =
    cloneStatus === "completed" ||
    onboardingStatus?.product_library_clone_completed === true ||
    primaryCustomer?.product_library_clone_completed === true

  const cloneInProgress = cloneStatus === "in_progress"
  const cloneFailed = cloneStatus === "failed"

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const pollCloneStatus = useCallback(async () => {
    try {
      const status = await getLabProductLibraryCloneStatus(customerId)
      await refetch()

      if (status.product_library_clone_status === "completed") {
        stopPolling()
        toast({
          title: "Product library ready",
          description: "Your lab catalog has been set up. You can start creating cases.",
        })
      }

      if (status.product_library_clone_status === "failed") {
        stopPolling()
        setError(status.product_library_clone_error || "Product library setup failed.")
      }
    } catch (err) {
      console.error("Failed to poll product library clone status:", err)
    }
  }, [customerId, refetch, stopPolling, toast])

  useEffect(() => {
    if (!cloneInProgress) {
      stopPolling()
      return
    }

    void pollCloneStatus()
    pollTimerRef.current = window.setInterval(() => {
      void pollCloneStatus()
    }, POLL_INTERVAL_MS)

    return stopPolling
  }, [cloneInProgress, pollCloneStatus, stopPolling])

  useEffect(() => {
    if (cloneFailed) {
      setError(
        onboardingStatus?.product_library_clone_error ||
          (primaryCustomer as { product_library_clone_error?: string } | null)
            ?.product_library_clone_error ||
          "Product library setup failed.",
      )
    }
  }, [cloneFailed, onboardingStatus?.product_library_clone_error, primaryCustomer])

  if (!isLab || cloneCompleted) {
    return null
  }

  if (isLoading && onboardingStatus === null && primaryCustomer?.product_library_clone_completed === undefined) {
    return null
  }

  const handleClone = async () => {
    setError(null)
    setIsStarting(true)
    try {
      await postLabCloneProductLibrary(customerId)
      await refetch()
      toast({
        title: "Setup started",
        description: "Your product library is copying in the background. This usually takes 5–7 minutes.",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Product library setup failed."
      setError(message)
      toast({
        title: "Setup failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsStarting(false)
    }
  }

  const isBusy = isStarting || cloneInProgress

  return (
    <div className="rounded-xl border border-[#1162A8]/20 bg-gradient-to-r from-[#1162A8]/5 via-white to-[#82298D]/5 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1162A8]/10 text-[#1162A8]">
            {isBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <PackageOpen className="h-5 w-5" />}
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
              {cloneInProgress ? "Setting up your product library" : "Set up your product library"}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
              {cloneInProgress
                ? "Your catalog is copying in the background. You can stay on this page or come back later — we will update automatically when it finishes (usually 5–7 minutes)."
                : "Your lab account is ready, but the product catalog still needs to be copied from the global library. Start setup to enable products, shades, materials, and case creation."}
            </p>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full shrink-0 sm:w-auto"
          disabled={isBusy}
          onClick={() => void handleClone()}
        >
          {isBusy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {cloneInProgress ? "Setup in progress..." : "Starting setup..."}
            </>
          ) : cloneFailed ? (
            "Retry product library setup"
          ) : (
            "Start product library setup"
          )}
        </Button>
      </div>
    </div>
  )
}
