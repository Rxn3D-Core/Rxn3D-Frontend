"use client"

import type { ReactNode } from "react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface TableDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function TableDetailsSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: TableDetailsSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "left-auto right-0 top-0 h-screen max-h-screen w-full max-w-[680px] translate-x-0 translate-y-0 gap-0 rounded-none border-l border-border bg-white p-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          className,
        )}
        showCloseButton
      >
        <DialogHeader className="border-b border-slate-200 px-6 py-5 text-left">
          <DialogTitle className="text-xl font-semibold text-slate-900">{title}</DialogTitle>
          {description ? <DialogDescription className="mt-1 text-sm text-slate-500">{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
