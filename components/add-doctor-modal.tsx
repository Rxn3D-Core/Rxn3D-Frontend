"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, UserPlus, X } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { userInvitationService } from "@/services/user-invitation-service"
import {
  lookupUsersForInvite,
  parseSearchTermPrefill,
  type UserLookupResult,
} from "@/services/user-lookup-service"
import { getUserProfileImageUrl } from "@/utils/avatar-utils"
import { cn } from "@/lib/utils"

export interface Doctor {
  id: string
  name: string
  email: string
  title: string
  image?: string
  status?: "available" | "requested" | "connected" | "Invited"
  userStatus?: "Active" | "Inactive" | "Suspended" | "Pending" | "Archived" | "Invited"
}

interface AddDoctorModalProps {
  isOpen: boolean
  onClose: () => void
  onDoctorConnect: (doctorId: string, doctorData?: Doctor) => void
}

type ModalView = "search" | "invite"

const PRIMARY_BTN =
  "bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] hover:brightness-110 text-white"

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

function resolveCustomerId(): number {
  const fromStorage = Number(localStorage.getItem("customerId") || 0)
  if (fromStorage) return fromStorage
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    return Number(user?.customers?.[0]?.id || 0)
  } catch {
    return 0
  }
}

function toDoctor(user: UserLookupResult, extras?: Partial<Doctor>): Doctor {
  return {
    id: String(user.id),
    name: user.full_name || `${user.first_name} ${user.last_name}`.trim(),
    email: user.email,
    title: "DDS",
    image: getUserProfileImageUrl(user) || undefined,
    status: user.status === "Invited" ? "Invited" : "available",
    userStatus: user.status as Doctor["userStatus"],
    ...extras,
  }
}

