"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Shield, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { PermissionAssignmentPanel } from "@/components/permission/permission-assignment-panel"
import { persistUserPermissions } from "@/lib/api/user-permissions-api"
import { getActiveCustomerId } from "@/lib/customer-scope"
import {
  customerProfilesFromUser,
  profileScopeLabel,
  type UserCustomerProfileOption,
} from "@/lib/permissions"

type StaffRow = {
  id: number
  name: string
  email: string
  role: string
  status: string
}

function extractRoleName(role: unknown): string | undefined {
  if (typeof role === "string") return role
  if (role && typeof role === "object" && "name" in role) {
    return String((role as { name: string }).name)
  }
  return undefined
}

function deriveUserRole(apiUser: Record<string, unknown>, customerId?: number): string {
  const profiles = customerProfilesFromUser(apiUser)
  if (customerId) {
    const match = profiles.find((profile) => profile.id === customerId)
    if (match) return match.role
  }
  if (profiles.length > 0) return profiles[0].role

  return (
    extractRoleName((apiUser.roles as unknown[])?.[0]) ||
    extractRoleName(apiUser.role) ||
    "user"
  )
}

function formatRoleLabel(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function formatProfileLabel(profile: UserCustomerProfileOption): string {
  const typeLabel = profile.type ? `${profile.type} · ` : ""
  return `${profile.name} (${typeLabel}${formatRoleLabel(profile.role)})`
}

export function UserPermissions() {
  const {
    user,
    fetchUsers,
    fetchUserById,
    hasPermission,
    isSuperadmin,
    refreshProfilePermissions,
  } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<StaffRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<StaffRow | null>(null)
  const [selectedOverrides, setSelectedOverrides] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [customerProfiles, setCustomerProfiles] = useState<UserCustomerProfileOption[]>([])
  const [permissionCustomerId, setPermissionCustomerId] = useState<string>("")
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false)

  const canEdit = isSuperadmin || hasPermission("update_role")
  const activeCustomerId = getActiveCustomerId()
  const needsCustomerPicker = isSuperadmin || !activeCustomerId

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetchUsers({})
      const rows: StaffRow[] = (response.data ?? []).map((apiUser: Record<string, unknown>) => {
        const role = deriveUserRole(apiUser)
        return {
          id: Number(apiUser.id),
          name:
            `${apiUser.first_name ?? ""} ${apiUser.last_name ?? ""}`.trim() ||
            String(apiUser.email ?? ""),
          email: String(apiUser.email ?? ""),
          role,
          status: String(apiUser.status ?? ""),
        }
      })
      setUsers(rows)
    } catch (error: unknown) {
      toast({
        title: "Failed to load users",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [fetchUsers, toast])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const roleOptions = useMemo(() => {
    const roles = new Set(users.map((u) => u.role).filter(Boolean))
    return Array.from(roles).sort()
  }, [users])

  const filteredUsers = users.filter((staff) => {
    const matchesSearch =
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === "all" || staff.role === roleFilter
    return matchesSearch && matchesRole
  })

  const selectedProfile = useMemo(
    () => customerProfiles.find((p) => String(p.id) === permissionCustomerId),
    [customerProfiles, permissionCustomerId],
  )

  const effectiveCustomerId = needsCustomerPicker ? permissionCustomerId : activeCustomerId ?? ""

  const openPermissionsDialog = async (staff: StaffRow) => {
    if (staff.role === "lab_admin" && !isSuperadmin) {
      toast({
        title: "Cannot edit permissions",
        description: "lab_admin users cannot receive per-user overrides.",
        variant: "destructive",
      })
      return
    }

    setSelectedUser(staff)
    setSelectedOverrides([])
    setPermissionCustomerId("")
    setCustomerProfiles([])
    setIsEditDialogOpen(true)

    if (!needsCustomerPicker && activeCustomerId) {
      setPermissionCustomerId(activeCustomerId)
      return
    }

    setIsLoadingProfiles(true)
    try {
      const response = await fetchUserById(staff.id)
      const apiUser = (response?.data ?? response) as Record<string, unknown>
      const profiles = customerProfilesFromUser(apiUser)
      setCustomerProfiles(profiles)

      if (profiles.length === 1) {
        setPermissionCustomerId(String(profiles[0].id))
      } else if (profiles.length === 0) {
        toast({
          title: "No customer profiles",
          description: "This user is not linked to any lab or office profile.",
          variant: "destructive",
        })
      }
    } catch (error: unknown) {
      toast({
        title: "Failed to load customer profiles",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingProfiles(false)
    }
  }

  const savePermissions = async () => {
    if (!selectedUser) return
    if (!effectiveCustomerId) {
      toast({
        title: "Select a customer profile",
        description: "Choose which lab or office these permission overrides apply to.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      await persistUserPermissions(
        selectedUser.id,
        selectedOverrides,
        effectiveCustomerId,
      )
      toast({
        title: "Permissions saved",
        description: isSuperadmin
          ? `Updated override permissions for ${selectedUser.name} on ${selectedProfile?.name ?? "selected profile"}.`
          : `Updated override permissions for ${selectedUser.name}.`,
      })
      if (user?.id === selectedUser.id) {
        await refreshProfilePermissions(effectiveCustomerId).catch(() => {})
      }
      setIsEditDialogOpen(false)
    } catch (error: unknown) {
      toast({
        title: "Failed to save permissions",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()

  const scopeLabel = profileScopeLabel()
  const roleForPanel = selectedProfile?.role ?? selectedUser?.role ?? ""

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">User permissions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isSuperadmin
            ? "Pick the user's lab or office profile, then assign override permissions for that profile only."
            : `Assign override permissions for users on this ${scopeLabel.toLowerCase()} profile (lab_admin excluded). Role template grants cannot be removed here.`}
        </p>
      </div>

      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search users..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full md:w-1/4">
            <Label className="text-sm font-medium">Role</Label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {formatRoleLabel(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading users...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{getInitials(staff.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{staff.name}</div>
                            <div className="text-sm text-muted-foreground">{staff.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                          {formatRoleLabel(staff.role)}
                        </span>
                      </TableCell>
                      <TableCell>{staff.status}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!canEdit || (staff.role === "lab_admin" && !isSuperadmin)}
                          onClick={() => openPermissionsDialog(staff)}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Permissions
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {selectedUser && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage permissions</DialogTitle>
              <DialogDescription>
                {selectedUser.name}
                {selectedProfile
                  ? ` — ${formatProfileLabel(selectedProfile)}`
                  : ` — role ${selectedUser.role}`}
              </DialogDescription>
            </DialogHeader>

            {needsCustomerPicker && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Customer profile</Label>
                {isLoadingProfiles ? (
                  <div className="flex items-center text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading profiles...
                  </div>
                ) : customerProfiles.length === 0 ? (
                  <p className="text-sm text-destructive">
                    No lab or office profiles found for this user.
                  </p>
                ) : (
                  <Select
                    value={permissionCustomerId}
                    onValueChange={(value) => {
                      setPermissionCustomerId(value)
                      setSelectedOverrides([])
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lab or office..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customerProfiles.map((profile) => (
                        <SelectItem key={profile.id} value={String(profile.id)}>
                          {formatProfileLabel(profile)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  Overrides apply only on the selected profile (e.g. Lab 1 vs Office 2).
                </p>
              </div>
            )}

            {effectiveCustomerId ? (
              <PermissionAssignmentPanel
                key={`${selectedUser.id}-${effectiveCustomerId}`}
                userId={selectedUser.id}
                customerId={effectiveCustomerId}
                role={roleForPanel}
                selected={selectedOverrides}
                onChange={setSelectedOverrides}
                readOnly={!canEdit}
              />
            ) : (
              !isLoadingProfiles && (
                <p className="text-sm text-muted-foreground py-4">
                  Select a customer profile to load and edit permissions.
                </p>
              )
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={savePermissions}
                disabled={!canEdit || isSaving || !effectiveCustomerId}
              >
                {isSaving ? "Saving..." : "Save permissions"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
