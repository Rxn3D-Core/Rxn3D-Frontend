"use client"

import Link from "next/link"
import { ArrowRight, Building2, FlaskConical, Mail, UserRound } from "lucide-react"
import {
  RegistrationCard,
  RegistrationPageHeader,
  RegistrationPageShell,
} from "@/components/registration/registration-page-shell"
import { cn } from "@/lib/utils"

export function RegistrationTypeChooser() {
  const options = [
    {
      href: "/register/lab",
      title: "Dental Lab",
      description: "Set up your lab profile, team, and workflows in one place.",
      icon: FlaskConical,
      accent: "from-blue-500/10 to-cyan-500/10",
      iconBg: "bg-blue-100 text-blue-700",
    },
    {
      href: "/register/office",
      title: "Dental Practice",
      description: "Create your practice account and manage cases with your lab partners.",
      icon: Building2,
      accent: "from-violet-500/10 to-purple-500/10",
      iconBg: "bg-violet-100 text-violet-700",
    },
    {
      href: "/register/personal",
      title: "Personal account",
      description: "Start solo and add a lab or practice whenever you are ready.",
      icon: UserRound,
      accent: "from-slate-500/10 to-blue-500/10",
      iconBg: "bg-slate-100 text-slate-700",
    },
  ]

  return (
    <RegistrationPageShell size="wide" backHref="/login" backLabel="Back to sign in" showLogo>
      <RegistrationPageHeader
        badge="Get started"
        title="Create your Rxn3D account"
        description="Choose the path that fits how you work. You can always add organizations later from your dashboard."
        className="max-w-3xl"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => {
          const Icon = option.icon
          return (
            <Link
              key={option.href}
              href={option.href}
              className="group block h-full"
            >
              <RegistrationCard
                className={cn(
                  "relative h-full overflow-hidden transition-all duration-200",
                  "hover:-translate-y-0.5 hover:border-[#1162A8]/30 hover:shadow-lg hover:shadow-[#1162A8]/10"
                )}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100",
                    option.accent
                  )}
                />
                <div className="relative">
                  <div
                    className={cn(
                      "mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl",
                      option.iconBg
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800">{option.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{option.description}</p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#1162A8]">
                    Continue
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </RegistrationCard>
            </Link>
          )
        })}
      </div>

      <RegistrationCard className="mt-6 border-dashed bg-slate-50/50">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1162A8]/10 text-[#1162A8]">
            <Mail className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800">Have an invitation link?</h3>
            <p className="mt-1 text-sm text-slate-600">
              Open the link from your email to complete invite-based registration — no signup type
              selection needed.
            </p>
          </div>
        </div>
      </RegistrationCard>
    </RegistrationPageShell>
  )
}
