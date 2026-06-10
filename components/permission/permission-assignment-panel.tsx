"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, Search } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  defaultPermissionsForRole,
  filterGroupedForActiveContext,
  isLabRoleName,
  isOfficeRoleName,
} from "@/lib/permissions"
import { normalizeRoleSlug } from "@/lib/role-utils"

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

export type PermissionAssignmentPanelProps = {
  /** When set, loads role_permissions + direct_permissions from GET /users/{id}/permissions */
  userId?: number
  /** Used for default template when userId is absent (create flow) */
  role?: string
  /** `role` = edit a Spatie role bundle (no user template / locked role rows) */
  variant?: "user" | "role"
  selected: string[]
  onChange: (selected: string[]) => void
  readOnly?: boolean
  className?: string
}

export function PermissionAssignmentPanel({
  userId,
  role = "",
  variant = "user",
  selected,
  onChange,
  readOnly = false,
  className,
}: PermissionAssignmentPanelProps) {
  const normalizedRole = normalizeRoleSlug(role)
  const { getAvailablePermissions, isSuperadmin } = useAuth()
  const { toast } = useToast()
  const [grouped, setGrouped] = useState<Record<string, string[]>>({})
  const [labRoleBundle, setLabRoleBundle] = useState<string[]>([])
  const [rolePermissions, setRolePermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      try {
        const catalog = await getAvailablePermissions()
        if (cancelled) return
        setGrouped(catalog.grouped ?? {})
        setLabRoleBundle(catalog.lab_role_bundle ?? [])
      } catch (error: unknown) {
        if (!cancelled) {
          toast({
            title: "Failed to load permission catalog",
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

  useEffect(() => {
    if (variant === "role") return
    if (!userId) {
      const template = defaultPermissionsForRole(normalizedRole, labRoleBundle)
      setRolePermissions(template)
      if (template.length > 0 && selected.length === 0) {
        onChange(template)
      }
      return
    }

    let cancelled = false
    const loadUser = async () => {
      try {
        const { fetchUserPermissionDetail } = await import("@/lib/api/user-permissions-api")
        const detail = await fetchUserPermissionDetail(userId)
        if (cancelled) return
        setRolePermissions(detail.role_permissions ?? [])
        if (selected.length === 0) {
          onChange(detail.all_permissions ?? [])
        }
      } catch (error: unknown) {
        if (!cancelled) {
          toast({
            title: "Failed to load user permissions",
            description: error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          })
        }
      }
    }

    loadUser()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, normalizedRole, labRoleBundle.join(","), variant])

  useEffect(() => {
    if (variant === "role") return
    if (userId || !normalizedRole || labRoleBundle.length === 0) return
    const template = defaultPermissionsForRole(normalizedRole, labRoleBundle)
    setRolePermissions(template)
    onChange(template)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedRole, labRoleBundle.join(","), userId, variant])

  const rolePermissionSet = useMemo(() => new Set(rolePermissions), [rolePermissions])
  const selectedSet = useMemo(() => new Set(selected), [selected])

  const scopedGrouped = useMemo(() => {
    if (variant === "role" && isSuperadmin) return grouped
    return filterGroupedForActiveContext(grouped, labRoleBundle, isSuperadmin)
  }, [grouped, labRoleBundle, isSuperadmin, variant])

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

  const togglePermission = (permission: string, checked: boolean) => {
    if (readOnly) return
    if (!checked && rolePermissionSet.has(permission)) return

    const next = new Set(selected)
    if (checked) next.add(permission)
    else next.delete(permission)
    onChange(Array.from(next).sort())
  }

  const selectAllInGroup = (permissions: string[]) => {
    if (readOnly) return
    const next = new Set(selected)
    permissions.forEach((p) => next.add(p))
    onChange(Array.from(next).sort())
  }

  const clearExtrasInGroup = (permissions: string[]) => {
    if (readOnly) return
    const next = new Set(selected)
    permissions.forEach((p) => {
      if (!rolePermissionSet.has(p)) next.delete(p)
    })
    onChange(Array.from(next).sort())
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading permissions...
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="mb-4 space-y-2">
        <p className="text-sm text-muted-foreground">
          Permissions checked from the user&apos;s <strong>role</strong> cannot be removed here.
          Additional checks are saved as <strong>direct permissions</strong> via{" "}
          <code className="text-xs">PUT /users/&#123;id&#125;/permissions</code>.
        </p>
        {normalizedRole && !userId && isLabRoleName(normalizedRole) && (
          <p className="text-xs text-muted-foreground">
            Role <code className="font-mono">{normalizedRole}</code> defaults to the lab permission
            bundle from the backend.
          </p>
        )}
        {normalizedRole && !userId && isOfficeRoleName(normalizedRole) && (
          <p className="text-xs text-muted-foreground">
            Office role <code className="font-mono">{normalizedRole}</code> receives permissions from
            the backend when the user is created. After save, open the user again to see role grants
            loaded from the API; use the checkboxes below for extra direct permissions only.
          </p>
        )}
        {normalizedRole && userId && isOfficeRoleName(normalizedRole) && (
          <p className="text-xs text-muted-foreground">
            Role permissions for <code className="font-mono">{normalizedRole}</code> are loaded from{" "}
            <code className="text-xs">GET /users/&#123;id&#125;/permissions</code>.
          </p>
        )}
      </div>

      <div className="relative max-w-md mb-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search permissions..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={readOnly}
        />
      </div>

      <div className="space-y-6 max-h-[28rem] overflow-y-auto pr-1">
        {filteredGroups.map(([group, permissions]) => (
          <div key={group} className="space-y-2">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-semibold">
                {formatGroupLabel(group)}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({permissions.length})
                </span>
              </h4>
              {!readOnly && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => selectAllInGroup(permissions)}
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => clearExtrasInGroup(permissions)}
                  >
                    Clear extras
                  </Button>
                </div>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {permissions.map((permission) => {
                const fromRole = rolePermissionSet.has(permission)
                const checked = selectedSet.has(permission)
                const disabled = readOnly || fromRole

                return (
                  <div
                    key={permission}
                    className={`flex items-start gap-2 rounded-md border p-2.5 ${
                      fromRole ? "bg-muted/50 border-muted" : "bg-background"
                    }`}
                  >
                    <Checkbox
                      id={`perm-${permission}`}
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={(value) => togglePermission(permission, value === true)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <Label
                        htmlFor={`perm-${permission}`}
                        className={`text-sm leading-tight ${disabled ? "cursor-default" : "cursor-pointer"}`}
                      >
                        {formatPermissionLabel(permission)}
                        {fromRole && (
                          <span className="ml-1 text-[10px] uppercase text-muted-foreground">
                            (role)
                          </span>
                        )}
                      </Label>
                      <p className="text-[11px] text-muted-foreground font-mono break-all">
                        {permission}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
