"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

/** Portaled UI outside DialogContent subtree (nested modals, Radix layers) must not be swallowed by preventDefault. */
function shouldAllowDialogInteractOutside(ev: Event): boolean {
  const original = (ev as CustomEvent<{ originalEvent?: Event }>).detail?.originalEvent ?? ev
  const path: EventTarget[] =
    original && typeof (original as Event & { composedPath?: () => EventTarget[] }).composedPath === "function"
      ? (original as Event & { composedPath: () => EventTarget[] }).composedPath()
      : [((original as Event).target as EventTarget) ?? (ev as Event & { target?: EventTarget }).target].filter(
          Boolean,
        )
  for (const node of path) {
    if (!(node instanceof Element)) continue
    if (node.closest('[data-dialog-nested-overlay="true"]')) return true
    if (node.closest("[data-radix-select-content]")) return true
    if (node.closest("[data-radix-popover-content]")) return true
    if (node.closest("[data-radix-dropdown-menu-content]")) return true
    if (node.closest("[data-radix-tooltip-content]")) return true
    if (node.closest("[data-radix-alert-dialog-content]")) return true
  }
  return false
}

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/** Tailwind `p-0` on content usually means a full custom shell with its own header/close — hide default to avoid double X. */
function contentClassUsesPaddingZero(className: unknown): boolean {
  return typeof className === "string" && /\bp-0\b/.test(className)
}

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  /**
   * Built-in top-right close (shadcn/Radix).
   * - `undefined` (default): omit when `className` includes Tailwind `p-0` (custom chrome); otherwise show.
   * - `true` / `false`: always show or always hide (use `true` on rare `p-0` dialogs that rely only on this control).
   */
  showCloseButton?: boolean
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, showCloseButton, ...props }, ref) => {
  const renderDefaultClose =
    showCloseButton === true
      ? true
      : showCloseButton === false
        ? false
        : !contentClassUsesPaddingZero(className)

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        onInteractOutside={(e) => {
          if (shouldAllowDialogInteractOutside(e)) return
          e.preventDefault()
        }}
        onFocusOutside={(e) => {
          if (shouldAllowDialogInteractOutside(e)) return
          e.preventDefault()
        }}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-h-[90vh]",
          className,
        )}
        {...props}
      >
        {children}
        {renderDefaultClose ? (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm p-1 opacity-70 ring-offset-background transition-opacity hover:bg-accent hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" aria-hidden />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
