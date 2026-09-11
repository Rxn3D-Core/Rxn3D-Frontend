"use client"

import type { ReactNode } from "react"
import { ImageIcon } from "lucide-react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

const THUMB_CLASS =
  "h-8 w-8 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0"

export function TableImagePreview({
  src,
  alt,
}: {
  src?: string | null
  alt: string
}) {
  if (!src) {
    return (
      <div className={THUMB_CLASS} aria-hidden>
        <ImageIcon className="h-3.5 w-3.5 text-gray-400" />
      </div>
    )
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className={`${THUMB_CLASS} cursor-pointer`}>
          <img src={src} alt={alt} className="h-full w-full object-contain" />
        </div>
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="center"
        sideOffset={8}
        className="flex h-[200px] w-[200px] items-center justify-center rounded-lg border border-gray-200 bg-white p-2 shadow-xl"
      >
        <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
      </HoverCardContent>
    </HoverCard>
  )
}

export function TableNameWithImage({
  src,
  alt,
  children,
}: {
  src?: string | null
  alt: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <TableImagePreview src={src} alt={alt} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
