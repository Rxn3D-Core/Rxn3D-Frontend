"use client"

import type { MouseEvent } from "react"
import { CirclePause, CirclePlay } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useHoldConnection, useResumeConnection } from "@/hooks/use-connections"
import { isOnHoldConnection } from "@/lib/connection-utils"
import type { Connection } from "@/contexts/connection-context"

type ConnectionHoldButtonProps = {
  connection: Connection
  partnerLabel?: string
}

/**
 * Only hold/resume control for dashboard connection cards.
 * Hold sets lab_offices.status to OnHold so slip flows that require Active stop.
 */
export function ConnectionHoldButton({
  connection,
  partnerLabel = "partner",
}: ConnectionHoldButtonProps) {
  const { toast } = useToast()
  const holdMutation = useHoldConnection()
  const resumeMutation = useResumeConnection()
  const onHold = isOnHoldConnection(connection)
  const busy = holdMutation.isPending || resumeMutation.isPending

  const handleHold = async (e: MouseEvent) => {
    e.stopPropagation()
    const ok = window.confirm(
      `Put this ${partnerLabel} connection on hold?\n\nYou will stop receiving slips for this connection until you resume it.`
    )
    if (!ok) return

    try {
      await holdMutation.mutateAsync({ connectionId: connection.id })
      toast({
        title: "Connection on hold",
        description: `Slips from this ${partnerLabel} are paused until you resume.`,
      })
    } catch (error) {
      toast({
        title: "Could not hold connection",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleResume = async (e: MouseEvent) => {
    e.stopPropagation()
    try {
      await resumeMutation.mutateAsync(connection.id)
      toast({
        title: "Connection resumed",
        description: `You can receive slips from this ${partnerLabel} again.`,
      })
    } catch (error) {
      toast({
        title: "Could not resume connection",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  if (onHold) {
    return (
      <button
        type="button"
        className="p-1.5 sm:p-2 text-[#ff9500] hover:text-green-600 hover:bg-green-50 rounded-full transition-all disabled:opacity-50"
        onClick={handleResume}
        disabled={busy}
        aria-label="Resume connection"
        title="Resume connection"
      >
        <CirclePlay className="h-3 w-3 sm:h-4 sm:w-4" />
      </button>
    )
  }

  return (
    <button
      type="button"
      className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all disabled:opacity-50"
      onClick={handleHold}
      disabled={busy}
      aria-label="Hold connection"
      title="Hold connection — stop receiving slips"
    >
      <CirclePause className="h-3 w-3 sm:h-4 sm:w-4" />
    </button>
  )
}
