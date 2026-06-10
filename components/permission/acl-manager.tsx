"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Search, Shield, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { filterGroupedForActiveContext, profileScopeLabel } from "@/lib/permissions"

function formatGroupLabel(key: string): string {
  return key
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatPermissionLabel(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function ACLManager() {
  const { getAvailablePermissions, isSuperadmin } = useAuth()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [grouped, setGrouped] = useState<Record<string, string[]>>({})
  const [labRoleBundle, setLabRoleBundle] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      try {
        const data = await getAvailablePermissions()
        if (cancelled) return
        setGrouped(data.grouped ?? {})
        setLabRoleBundle(data.lab_role_bundle ?? [])
      } catch (error: unknown) {
        if (!cancelled) {
          toast({
            title: "Failed to load permissions",
            description: error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [getAvailablePermissions, toast])

  const scopeLabel = profileScopeLabel()

  const scopedGrouped = useMemo(
    () => filterGroupedForActiveContext(grouped, labRoleBundle, isSuperadmin),
    [grouped, labRoleBundle, isSuperadmin],
  )

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const entries = Object.entries(scopedGrouped)

    if (!query) return entries

    return entries
      .map(([group, permissions]) => {
        const matching = permissions.filter(
          (p) => p.toLowerCase().includes(query) || group.toLowerCase().includes(query),
        )
        return [group, matching] as [string, string[]]
      })
      .filter(([, permissions]) => permissions.length > 0)
  }, [scopedGrouped, searchQuery])

  const totalCount = useMemo(
    () => Object.values(scopedGrouped).reduce((sum, list) => sum + list.length, 0),
    [scopedGrouped],
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Permission catalog
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {scopeLabel} permissions from{" "}
          <code className="text-xs">GET /users/permissions/available</code> ({totalCount}{" "}
          shown). Use these keys in sidebar and guards.
        </p>
      </div>

      <div className="flex flex-col space-y-6">
            <div className="relative max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search permissions or groups..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading permission catalog...
              </div>
            ) : filteredGroups.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No permissions found.</p>
            ) : (
              <div className="space-y-8">
                {filteredGroups.map(([group, permissions]) => (
                  <div key={group} className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground border-b pb-2">
                      {formatGroupLabel(group)}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({permissions.length})
                      </span>
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {permissions.map((permission) => (
                        <div
                          key={permission}
                          className="flex items-start gap-2 rounded-md border p-3 bg-muted/30"
                        >
                          <Checkbox
                            id={permission}
                            checked={labRoleBundle.includes(permission)}
                            disabled
                            className="mt-0.5"
                          />
                          <div className="min-w-0">
                            <Label
                              htmlFor={permission}
                              className="text-sm font-medium leading-tight cursor-default"
                            >
                              {formatPermissionLabel(permission)}
                            </Label>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5 break-all">
                              {permission}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
    </div>
  )
}
