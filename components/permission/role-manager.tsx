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

  // Superadmin manages global role bundles, so expose every role the backend
  // returns (lab, office, doctor, etc.) rather than intersecting with the
  // lab-only editable list used by the per-lab admin view.
  const superadminRows = useMemo(
    () =>
      backendRoles.map((backend) => ({
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
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Roles</h2>
        <p className="text-sm text-gray-500 mt-1">
          {isSuperadmin
            ? "Edit the default permission set for each system role. Changes apply globally for users with that role."
            : `Customize permission templates for ${LAB_EDITABLE_ROLE_NAMES.map(formatRoleLabel).join(" and ")} on this ${scopeLabel.toLowerCase()}. Lab Admin stays locked.`}
        </p>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/60">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search roles..."
              className="pl-8 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div>
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
      </div>

      {!isSuperadmin && (
        <p className="text-xs text-gray-500">
          Reference catalog includes {labRoleBundle.length} lab permissions available for templates.
        </p>
      )}

      {editingRole && (
        <Dialog open onOpenChange={(open) => !open && setEditingRole(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit {formatRoleLabel(editingRole.name)} template</DialogTitle>
              <DialogDescription>
                Choose which permissions this role includes for your lab. Applies to everyone with
                this role at this lab only.
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
                Updates the default permissions for this role across the platform.
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
