"use client"

import Link from "next/link"
import { ArrowRight, Building2, FlaskConical, LayoutDashboard, Mail } from "lucide-react"
import {
  RegistrationCard,
  RegistrationPageHeader,
  RegistrationPageShell,
} from "@/components/registration/registration-page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isOpenRegistrationEnabled } from "@/lib/config/registration"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export default function GetStartedPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [inviteUrl, setInviteUrl] = useState("")

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login?redirect=/get-started")
    }
  }, [isLoading, user, router])

  const handleOpenInvite = () => {
    const trimmed = inviteUrl.trim()
    if (!trimmed) return

    try {
      const url = new URL(trimmed, window.location.origin)
      router.push(`${url.pathname}${url.search}`)
    } catch {
      if (trimmed.startsWith("/")) {
        router.push(trimmed)
      }
    }
  }

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1162A8] border-t-transparent" />
      </div>
    )
  }

  const customers = user.customers || []
  const hasOrganizations = customers.length > 0

  const createOptions = [
    {
      href: "/register/lab?authenticated=1",
      title: "Create a Lab",
      description: "Register a new dental lab and invite your team.",
      icon: FlaskConical,
      iconBg: "bg-blue-100 text-blue-700",
    },
    {
      href: "/register/office?authenticated=1",
      title: "Create a Practice",
      description: "Set up a dental office or practice on Rxn3D.",
      icon: Building2,
      iconBg: "bg-violet-100 text-violet-700",
    },
  ]

  return (
    <RegistrationPageShell size="wide">
      <RegistrationPageHeader
        badge="Welcome"
        title={`Hello, ${user.first_name}`}
        description={
          hasOrganizations
            ? "Create another organization or join one using an invitation from your email."
            : "You're all set with a personal account. Create a lab or practice, or join an organization with an invitation link."
        }
      />

      {isOpenRegistrationEnabled ? (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {createOptions.map((option) => {
            const Icon = option.icon
            return (
              <Link key={option.href} href={option.href} className="group block h-full">
                <RegistrationCard
                  className={cn(
                    "h-full transition-all duration-200",
                    "hover:-translate-y-0.5 hover:border-[#1162A8]/30 hover:shadow-lg hover:shadow-[#1162A8]/10"
                  )}
                >
                  <div className={cn("mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl", option.iconBg)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800">{option.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{option.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#1162A8]">
                    Get started
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </RegistrationCard>
              </Link>
            )
          })}
        </div>
      ) : null}

      <RegistrationCard>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1162A8]/10 text-[#1162A8]">
            <Mail className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Join with an invitation</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Paste an organization or user invitation link from your email to accept it.
              </p>
            </div>
            <Input
              id="invite-url"
              label="Invitation link"
              value={inviteUrl}
              onChange={(e) => setInviteUrl(e.target.value)}
              placeholder="https://app.rxn3d.com/register?token=..."
            />
            <Button type="button" size="lg" onClick={handleOpenInvite}>
              Open invitation
            </Button>
          </div>
        </div>
      </RegistrationCard>

      {hasOrganizations ? (
        <div className="mt-8 flex justify-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard" className="inline-flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Go to dashboard
            </Link>
          </Button>
        </div>
      ) : null}
    </RegistrationPageShell>
  )
}
