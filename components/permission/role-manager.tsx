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
import { Search, Shield, Loader2, Eye, Edit } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { PermissionAssignmentPanel } from "@/components/permission/permission-assignment-panel"
import {
  LAB_ROLE_NAMES,
  OFFICE_ROLE_NAMES,
  roleNamesForActiveContext,
  profileScopeLabel,
} from "@/lib/permissions"
import {
  fetchBackendRoles,
  updateBackendRolePermissions,
  type BackendRole,
} from "@/lib/api/role-permissions-api"

function formatRoleLabel(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export function RoleManager() {
  const { getAvailablePermissions, isSuperadmin } = useAuth()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [labRoleNames, setLabRoleNames] = useState<string[]>([])
  const [labRoleBundle, setLabRoleBundle] = useState<string[]>([])
  const [backendRoles, setBackendRoles] = useState<BackendRole[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewRole, setViewRole] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<BackendRole | null>(null)
  const [editingPermissions, setEditingPermissions] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const catalog = await getAvailablePermissions()
      setLabRoleNames(catalog.lab_role_names ?? [])
      setLabRoleBundle(catalog.lab_role_bundle ?? [])

      if (isSuperadmin) {
        const roles = await fetchBackendRoles()
        setBackendRoles(roles)
      }
    } catch (error: unknown) {
      toast({
        title: "Failed to load roles",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [getAvailablePermissions, isSuperadmin, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const backendRoleByName = useMemo(() => {
    const map = new Map<string, BackendRole>()
    backendRoles.forEach((role) => map.set(role.name, role))
    return map
  }, [backendRoles])

  const roles = useMemo(() => {
    const labNames = labRoleNames.length > 0 ? labRoleNames : ["lab_admin", "lab_user"]
    const labRows = labNames.map((name) => {
      const backend = backendRoleByName.get(name)
      const permissionNames = backend?.permissions?.map((p) => p.name) ?? labRoleBundle
      return {
        name,
        scope: "lab" as const,
        backendId: backend?.id,
        permissionCount: permissionNames.length,
        description: isSuperadmin
          ? "Edit the global Spatie role permissions (superadmin)."
          : "Lab roles share the lab_role_bundle from the permissions catalog.",
      }
    })

    const officeRows = OFFICE_ROLE_NAMES.map((name) => {
      const backend = backendRoleByName.get(name)
      const permissionNames = backend?.permissions?.map((p) => p.name) ?? []
      return {
        name,
        scope: "office" as const,
        backendId: backend?.id,
        permissionCount: permissionNames.length || null,
        description: isSuperadmin
          ? "Edit office role permissions globally via PUT /role-permissions/roles/{id}."
          : "Office role permissions are assigned on the customer pivot; add per-user extras separately.",
      }
    })

    const combined = [...labRows, ...officeRows]
    const allowed = roleNamesForActiveContext(isSuperadmin)
    if (!allowed) return combined
    return combined.filter((row) => allowed.includes(row.name))
  }, [labRoleNames, labRoleBundle, backendRoleByName, isSuperadmin])

  const visibleProfileRoles = useMemo(() => {
    const allowed = roleNamesForActiveContext(isSuperadmin)
    if (!allowed) return [...LAB_ROLE_NAMES, ...OFFICE_ROLE_NAMES]
    return [...allowed]
  }, [isSuperadmin])

  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const openEditRole = (roleName: string) => {
    const backend = backendRoleByName.get(roleName)
    if (!backend) return
    setEditingRole(backend)
    setEditingPermissions(backend.permissions?.map((p) => p.name) ?? [])
  }

  const saveRolePermissions = async () => {
    if (!editingRole) return
    setIsSaving(true)
    try {
      await updateBackendRolePermissions(editingRole.id, editingPermissions)
      toast({ title: "Role updated", description: `Permissions saved for ${editingRole.name}.` })
      setEditingRole(null)
      await loadData()
    } catch (error: unknown) {
      toast({
        title: "Failed to update role",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const scopeLabel = profileScopeLabel()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Role permissions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isSuperadmin
            ? "Superadmin can sync role bundles via PUT /role-permissions/roles/{id}."
            : `${scopeLabel} roles for this profile. Lab roles use lab_role_bundle from the permissions catalog.`}
        </p>
      </div>

      <div className="flex flex-col space-y-4">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search roles..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="rounded-md border">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading roles...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          No roles found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRoles.map((role) => (
                        <TableRow key={role.name}>
                          <TableCell className="font-medium font-mono text-sm">
                            {role.name}
                          </TableCell>
                          <TableCell>{formatRoleLabel(role.scope)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-md">
                            {role.description}
                          </TableCell>
                          <TableCell>
                            {role.permissionCount != null ? (
                              <div className="flex items-center">
                                <Shield className="h-4 w-4 mr-2 text-blue-500" />
                                {role.permissionCount}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {role.scope === "lab" && labRoleBundle.length > 0 && !isSuperadmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewRole(role.name)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View bundle
                              </Button>
                            )}
                            {isSuperadmin && role.backendId != null && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditRole(role.name)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Roles for this {scopeLabel.toLowerCase()} profile:{" "}
              {visibleProfileRoles.map((r) => (
                <code key={r} className="mr-1">
                  {r}
                </code>
              ))}
            </p>
          </div>

      <Dialog open={viewRole != null} onOpenChange={(open) => !open && setViewRole(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lab role bundle — {viewRole}</DialogTitle>
            <DialogDescription>
              Catalog default for lab roles ({labRoleNames.join(", ") || "lab_admin, lab_user"}).
            </DialogDescription>
          </DialogHeader>
          <PermissionAssignmentPanel
            variant="role"
            role="lab_admin"
            selected={labRoleBundle}
            onChange={() => {}}
            readOnly
          />
        </DialogContent>
      </Dialog>

      {editingRole && (
        <Dialog open onOpenChange={(open) => !open && setEditingRole(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit role — {editingRole.name}</DialogTitle>
              <DialogDescription>
                Updates global permissions for this role via{" "}
                <code className="text-xs">PUT /role-permissions/roles/&#123;id&#125;</code>.
              </DialogDescription>
            </DialogHeader>
            <PermissionAssignmentPanel
              variant="role"
              role={editingRole.name}
              selected={editingPermissions}
              onChange={setEditingPermissions}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRole(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={saveRolePermissions} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save role permissions"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
