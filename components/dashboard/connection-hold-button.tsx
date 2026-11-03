"use client"

import { useState, type MouseEvent } from "react"
import { useTranslation } from "react-i18next"
import { CirclePause, CirclePlay, Send } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  useHoldConnection,
  useRequestResumeConnection,
  useResumeConnection,
} from "@/hooks/use-connections"
import { ConnectionApiError } from "@/lib/connection-api"
import { getHoldBadgeKey, getHoldState, type ConnectionHoldState } from "@/lib/connection-utils"
import type { Connection, ConnectionHold } from "@/contexts/connection-context"

export type HoldPartnerLabel = "lab" | "office" | "partner"

const PARTNER_KEYS: Record<HoldPartnerLabel, string> = {
  lab: "connections.hold.partnerLab",
  office: "connections.hold.partnerOffice",
  partner: "connections.hold.partnerGeneric",
}

function formatHoldDate(value: string | null, language: string, withTime = false): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat(language || undefined, {
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date)
}

/**
 * Hold / Resume / Request to Resume for one connection (RXN-37 single hold).
 * Shared by the dashboard card button and the connections table dropdown.
 */
export function useConnectionHoldActions(
  connection: Pick<Connection, "id" | "status" | "hold">,
  partnerLabel: HoldPartnerLabel = "partner",
) {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const holdMutation = useHoldConnection()
  const resumeMutation = useResumeConnection()
  const requestMutation = useRequestResumeConnection()
  // Shown until the refetched list carries the server's request_resume_available_at.
  const [localRequest, setLocalRequest] = useState<{ requestedAt: string; availableAt: string } | null>(null)

  const state: ConnectionHoldState = getHoldState(connection)
  const localPending =
    state.onHold && !state.isMine && !!localRequest && Date.parse(localRequest.availableAt) > Date.now()
  const requestPending = state.requestPending || localPending
  const requestedAt = state.requestedAt ?? (localPending ? localRequest!.requestedAt : null)
  const requestAvailableAt = state.requestAvailableAt ?? (localPending ? localRequest!.availableAt : null)
  const partner = t(PARTNER_KEYS[partnerLabel])
  const busy = holdMutation.isPending || resumeMutation.isPending || requestMutation.isPending

  const errorText = (error: unknown) =>
    error instanceof Error && error.message ? error.message : t("connections.hold.tryAgain")

  const hold = async () => {
    if (!window.confirm(t("connections.hold.confirmHold", { partner }))) return
    try {
      await holdMutation.mutateAsync({ connectionId: connection.id })
      toast({
        title: t("connections.hold.holdSuccessTitle"),
        description: t("connections.hold.holdSuccessDescription", { partner }),
      })
    } catch (error) {
      toast({ title: t("connections.hold.holdErrorTitle"), description: errorText(error), variant: "destructive" })
    }
  }

  const resume = async () => {
    try {
      await resumeMutation.mutateAsync(connection.id)
      toast({
        title: t("connections.hold.resumeSuccessTitle"),
        description: t("connections.hold.resumeSuccessDescription", { partner }),
      })
    } catch (error) {
      toast({ title: t("connections.hold.resumeErrorTitle"), description: errorText(error), variant: "destructive" })
    }
  }

  const requestResume = async () => {
    const now = Date.now()
    try {
      const response = await requestMutation.mutateAsync({ connectionId: connection.id })
      const serverHold = response?.data?.hold
      setLocalRequest({
        requestedAt: serverHold?.resume_requested_at ?? new Date(now).toISOString(),
        availableAt: serverHold?.request_resume_available_at ?? new Date(now + 24 * 3600 * 1000).toISOString(),
      })
      toast({
        title: t("connections.hold.requestSuccessTitle"),
        description: response?.message || t("connections.hold.requestSuccessDescription", { partner }),
      })
    } catch (error) {
      if (error instanceof ConnectionApiError && error.status === 429) {
        // Already requested within 24 h: show "Requested" until the throttle ends.
        const retryMs = (error.retryAfterSeconds ?? 24 * 3600) * 1000
        setLocalRequest({
          requestedAt: state.requestedAt ?? new Date(now).toISOString(),
          availableAt: new Date(now + retryMs).toISOString(),
        })
        toast({ title: t("connections.hold.requestErrorTitle"), description: error.message })
        return
      }
      toast({ title: t("connections.hold.requestErrorTitle"), description: errorText(error), variant: "destructive" })
    }
  }

  return {
    state,
    busy,
    hold,
    resume,
    requestResume,
    canHold: state.canHold,
    canResume: state.canResume,
    requestPending,
    canRequestResume: state.canRequestResume && !localPending,
    badgeLabel: t(`connections.hold.${getHoldBadgeKey(state)}`),
    requestedLabel: t("connections.hold.requested", { date: formatHoldDate(requestedAt, i18n.language) }).trim(),
    requestAvailableLabel: requestAvailableAt
      ? t("connections.hold.requestAvailableAt", { date: formatHoldDate(requestAvailableAt, i18n.language, true) })
      : "",
  }
}

