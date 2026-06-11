"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, Shield, Loader2, Edit } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { PermissionAssignmentPanel } from "@/components/permission/permission-assignment-panel"
import {
  isLabEditableRoleName,
  LAB_EDITABLE_ROLE_NAMES,
  profileScopeLabel,
} from "@/lib/permissions"
import { getActiveCustomerId } from "@/lib/customer-scope"
import {
  fetchBackendRoles,
  fetchCustomerRolePermissions,
  updateBackendRolePermissions,
  updateCustomerRolePermissions,
  type BackendRole,
  type CustomerRoleTemplate,
} from "@/lib/api/role-permissions-api"

function formatRoleLabel(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export function RoleManager() {
  const { getAvailablePermissions, isSuperadmin, refreshProfilePermissions } = useAuth()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [labRoleBundle, setLabRoleBundle] = useState<string[]>([])
  const [customerRoles, setCustomerRoles] = useState<CustomerRoleTemplate[]>([])
  const [backendRoles, setBackendRoles] = useState<BackendRole[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingRole, setEditingRole] = useState<CustomerRoleTemplate | null>(null)
  const [editingBackendRole, setEditingBackendRole] = useState<BackendRole | null>(null)
  const [editingPermissions, setEditingPermissions] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const labCustomerId = useMemo(() => {
    const id = getActiveCustomerId()
    return id ? Number(id) : null
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const catalog = await getAvailablePermissions(
        labCustomerId != null ? String(labCustomerId) : undefined,
      )
      setLabRoleBundle(catalog.lab_role_bundle ?? [])

      if (isSuperadmin) {
        const roles = await fetchBackendRoles()
        setBackendRoles(roles)
        setCustomerRoles([])
      } else if (labCustomerId != null) {
        const list = await fetchCustomerRolePermissions(labCustomerId)
        setCustomerRoles(
          list.roles.filter((role) => isLabEditableRoleName(role.name)),
        )
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
  }, [getAvailablePermissions, isSuperadmin, labCustomerId, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const superadminRows = useMemo(
    () =>
      backendRoles
        .filter((role) => (LAB_EDITABLE_ROLE_NAMES as readonly string[]).includes(role.name) || role.name === "lab_admin")
        .map((backend) => ({
          id: backend.id,
          name: backend.name,
          permissions: backend.permissions?.map((p) => p.name) ?? [],
          is_customized: true,
          scope: "global" as const,
        })),
    [backendRoles],
  )

  const rows = isSuperadmin
    ? superadminRows
    : customerRoles.map((role) => ({ ...role, scope: "lab" as const }))

  const filteredRoles = rows.filter(
    (role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatRoleLabel(role.name).toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const openEditLabRole = (role: CustomerRoleTemplate) => {
    setEditingRole(role)
    setEditingPermissions(role.permissions ?? [])
  }

  const openEditSuperadminRole = (role: BackendRole) => {
    setEditingBackendRole(role)
    setEditingPermissions(role.permissions?.map((p) => p.name) ?? [])
  }

  const saveLabRolePermissions = async () => {
    if (!editingRole || labCustomerId == null) return
    setIsSaving(true)
    try {
      await updateCustomerRolePermissions(labCustomerId, editingRole.id, editingPermissions)
      toast({
        title: "Role template saved",
        description: `Permissions updated for ${formatRoleLabel(editingRole.name)} on this lab.`,
      })
      setEditingRole(null)
      await loadData()
      await refreshProfilePermissions(String(labCustomerId)).catch(() => {})
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

  const saveSuperadminRolePermissions = async () => {
    if (!editingBackendRole) return
    setIsSaving(true)
    try {
      await updateBackendRolePermissions(editingBackendRole.id, editingPermissions)
      toast({ title: "Role updated", description: `Global permissions saved for ${editingBackendRole.name}.` })
      setEditingBackendRole(null)
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
            ? "Superadmin can sync global role bundles via PUT /role-permissions/roles/{id}."
            : `Per-lab templates for ${LAB_EDITABLE_ROLE_NAMES.join(" and ")} on this ${scopeLabel.toLowerCase()}. lab_admin is locked.`}
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
                  <TableHead>Status</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No editable roles found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoles.map((role) => (
                    <TableRow key={`${role.scope}-${role.id}-${role.name}`}>
                      <TableCell className="font-medium font-mono text-sm">
                        {role.name}
                      </TableCell>
                      <TableCell>
                        {!role.is_customized ? (
                          <Badge variant="secondary">Using system defaults</Badge>
                        ) : (
                          <Badge variant="outline">Customized</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Shield className="h-4 w-4 mr-2 text-blue-500" />
                          {role.permissions?.length ?? 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {isSuperadmin ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const backend = backendRoles.find((r) => r.id === role.id)
                              if (backend) openEditSuperadminRole(backend)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        ) : isLabEditableRoleName(role.name) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditLabRole(role)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit template
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {!isSuperadmin && (
          <p className="text-xs text-muted-foreground">
            Catalog reference: {labRoleBundle.length} permissions in lab_role_bundle from{" "}
            <code className="text-xs">GET /users/permissions/available</code>.
          </p>
        )}
      </div>

      {editingRole && (
        <Dialog open onOpenChange={(open) => !open && setEditingRole(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit {formatRoleLabel(editingRole.name)} template</DialogTitle>
              <DialogDescription>
                Saves via{" "}
                <code className="text-xs">
                  PUT /customers/&#123;labId&#125;/roles/&#123;roleId&#125;/permissions
                </code>
                . Applies to all users with this role on this lab only.
              </DialogDescription>
            </DialogHeader>
            <PermissionAssignmentPanel
              variant="role"
              role={editingRole.name}
              customerId={labCustomerId ?? undefined}
              selected={editingPermissions}
              onChange={setEditingPermissions}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRole(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={saveLabRolePermissions} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save role template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {editingBackendRole && (
        <Dialog open onOpenChange={(open) => !open && setEditingBackendRole(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit global role — {editingBackendRole.name}</DialogTitle>
              <DialogDescription>
                Updates global permissions via{" "}
                <code className="text-xs">PUT /role-permissions/roles/&#123;id&#125;</code>.
              </DialogDescription>
            </DialogHeader>
            <PermissionAssignmentPanel
              variant="role"
              role={editingBackendRole.name}
              selected={editingPermissions}
              onChange={setEditingPermissions}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingBackendRole(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={saveSuperadminRolePermissions} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save role permissions"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
