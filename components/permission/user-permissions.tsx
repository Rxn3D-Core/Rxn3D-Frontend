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
import { persistUserDirectPermissions } from "@/lib/api/user-permissions-api"
import { roleMatchesActiveContext, profileScopeLabel } from "@/lib/permissions"

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

function deriveUserRole(apiUser: Record<string, unknown>): string {
  const selectedCustomerId = Number(localStorage.getItem("customerId") || 0)
  const customerUsers = Array.isArray(apiUser.customer_users) ? apiUser.customer_users : []
  const scoped = selectedCustomerId
    ? customerUsers.filter(
        (cu: Record<string, unknown>) =>
          Number(cu?.customer_id ?? (cu?.customer as Record<string, unknown>)?.id) === selectedCustomerId,
      )
    : customerUsers
  const source = scoped.length > 0 ? scoped : customerUsers

  const roleName =
    source
      .map((cu: Record<string, unknown>) => extractRoleName(cu?.role))
      .find(Boolean) ||
    extractRoleName((apiUser.roles as unknown[])?.[0]) ||
    extractRoleName(apiUser.role) ||
    "user"

  return roleName
}

function formatRoleLabel(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export function UserPermissions() {
  const { fetchUsers, hasAnyPermission, isSuperadmin } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<StaffRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<StaffRow | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const canEdit = hasAnyPermission(["manage_users", "edit_user"])

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

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const openPermissionsDialog = (user: StaffRow) => {
    setSelectedUser(user)
    setSelectedPermissions([])
    setIsEditDialogOpen(true)
  }

  const savePermissions = async () => {
    if (!selectedUser) return
    setIsSaving(true)
    try {
      await persistUserDirectPermissions(selectedUser.id, selectedPermissions)
      toast({
        title: "Permissions saved",
        description: `Updated direct permissions for ${selectedUser.name}.`,
      })
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">User permissions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Assign extra direct permissions for users on this {scopeLabel.toLowerCase()} profile. Role
          permissions cannot be removed here.
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
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                              {formatRoleLabel(user.role)}
                            </span>
                          </TableCell>
                          <TableCell>{user.status}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!canEdit}
                              onClick={() => openPermissionsDialog(user)}
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
                {selectedUser.name} — role{" "}
                <code className="text-xs">{selectedUser.role}</code>
              </DialogDescription>
            </DialogHeader>
            <PermissionAssignmentPanel
              key={selectedUser.id}
              userId={selectedUser.id}
              role={selectedUser.role}
              selected={selectedPermissions}
              onChange={setSelectedPermissions}
              readOnly={!canEdit}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={savePermissions} disabled={!canEdit || isSaving}>
                {isSaving ? "Saving..." : "Save permissions"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