export function AddDoctorModal({ isOpen, onClose, onDoctorConnect }: AddDoctorModalProps) {
  const { toast } = useToast()
  const [view, setView] = useState<ModalView>("search")
  const [searchTerm, setSearchTerm] = useState("")
  const [results, setResults] = useState<UserLookupResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [actionUserId, setActionUserId] = useState<number | null>(null)
  const [isInviting, setIsInviting] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: "", email: "" })

  const resetState = useCallback(() => {
    setView("search")
    setSearchTerm("")
    setResults([])
    setIsSearching(false)
    setHasSearched(false)
    setActionUserId(null)
    setIsInviting(false)
    setInviteForm({ name: "", email: "" })
  }, [])

  useEffect(() => {
    if (isOpen) resetState()
  }, [isOpen, resetState])

  useEffect(() => {
    if (!isOpen || view !== "search") return

    const customerId = resolveCustomerId()
    const q = searchTerm.trim()
    if (!customerId || q.length < 2) {
      setResults([])
      setHasSearched(false)
      setIsSearching(false)
      return
    }

    let cancelled = false
    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      try {
        const users = await lookupUsersForInvite({ q, customerId })
        if (!cancelled) {
          setResults(users)
          setHasSearched(true)
        }
      } catch (error: any) {
        if (!cancelled) {
          setResults([])
          setHasSearched(true)
          toast({
            title: "Search failed",
            description: error?.message || "Could not search doctors",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) setIsSearching(false)
      }
    }, 280)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [searchTerm, isOpen, view, toast])

  const handleClose = () => {
    resetState()
    onClose()
  }

  const openInviteForm = (prefill?: { name?: string; email?: string }) => {
    const fromSearch = parseSearchTermPrefill(searchTerm)
    setInviteForm({
      name: prefill?.name || [fromSearch.first_name, fromSearch.last_name].filter(Boolean).join(" "),
      email: prefill?.email || fromSearch.email || "",
    })
    setView("invite")
  }

  const inviteDoctor = async (name: string, email: string, connectAfter: boolean) => {
    const customerId = resolveCustomerId()
    if (!customerId) {
      toast({
        title: "No organization",
        description: "Select an office before inviting a doctor.",
        variant: "destructive",
      })
      return
    }

    setIsInviting(true)
    try {
      const response = await userInvitationService.inviteDoctor({
        customer_id: customerId,
        name: name.trim(),
        email: email.trim(),
        role: "doctor",
      })

      const user = response.data?.user
      const created = Boolean(response.data?.created)

      if (user && (created || connectAfter)) {
        const doctor: Doctor = {
          id: String(user.id),
          name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || name,
          email: user.email,
          title: "DDS",
          status: "Invited",
          userStatus: user.status === "Invited" ? "Invited" : "Active",
        }

        toast({
          title: created ? "Doctor invited" : "Invitation sent",
          description: created
            ? "You can use this doctor on the slip now."
            : "They’ll be available on slips after accepting the invite.",
        })

        if (created) {
          onDoctorConnect(doctor.id, doctor)
          handleClose()
          return
        }

        // Existing user (e.g. offboarded elsewhere): invite only until accept
        handleClose()
        return
      }

      toast({
        title: "Invitation sent",
        description: "Doctor invitation email was sent.",
      })
      handleClose()
    } catch (error: any) {
      const message = error?.message || "Failed to invite doctor"
      toast({
        title: message.includes("already belongs") ? "Already a member" : "Invite failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsInviting(false)
      setActionUserId(null)
    }
  }

  const handleRowAction = async (user: UserLookupResult) => {
    const status = user.invitation_status || (user.already_linked ? "linked" : "none")

    if (status === "linked") {
      onDoctorConnect(String(user.id), toDoctor(user))
      handleClose()
      return
    }

    if (status === "pending") return

    // none or offboarded → send invite
    setActionUserId(user.id)
    await inviteDoctor(
      user.full_name || `${user.first_name} ${user.last_name}`.trim(),
      user.email,
      false,
    )
  }

  const handleInviteFormSubmit = async () => {
    if (!inviteForm.name.trim()) {
      toast({ title: "Name required", description: "Enter the doctor's name.", variant: "destructive" })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email.trim())) {
      toast({ title: "Invalid email", description: "Enter a valid email address.", variant: "destructive" })
      return
    }
    await inviteDoctor(inviteForm.name, inviteForm.email, true)
  }

  const showSuggestions = searchTerm.trim().length >= 2
  const showEmpty = showSuggestions && hasSearched && !isSearching && results.length === 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className={cn(
          "w-[calc(100%-1.5rem)] max-w-[400px] p-0 gap-0 overflow-hidden rounded-2xl",
          "max-h-[min(90dvh,560px)] flex flex-col",
        )}
      >
        <div className="relative flex items-center justify-center px-4 pt-4 pb-3 border-b border-[#f0f0f0]">
          <DialogTitle className="text-[15px] font-semibold text-[#111827] tracking-tight">
            {view === "invite" ? "Invite Doctor" : "Add Doctor"}
          </DialogTitle>
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-full text-[#6b7280] hover:bg-[#f3f4f6]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {view === "search" ? (
          <div className="flex flex-col min-h-0 flex-1">
            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Name or email"
                  className="h-10 rounded-xl border-[#e5e7eb] bg-[#fafafa] focus-visible:bg-white text-sm"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-[#9ca3af]" />
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {!showSuggestions && (
                <p className="px-4 py-6 text-center text-xs text-[#9ca3af]">
                  Start typing a name or email to find a doctor.
                </p>
              )}

              {showSuggestions && isSearching && results.length === 0 && (
                <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#9ca3af]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Looking up…
                </div>
              )}

              {showEmpty && (
                <div className="px-4 py-6 text-center space-y-3">
                  <p className="text-sm text-[#6b7280]">No one found</p>
                  <Button
                    type="button"
                    size="sm"
                    className={cn("h-9 rounded-full px-4", PRIMARY_BTN)}
                    onClick={() => openInviteForm()}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                    Invite new doctor
                  </Button>
                </div>
              )}

              {results.length > 0 && (
                <ul className="px-2 pb-2">
                  {results.map((user) => {
                    const status =
                      user.invitation_status || (user.already_linked ? "linked" : "none")
                    const displayName = user.full_name || "Unnamed"
                    const imageUrl = getUserProfileImageUrl(user)
                    const isBusy = actionUserId === user.id && isInviting

                    return (
                      <li key={user.id}>
                        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={imageUrl || undefined} alt={displayName} />
                            <AvatarFallback className="bg-[#eceff3] text-[#4b5563] text-xs font-medium">
                              {initialsFromName(displayName || user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[#111827] truncate leading-tight">
                              {displayName}
                            </p>
                            <p className="text-xs text-[#6b7280] truncate leading-tight mt-0.5">
                              {user.email}
                            </p>
                          </div>

                          {status === "linked" && (
                            <Button
                              type="button"
                              size="sm"
                              className={cn("shrink-0 h-8 rounded-full px-3.5 text-xs font-semibold", PRIMARY_BTN)}
                              onClick={() => handleRowAction(user)}
                            >
                              Select
                            </Button>
                          )}
                          {status === "pending" && (
                            <span className="shrink-0 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                              Pending
                            </span>
                          )}
                          {(status === "none" || status === "offboarded") && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={isInviting}
                              className={cn("shrink-0 h-8 rounded-full px-3.5 text-xs font-semibold", PRIMARY_BTN)}
                              onClick={() => handleRowAction(user)}
                            >
                              {isBusy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : status === "offboarded" ? (
                                "Re-invite"
                              ) : (
                                "Invite"
                              )}
                            </Button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-[#f0f0f0] px-4 py-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => openInviteForm()}
                className="text-xs sm:text-sm font-medium text-[#82298D] hover:underline underline-offset-2"
              >
                Invite new instead
              </button>
              <span className="text-[11px] text-[#9ca3af]">as Doctor</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col min-h-0 flex-1">
            <div className="px-4 py-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#6b7280]">Name *</Label>
                <Input
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Doctor name"
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#6b7280]">Email *</Label>
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="name@example.com"
                  className="h-10 rounded-xl"
                />
              </div>
              <p className="text-xs text-[#9ca3af]">
                Creates an invited doctor you can use on this slip immediately when they’re new to
                Rxn3D.
              </p>
            </div>
            <div className="border-t border-[#f0f0f0] px-4 py-3 flex items-center justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setView("search")} disabled={isInviting}>
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isInviting}
                className={cn("h-9 rounded-full px-4", PRIMARY_BTN)}
                onClick={() => void handleInviteFormSubmit()}
              >
                {isInviting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Inviting…
                  </>
                ) : (
                  "Invite & use on slip"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