type ConnectionHoldButtonProps = {
  connection: Connection
  partnerLabel?: HoldPartnerLabel
}

/** Badge text for a connected row: Connected / On Hold by you / On Hold by Lab|Office. */
export function ConnectionHoldBadgeLabel({ connection }: { connection: { status?: string | null; hold?: ConnectionHold | null } }) {
  const { t } = useTranslation()
  return <>{t(`connections.hold.${getHoldBadgeKey(getHoldState(connection))}`)}</>
}

/**
 * Hold control for dashboard connection cards.
 * Active -> Hold; held by me -> Resume; held by the other side -> Request to Resume or "Requested <date>".
 * Only new-slip creation is blocked while a connection is on hold.
 */
export function ConnectionHoldButton({ connection, partnerLabel = "partner" }: ConnectionHoldButtonProps) {
  const { t } = useTranslation()
  const actions = useConnectionHoldActions(connection, partnerLabel)
  const stop = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation()
    fn()
  }

  if (actions.state.onHold) {
    if (actions.canResume) {
      return (
        <button
          type="button"
          data-testid="connection-resume-button"
          className="p-1.5 sm:p-2 text-[#ff9500] hover:text-green-600 hover:bg-green-50 rounded-full transition-all disabled:opacity-50"
          onClick={stop(actions.resume)}
          disabled={actions.busy}
          aria-label={t("connections.hold.resume")}
          title={t("connections.hold.resume")}
        >
          <CirclePlay className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
      )
    }

    if (actions.requestPending) {
      return (
        <span
          data-testid="connection-requested-label"
          className="inline-flex items-center whitespace-nowrap rounded-full border border-[#e4e6ef] px-2 sm:px-3 py-1 text-xs text-[#a19d9d]"
          title={actions.requestAvailableLabel}
          aria-disabled="true"
        >
          {actions.requestedLabel}
        </span>
      )
    }

    if (actions.canRequestResume) {
      return (
        <button
          type="button"
          data-testid="connection-request-resume-button"
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#1162a8] px-2 sm:px-3 py-1 text-xs font-medium text-[#1162a8] hover:bg-blue-50 transition-all disabled:opacity-40"
          onClick={stop(actions.requestResume)}
          disabled={actions.busy}
        >
          <Send className="h-3 w-3" />
          {t("connections.hold.requestResume")}
        </button>
      )
    }

    return null
  }

  if (!actions.canHold) return null

  return (
    <button
      type="button"
      data-testid="connection-hold-button"
      className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all disabled:opacity-50"
      onClick={stop(actions.hold)}
      disabled={actions.busy}
      aria-label={t("connections.hold.hold")}
      title={t("connections.hold.holdTitle")}
    >
      <CirclePause className="h-3 w-3 sm:h-4 sm:w-4" />
    </button>
  )
}
