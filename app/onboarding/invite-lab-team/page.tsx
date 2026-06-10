"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthHeader } from "@/components/auth-header"
import { useOnboardingStatus } from "@/hooks/use-onboarding-status"
import { useAuth } from "@/contexts/auth-context"
import { useCreateUserInvitation } from "@/hooks/use-user-invitations"

const LAB_ROLE_OPTIONS = [
  { value: "lab_user", label: "Lab User" },
  { value: "lab_admin", label: "Lab Admin" },
  // Driver pickup/delivery is handled by lab_user — no separate lab_driver role.
  // { value: "lab_driver", label: "Lab Driver" },
]

export default function InviteLabTeamPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboardingStatus()

  const [customerId, setCustomerId] = useState<number | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("lab_user")

  const { mutate: inviteUser, isPending } = useCreateUserInvitation()

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = localStorage.getItem("customerId")
    if (raw) {
      const n = Number.parseInt(raw, 10)
      if (!Number.isNaN(n)) setCustomerId(n)
    }
  }, [])

  useEffect(() => {
    if (!onboardingLoading && user && isOnboardingComplete) {
      const isSuperAdmin = user.roles?.includes("superadmin")
      if (!isSuperAdmin) {
        router.replace("/dashboard")
      }
    }
  }, [onboardingLoading, user, isOnboardingComplete, router])

  const handleAddInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerId || !name.trim() || !email.trim() || !role) return
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    if (!emailOk) return

    inviteUser(
      {
        customer_id: customerId,
        name: name.trim(),
        email: email.trim(),
        role,
      },
      {
        onSuccess: () => {
          setName("")
          setEmail("")
        },
      },
    )
  }

  const goBackToCaseSchedule = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("onboardingReturnTab", "case-schedule")
    }
    router.replace("/onboarding/business-hours")
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f7fbff]">
      <AuthHeader />
      <div className="px-6 py-4 bg-white border-b">
        <div className="relative h-1 bg-[#e4e6ef] rounded-full max-w-3xl mx-auto">
          <div className="absolute h-1 w-[45%] bg-[#1162a8] rounded-full"></div>
        </div>
        <div className="text-right max-w-3xl mx-auto mt-1 text-sm">45% complete</div>
      </div>

      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 mb-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-1">Invite your lab team</h1>
              <p className="text-[#545f71]">Add teammates by sending email invitations (optional—you can invite more later from the dashboard).</p>
            </div>

            <form onSubmit={handleAddInvite} className="space-y-4 max-w-lg mx-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team member name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {LAB_ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-center pt-2">
                <Button type="submit" className="bg-[#1162a8]" disabled={isPending || !customerId}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send invitation"
                  )}
                </Button>
              </div>
            </form>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" className="bg-[#eef1f4]" onClick={goBackToCaseSchedule}>
              Previous
            </Button>
            <Button className="bg-[#1162a8]" onClick={() => router.push("/onboarding/invite-users")}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
