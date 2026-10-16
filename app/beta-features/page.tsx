"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  listBetaFeatures,
  listGlobalBetaUsers,
  searchBetaUsers,
  syncGlobalBetaUsers,
  updateBetaFeatureStatus,
  type BetaFeatureRow,
  type BetaFeatureUser,
  type BetaUserSearchResult,
} from "@/lib/api/beta-features"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

function formatUserLabel(user: { first_name?: string; last_name?: string; email?: string; full_name?: string }) {
  const name =
    user.full_name?.trim() ||
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
    "—"
  return { name, email: user.email?.trim() || "" }
}

export default function BetaFeaturesPage() {
  const { toast } = useToast()
  const [features, setFeatures] = useState<BetaFeatureRow[]>([])
  const [loading, setLoading] = useState(true)
  const [allowlist, setAllowlist] = useState<BetaFeatureUser[]>([])
  const [allowlistLoading, setAllowlistLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingKey, setTogglingKey] = useState<string | null>(null)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<BetaUserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const loadFeatures = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listBetaFeatures()
      setFeatures(data.features)
    } catch (error) {
      toast({
        title: "Unable to load beta features",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadAllowlist = useCallback(async () => {
    setAllowlistLoading(true)
    try {
      const data = await listGlobalBetaUsers()
      setAllowlist(data.users ?? [])
    } catch (error) {
      toast({
        title: "Unable to load beta testers",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setAllowlistLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadFeatures()
    void loadAllowlist()
  }, [loadFeatures, loadAllowlist])

  useEffect(() => {
    if (!pickerOpen) {
      setSearchTerm("")
      setSearchResults([])
      setHasSearched(false)
      setIsSearching(false)
      return
    }

    const q = searchTerm.trim()
    if (q.length < 2) {
      setSearchResults([])
      setHasSearched(false)
      setIsSearching(false)
      return
    }

    let cancelled = false
    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      try {
        const users = await searchBetaUsers(q)
        if (!cancelled) {
          setSearchResults(users)
          setHasSearched(true)
        }
      } catch (error) {
        if (!cancelled) {
          setSearchResults([])
          setHasSearched(true)
          toast({
            title: "Couldn't search users",
            description: error instanceof Error ? error.message : "Please try again.",
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
  }, [searchTerm, pickerOpen, toast])

  const allowlistedIds = new Set(allowlist.map((u) => u.id))

  const handleToggleLive = async (feature: BetaFeatureRow, makeLive: boolean) => {
    setTogglingKey(feature.key)
    try {
      const updated = await updateBetaFeatureStatus(feature.key, makeLive ? "ga" : "beta")
      setFeatures((prev) =>
        prev.map((f) =>
          f.key === updated.key
            ? {
                ...f,
                ...updated,
                is_live: updated.rollout_status === "ga",
              }
            : f
        )
      )
      toast({
        title: makeLive ? "Feature is live" : "Feature is in beta",
        description: `${updated.name} is now ${makeLive ? "live for everyone" : "beta (testers only)"}.`,
      })
    } catch (error) {
      toast({
        title: "Unable to update feature",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setTogglingKey(null)
    }
  }

  const persistAllowlist = async (nextUsers: BetaFeatureUser[]) => {
    setSaving(true)
    try {
      const result = await syncGlobalBetaUsers(nextUsers.map((u) => u.id))
      setAllowlist(result.users ?? [])
      toast({ title: "Beta testers saved" })
    } catch (error) {
      toast({
        title: "Unable to save beta testers",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSelectUser = async (user: BetaUserSearchResult) => {
    if (allowlistedIds.has(user.id)) {
      toast({ title: "User already a beta tester" })
      setPickerOpen(false)
      return
    }
    const { name } = formatUserLabel(user)
    const next: BetaFeatureUser[] = [
      ...allowlist,
      {
        id: user.id,
        first_name: user.first_name || name.split(" ")[0] || "",
        last_name: user.last_name || "",
        email: user.email,
      },
    ]
    setPickerOpen(false)
    await persistAllowlist(next)
    await loadAllowlist()
  }

  const handleRemoveUser = async (userId: number) => {
    await persistAllowlist(allowlist.filter((u) => u.id !== userId))
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-[#1A1A1A] mb-0.5">Beta Features</h1>
      <p className="text-xs text-[#545F71] mb-5 leading-relaxed">
        Add beta testers once. Features in <span className="font-medium">Beta</span> are visible only
        to those testers (and superadmin). Flip a feature to{" "}
        <span className="font-medium">Live</span> to open it for everyone.
      </p>

      {loading ? (
        <p className="text-xs text-[#545F71]">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <section className="rounded-lg border border-[#E5E5E5] bg-white px-4 py-3.5">
              <div className="mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#545F71]">
                  Beta testers
                </p>
                <p className="text-[11px] text-[#9BA5B7] mt-0.5">
                  Shared for all beta features · {allowlist.length} user
                  {allowlist.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="mb-3">
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      role="combobox"
                      aria-expanded={pickerOpen}
                      disabled={saving}
                      className={cn(
                        "flex h-9 w-full max-w-md items-center justify-between gap-2 rounded-md border border-[#E5E5E5] bg-white px-3 text-left text-xs",
                        "hover:bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#1162A8]/40",
                        "disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                    >
                      <span className="truncate text-[#9BA5B7]">
                        Search users by name or email…
                      </span>
                      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false} className="overflow-hidden">
                      <CommandInput
                        placeholder="Type at least 2 characters…"
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                      />
                      <CommandList className="max-h-[280px]">
                        {isSearching ? (
                          <div className="flex items-center gap-2 px-3 py-4 text-[11px] text-[#545F71]">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Searching…
                          </div>
                        ) : null}
                        {!isSearching && searchTerm.trim().length < 2 ? (
                          <CommandEmpty>Type a name or email to search.</CommandEmpty>
                        ) : null}
                        {!isSearching && hasSearched && searchResults.length === 0 ? (
                          <CommandEmpty>No users found.</CommandEmpty>
                        ) : null}
                        {!isSearching && searchResults.length > 0 ? (
                          <CommandGroup>
                            {searchResults.map((user) => {
                              const { name, email } = formatUserLabel(user)
                              const already = allowlistedIds.has(user.id)
                              return (
                                <CommandItem
                                  key={user.id}
                                  value={`${user.id} ${name} ${email}`}
                                  disabled={already || saving}
                                  onSelect={() => void handleSelectUser(user)}
                                  className="items-start py-2"
                                >
                                  <Check
                                    className={cn(
                                      "mt-0.5 mr-2 h-3.5 w-3.5 shrink-0",
                                      already ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-xs font-medium text-[#1A1A1A] truncate">
                                      {name}
                                      <span className="ml-1.5 font-normal text-[#9BA5B7]">#{user.id}</span>
                                    </span>
                                    <span className="block text-[11px] text-[#545F71] truncate">
                                      {email}
                                      {already ? " · already added" : ""}
                                    </span>
                                  </span>
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        ) : null}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {allowlistLoading ? (
                <p className="text-[11px] text-[#545F71]">Loading testers…</p>
              ) : allowlist.length === 0 ? (
                <p className="text-[11px] text-[#9BA5B7]">
                  No beta testers yet. Search and select a user above.
                </p>
              ) : (
                <ul className="divide-y divide-[#F0F0F0] rounded-md border border-[#EFEFEF]">
                  {allowlist.map((u) => {
                    const { name, email } = formatUserLabel(u)
                    return (
                      <li
                        key={u.id}
                        className="flex items-center justify-between gap-3 px-2.5 py-1.5 text-[11px]"
                      >
                        <span className="min-w-0 truncate text-[#374151]">
                          <span className="font-medium text-[#1A1A1A]">{name}</span>{" "}
                          <span className="text-[#9BA5B7]">#{u.id}</span>
                          {email ? <span className="text-[#9BA5B7]"> · {email}</span> : null}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px] text-[#CF0202] shrink-0"
                          disabled={saving}
                          onClick={() => void handleRemoveUser(u.id)}
                        >
                          Remove
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
          </section>

          <section className="rounded-lg border border-[#E5E5E5] bg-white overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#EFEFEF]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#545F71]">
                Features
              </p>
            </div>

            {features.length === 0 ? (
              <p className="px-4 py-4 text-[11px] text-[#9BA5B7]">No beta features configured.</p>
            ) : (
              <ul className="divide-y divide-[#F0F0F0]">
                {features.map((feature) => {
                  const isLive =
                    feature.is_live === true || feature.rollout_status === "ga"
                  const busy = togglingKey === feature.key

                  return (
                    <li
                      key={feature.key}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[#1A1A1A] leading-snug truncate">
                          {feature.name}
                        </p>
                        <p className="text-[10px] text-[#9BA5B7] mt-0.5 font-mono truncate">
                          {feature.key}
                        </p>
                        {feature.description ? (
                          <p className="text-[11px] text-[#545F71] mt-1 leading-snug line-clamp-2">
                            {feature.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-medium uppercase tracking-wide ${
                            isLive ? "text-[#1162A8]" : "text-[#9BA5B7]"
                          }`}
                        >
                          {isLive ? "Live" : "Beta"}
                        </span>
                        <Switch
                          checked={isLive}
                          disabled={busy}
                          onCheckedChange={(checked) => void handleToggleLive(feature, checked)}
                          aria-label={`Toggle ${feature.name} live`}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

        </div>
      )}
    </div>
  )
}
