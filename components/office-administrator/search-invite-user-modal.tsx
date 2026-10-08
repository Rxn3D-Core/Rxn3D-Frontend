"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, UserPlus, X } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useCreateUserInvitation } from "@/hooks/use-user-invitations"
import { lookupUsersForInvite, parseSearchTermPrefill, type UserLookupResult } from "@/services/user-lookup-service"
import { getUserProfileImageUrl } from "@/utils/avatar-utils"
import {
  getAddUserButtonLabel,
  getRoleDisplayLabel,
} from "@/lib/user-role-labels"
import { roleSelectOptionsForCustomerType } from "@/lib/user-customer-roles"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { cn } from "@/lib/utils"

interface CustomerOption {
  value: string
  label: string
  type?: string
}

interface SearchInviteUserModalProps {
  isOpen: boolean
  onClose: () => void
  onInviteSuccess: () => void
  /** Switch to the existing create-with-password form, optionally prefilled from search. */
  onCreateNew: (prefill?: { first_name?: string; last_name?: string; email?: string }) => void
  lockedRole?: string
  requireCustomerSelection?: boolean
  customerOptions?: CustomerOption[]
}

const PRIMARY_BTN =
  "bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] hover:brightness-110 text-white"

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

export function SearchInviteUserModal({
  isOpen,
  onClose,
  onInviteSuccess,
  onCreateNew,
  lockedRole,
  requireCustomerSelection = false,
  customerOptions = [],
}: SearchInviteUserModalProps) {
  const { toast } = useToast()
  const { mutate: createInvitation, isPending: isInviting } = useCreateUserInvitation()

  const [searchTerm, setSearchTerm] = useState("")
  const [results, setResults] = useState<UserLookupResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [invitingUserId, setInvitingUserId] = useState<number | null>(null)
  const [pendingRoleUser, setPendingRoleUser] = useState<UserLookupResult | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [inviteRole, setInviteRole] = useState(lockedRole || "")

  const localCustomerId =
    typeof window !== "undefined" ? localStorage.getItem("customerId") || "" : ""
  const localCustomerType =
    typeof window !== "undefined" ? localStorage.getItem("customerType")?.toLowerCase() : null

  const selectedCustomerType = useMemo(() => {
    if (requireCustomerSelection) {
      return customerOptions.find((c) => c.value === selectedCustomerId)?.type?.toLowerCase() || null
    }
    return localCustomerType
  }, [requireCustomerSelection, customerOptions, selectedCustomerId, localCustomerType])

  const roleOptions = useMemo(
    () => roleSelectOptionsForCustomerType(selectedCustomerType),
    [selectedCustomerType],
  )

  const effectiveCustomerId = requireCustomerSelection ? selectedCustomerId : localCustomerId
  const title = lockedRole ? getAddUserButtonLabel(lockedRole) : "Add User"

  const resetState = useCallback(() => {
    setSearchTerm("")
    setResults([])
    setIsSearching(false)
    setHasSearched(false)
    setInvitingUserId(null)
    setPendingRoleUser(null)
    setSelectedCustomerId("")
    setInviteRole(lockedRole || "")
  }, [lockedRole])

  useEffect(() => {
    if (isOpen) {
      resetState()
      if (lockedRole) setInviteRole(lockedRole)
    }
  }, [isOpen, resetState, lockedRole])

  useEffect(() => {
    if (!isOpen) return
    if (!effectiveCustomerId) return

    const q = searchTerm.trim()
    if (q.length < 2) {
      setResults([])
      setHasSearched(false)
      setIsSearching(false)
      return
    }

    let cancelled = false
    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      try {
        const users = await lookupUsersForInvite({
          q,
          customerId: effectiveCustomerId,
        })
        if (!cancelled) {
          setResults(users)
          setHasSearched(true)
        }
      } catch (error: any) {
        if (!cancelled) {
          setResults([])
          setHasSearched(true)
          toast({
            title: "Couldn't find users",
            description: error?.message || "Please try again",
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
  }, [searchTerm, effectiveCustomerId, isOpen, toast])

  const handleClose = () => {
    resetState()
    onClose()
  }

  const sendInvite = (user: UserLookupResult, role: string) => {
    if (!effectiveCustomerId || !role) return

    setInvitingUserId(user.id)
    createInvitation(
      {
        customer_id: Number(effectiveCustomerId),
        name: user.full_name || `${user.first_name} ${user.last_name}`.trim(),
        email: user.email,
        role,
      },
      {
        onSuccess: () => {
          setInvitingUserId(null)
          handleClose()
          onInviteSuccess()
        },
        onError: () => {
          setInvitingUserId(null)
        },
      },
    )
  }

  const handleInviteClick = (user: UserLookupResult) => {
    const status = user.invitation_status || (user.already_linked ? "linked" : "none")
    if (status === "linked" || status === "pending" || isInviting) return
    // "offboarded" and "none" can invite / re-invite

    if (lockedRole) {
      sendInvite(user, lockedRole)
      return
    }

    // Need a role first when Add User has no locked role
    if (inviteRole) {
      sendInvite(user, inviteRole)
      return
    }

    setPendingRoleUser(user)
  }

  const handleConfirmRoleInvite = () => {
    if (!pendingRoleUser || !inviteRole) {
      toast({
        title: "Choose a role",
        description: "Select how this person should join.",
        variant: "destructive",
      })
      return
    }
    sendInvite(pendingRoleUser, inviteRole)
  }

  const handleCreateNew = () => {
    const prefill = parseSearchTermPrefill(searchTerm)
    handleClose()
    onCreateNew(prefill)
  }

  const canSearch = Boolean(effectiveCustomerId)
  const showSuggestions = canSearch && searchTerm.trim().length >= 2
  const showEmpty = showSuggestions && hasSearched && !isSearching && results.length === 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className={cn(
          "w-[calc(100%-1.5rem)] max-w-[400px] p-0 gap-0 overflow-hidden rounded-2xl",
          "sm:w-full",
          "max-h-[min(90dvh,560px)] flex flex-col",
        )}
      >
        {/* Compact header */}
        <div className="relative flex items-center justify-center px-4 pt-4 pb-3 border-b border-[#f0f0f0]">
          <DialogTitle className="text-[15px] font-semibold text-[#111827] tracking-tight">
            {title}
          </DialogTitle>
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-full text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col min-h-0 flex-1">
          {requireCustomerSelection && (
            <div className="px-4 pt-3">
              <SearchableSelect
                options={customerOptions.map((c) => ({ value: c.value, label: c.label }))}
                value={selectedCustomerId}
                onValueChange={(value) => {
                  setSelectedCustomerId(value)
                  setPendingRoleUser(null)
                  setResults([])
                  setHasSearched(false)
                }}
                placeholder="Choose office or lab"
                className="h-10"
              />
            </div>
          )}

          {/* Add field — feels like tagging someone, not a search tool */}
          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPendingRoleUser(null)
                }}
                placeholder="Name or email"
                className="h-10 rounded-xl border-[#e5e7eb] bg-[#fafafa] focus-visible:bg-white text-sm px-3"
                disabled={!canSearch}
                autoFocus={!requireCustomerSelection}
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-[#9ca3af]" />
              )}
            </div>
            {!lockedRole && canSearch && (
              <div className="mt-2">
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="h-9 rounded-xl bg-[#fafafa] border-[#e5e7eb] text-sm">
                    <SelectValue placeholder="Add as…" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {!canSearch && requireCustomerSelection && (
              <p className="mt-2 text-xs text-[#9ca3af]">Pick an organization first.</p>
            )}
          </div>

          {/* Suggestions — only when typing */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {!showSuggestions && !requireCustomerSelection && (
              <p className="px-4 py-6 text-center text-xs text-[#9ca3af]">
                Start typing a name or email to add someone.
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
                  onClick={handleCreateNew}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  Create new
                </Button>
              </div>
            )}

            {results.length > 0 && (
              <ul className="px-2 pb-2">
                {results.map((user) => {
                  const imageUrl = getUserProfileImageUrl(user)
                  const displayName = user.full_name || "Unnamed"
                  const isThisInviting = invitingUserId === user.id
                  const isPending = pendingRoleUser?.id === user.id

                  return (
                    <li key={user.id}>
                      <div
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl px-2 py-2",
                          isPending && "bg-[#f5f3ff]",
                        )}
                      >
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

                        {(() => {
                          const status =
                            user.invitation_status ||
                            (user.already_linked ? "linked" : "none")

                          if (status === "linked") {
                            return (
                              <span className="shrink-0 text-[11px] font-medium text-[#9ca3af] px-2">
                                Member
                              </span>
                            )
                          }

                          if (status === "pending") {
                            return (
                              <span className="shrink-0 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                                Pending
                              </span>
                            )
                          }

                          if (status === "offboarded") {
                            return (
                              <Button
                                type="button"
                                size="sm"
                                disabled={isInviting}
                                onClick={() => handleInviteClick(user)}
                                className={cn(
                                  "shrink-0 h-8 rounded-full px-3.5 text-xs font-semibold",
                                  PRIMARY_BTN,
                                )}
                              >
                                {isThisInviting ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  "Re-invite"
                                )}
                              </Button>
                            )
                          }

                          return (
                            <Button
                              type="button"
                              size="sm"
                              disabled={isInviting}
                              onClick={() => handleInviteClick(user)}
                              className={cn(
                                "shrink-0 h-8 rounded-full px-3.5 text-xs font-semibold",
                                PRIMARY_BTN,
                              )}
                            >
                              {isThisInviting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                "Invite"
                              )}
                            </Button>
                          )
                        })()}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Role confirm strip when unlocked + role not chosen yet */}
          {pendingRoleUser && !lockedRole && (
            <div className="border-t border-[#f0f0f0] px-4 py-3 space-y-2 bg-[#fafafa]">
              <p className="text-xs text-[#6b7280]">
                Add <span className="font-medium text-[#111827]">{pendingRoleUser.full_name}</span> as
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="h-9 rounded-xl bg-white flex-1 text-sm">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  disabled={!inviteRole || isInviting}
                  onClick={handleConfirmRoleInvite}
                  className={cn("h-9 rounded-full px-4 shrink-0", PRIMARY_BTN)}
                >
                  {isInviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm"}
                </Button>
              </div>
            </div>
          )}

          {/* Minimal footer */}
          <div className="border-t border-[#f0f0f0] px-4 py-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCreateNew}
              className="text-xs sm:text-sm font-medium text-[#82298D] hover:underline underline-offset-2"
            >
              Create new instead
            </button>
            {lockedRole && (
              <span className="text-[11px] text-[#9ca3af] truncate">
                as {getRoleDisplayLabel(lockedRole)}
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
