"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"
// Top support header hidden on open registration — matches login in-page layout (logo + form, no extra bar)
// import { AuthHeader } from "@/components/auth-header"
import { cn } from "@/lib/utils"

interface RegistrationPageShellProps {
  children: React.ReactNode
  /** narrow = personal; medium = lab/office wizard; wide = type chooser */
  size?: "narrow" | "medium" | "wide"
  backHref?: string
  backLabel?: string
  showLogo?: boolean
  /** Title block rendered beside logo/back to save vertical space */
  headerAside?: React.ReactNode
  /** Fit form on one screen without scrolling (personal signup) */
  compact?: boolean
  /** Lab/office wizard: lock to viewport height, no page scroll */
  fitViewport?: boolean
  className?: string
}

export function RegistrationPageShell({
  children,
  size = "wide",
  backHref,
  backLabel = "Back",
  showLogo = false,
  headerAside,
  compact = false,
  fitViewport = false,
  className,
}: RegistrationPageShellProps) {
  const maxWidthClass =
    size === "narrow" ? "max-w-[460px]" : size === "medium" ? "max-w-3xl" : "max-w-5xl"

  return (
    <div
      className={cn(
        "flex flex-col bg-gradient-to-br from-slate-50 to-blue-50",
        fitViewport ? "min-h-[100dvh] sm:h-screen sm:overflow-hidden" : "min-h-[100dvh]"
      )}
    >
      {/* <AuthHeader /> */}

      <div
        className={cn(
          "flex min-h-0 flex-1",
          fitViewport
            ? "overflow-y-auto sm:overflow-hidden"
            : "overflow-y-auto",
          "px-4 py-3 sm:px-8 sm:py-4",
          compact || fitViewport
            ? "items-start justify-center sm:items-center"
            : "items-start justify-center lg:items-center"
        )}
      >
        <div
          className={cn(
            "flex w-full flex-col",
            maxWidthClass,
            fitViewport
              ? "min-h-0 sm:h-full sm:overflow-hidden"
              : "pb-6",
            className
          )}
        >
          {(backHref || showLogo || headerAside) && (
            <div
              className={cn(
                "mb-3 shrink-0 sm:mb-4",
                headerAside
                  ? "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                  : fitViewport
                    ? "flex flex-col gap-1.5"
                    : compact
                      ? "mb-4 flex flex-col gap-2"
                      : "mb-6 flex flex-col gap-3 sm:mb-8"
              )}
            >
              {(showLogo || backHref) && (
                <div className="flex shrink-0 flex-col gap-1.5">
                  {showLogo ? (
                    <Link href="/" className="inline-block">
                      <Image
                        src="/images/rxn3d-logo.svg"
                        alt="RXN3D"
                        width={200}
                        height={64}
                        className={cn("w-auto", fitViewport ? "h-10 sm:h-12" : "h-12 sm:h-16")}
                        priority
                      />
                    </Link>
                  ) : null}
                  {backHref ? (
                    <Link
                      href={backHref}
                      className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-[#1162A8]"
                    >
                      <ArrowLeft className="h-4 w-4 shrink-0" />
                      <span className="break-words">{backLabel}</span>
                    </Link>
                  ) : null}
                </div>
              )}
              {headerAside ? (
                <div className="flex min-w-0 flex-col text-left sm:ml-auto sm:max-w-md sm:flex-1 sm:items-end sm:text-right">
                  {headerAside}
                </div>
              ) : null}
            </div>
          )}

          {fitViewport ? (
            <div className="flex min-h-0 flex-1 flex-col sm:overflow-hidden">{children}</div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  )
}

interface RegistrationPageHeaderProps {
  title: string
  description?: string
  badge?: string
  compact?: boolean
  /** Tighter vertical spacing for lab/office wizard */
  dense?: boolean
  /** Render beside logo in the top row */
  align?: "left" | "right"
  className?: string
}

export function RegistrationPageHeader({
  title,
  description,
  badge,
  compact = false,
  dense = false,
  align = "left",
  className,
}: RegistrationPageHeaderProps) {
  return (
    <div
      className={cn(
        dense ? "space-y-0.5" : compact ? "space-y-1" : "space-y-2 sm:space-y-3",
        align === "right" && "sm:ml-auto sm:max-w-md sm:text-right",
        className
      )}
    >
      {badge && !compact ? (
        <span className="inline-flex items-center rounded-full bg-[#1162A8]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#1162A8]">
          {badge}
        </span>
      ) : null}
      <h1
        className={cn(
          "font-bold tracking-tight text-slate-800",
          compact || dense ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
        )}
      >
        {title}
      </h1>
      {description ? (
        <p className={cn("text-slate-600", compact || dense ? "text-sm" : "text-sm sm:text-base")}>
          {description}
        </p>
      ) : null}
    </div>
  )
}

interface RegistrationCardProps {
  children: React.ReactNode
  className?: string
  /** Flat form area without card chrome (login-style) */
  flat?: boolean
}

export function RegistrationCard({ children, className, flat = false }: RegistrationCardProps) {
  if (flat) {
    return <div className={cn("space-y-4", className)}>{children}</div>
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/50 sm:p-6",
        className
      )}
    >
      {children}
    </div>
  )
}
