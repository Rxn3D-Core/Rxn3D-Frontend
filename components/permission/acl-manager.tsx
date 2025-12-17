"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, Edit, Trash, Check, X, Filter, Shield } from "lucide-react"

// Define permission types
interface Permission {
  id: string
  name: string
  description: string
  category: string
  isActive: boolean
  roles: string[] // Which roles have this permission
}

// Define permission categories
const permissionCategories = [
  "Dashboard",
  "Lab Administration",
  "Slips",
  "Billing",
  "Reports",
  "User Management",
  "System Settings",
  "Production",
  "Patient Records",
]

// Sample permission data
const initialPermissions: Permission[] = [
  {
    id: "p1",
    name: "view_dashboard",
    description: "View dashboard and analytics",
    category: "Dashboard",
    isActive: true,
    roles: ["Lab Admin (Superadmin)", "Office Admin", "Doctor", "User Technician"],
  },
  {
    id: "p2",
    name: "manage_products",
    description: "Create, edit, and delete products",
    category: "Lab Administration",
    isActive: true,
    roles: ["Lab Admin (Superadmin)"],
  },
  {
    id: "p3",
    name: "manage_stages",
    description: "Create, edit, and delete stages",
    category: "Lab Administration",
    isActive: true,
    roles: ["Lab Admin (Superadmin)"],
  },
  {
    id: "p4",
    name: "view_slips",
    description: "View all slips",
    category: "Slips",
    isActive: true,
    roles: ["Lab Admin (Superadmin)", "Office Admin", "Doctor", "User Technician"],
  },
  {
    id: "p5",
    name: "create_slips",
    description: "Create new slips",
    category: "Slips",
    isActive: true,
    roles: ["Lab Admin (Superadmin)", "Office Admin", "Doctor"],
  },
  {
    id: "p6",
    name: "edit_slips",
    description: "Edit existing slips",
    category: "Slips",
    isActive: true,
    roles: ["Lab Admin (Superadmin)", "Office Admin", "Doctor"],
  },
  {
    id: "p7",
    name: "delete_slips",
    description: "Delete slips",
    category: "Slips",
    isActive: false,
    roles: ["Lab Admin (Superadmin)"],
  },
  {
    id: "p8",
    name: "view_billing",
    description: "View billing information",
    category: "Billing",
    isActive: true,
    roles: ["Lab Admin (Superadmin)", "Office Admin"],
  },
  {
    id: "p9",
    name: "process_payments",
    description: "Process payments",
    category: "Billing",
    isActive: false,
    roles: ["Lab Admin (Superadmin)", "Office Admin"],
  },
  {
    id: "p10",
    name: "generate_reports",
    description: "Generate and export reports",
    category: "Reports",
    isActive: true,
    roles: ["Lab Admin (Superadmin)", "Office Admin", "Doctor"],
  },
  {
    id: "p11",
    name: "manage_users",
    description: "Create, edit, and delete users",
    category: "User Management",
    isActive: false,
    roles: ["Lab Admin (Superadmin)"],
  },
  {
    id: "p12",
    name: "manage_roles",
    description: "Create, edit, and delete roles",
    category: "User Management",
    isActive: false,
    roles: ["Lab Admin (Superadmin)"],
  },
  {
    id: "p13",
    name: "system_settings",
    description: "Modify system settings",
    category: "System Settings",
    isActive: false,
    roles: ["Lab Admin (Superadmin)"],
  },
  {
    id: "p14",
    name: "view_production_queue",
    description: "View production queue and status",
    category: "Production",
    isActive: true,
    roles: ["Lab Admin (Superadmin)", "User Technician"],
  },
  {
    id: "p15",
    name: "update_case_status",
    description: "Update case production status",
    category: "Production",
    isActive: true,
    roles: ["Lab Admin (Superadmin)", "User Technician"],
  },
  {
    id: "p16",
    name: "view_patient_records",
    description: "View patient records and history",
    category: "Patient Records",
    isActive: true,
    roles: ["Lab Admin (Superadmin)", "Office Admin", "Doctor"],
  },
  {
    id: "p17",
    name: "edit_patient_records",
    description: "Edit patient information and history",
    category: "Patient Records",
    isActive: true,
    roles: ["Lab Admin (Superadmin)", "Office Admin", "Doctor"],
  },
]

export function ACLManager() {
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newPermission, setNewPermission] = useState<Omit<Permission, "id" | "roles">>({
    name: "",
    description: "",
    category: "",
    isActive: true,
  })

  // Available roles
  const roles = ["Lab Admin (Superadmin)", "Office Admin", "Doctor", "User Technician"]

  // Filter permissions based on search query and filters
  const filteredPermissions = permissions.filter((permission) => {
    const matchesSearch =
      permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = categoryFilter === "all" || permission.category === categoryFilter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && permission.isActive) ||
      (statusFilter === "inactive" && !permission.isActive)
    const matchesRole = roleFilter === "all" || permission.roles.includes(roleFilter)

    return matchesSearch && matchesCategory && matchesStatus && matchesRole
  })

  // Add new permission
  const handleAddPermission = () => {
    const newId = `p${permissions.length + 1}`
    setPermissions([
      ...permissions,
      {
        id: newId,
        ...newPermission,
        roles: ["Lab Admin (Superadmin)"], // Default to superadmin only
      },
    ])
    setIsAddDialogOpen(false)
    setNewPermission({
      name: "",
      description: "",
      category: "",
      isActive: true,
    })
  }

  // Toggle permission status
  const togglePermissionStatus = (id: string) => {
    setPermissions(
      permissions.map((permission) =>
        permission.id === id ? { ...permission, isActive: !permission.isActive } : permission,
      ),
    )
  }

  // Delete permission
  const deletePermission = (id: string) => {
    setPermissions(permissions.filter((permission) => permission.id !== id))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Access Control List</CardTitle>
            <CardDescription>Manage system permissions and access controls</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <Plus className="h-4 w-4" />
                Add Permission
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Permission</DialogTitle>
                <DialogDescription>Create a new permission to control access to system features</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="view_feature"
                    className="col-span-3"
                    value={newPermission.name}
                    onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="description"
                    placeholder="View feature description"
                    className="col-span-3"
                    value={newPermission.description}
                    onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    Category
                  </Label>
                  <Select
                    value={newPermission.category}
                    onValueChange={(value) => setNewPermission({ ...newPermission, category: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {permissionCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Status
                  </Label>
                  <div className="flex items-center space-x-2 col-span-3">
                    <Checkbox
                      id="status"
                      checked={newPermission.isActive}
                      onCheckedChange={(checked) => setNewPermission({ ...newPermission, isActive: checked === true })}
                    />
                    <label
                      htmlFor="status"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Active
                    </label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddPermission} disabled={!newPermission.name || !newPermission.category}>
                  Add Permission
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:w-1/3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search permissions..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-full md:w-1/5">
                <Label className="text-sm font-medium">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {permissionCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-1/5">
                <Label className="text-sm font-medium">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-1/5">
                <Label className="text-sm font-medium">Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-auto">
                <Button variant="outline" className="w-full md:w-auto">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPermissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No permissions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPermissions.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell className="font-medium">{permission.name}</TableCell>
                        <TableCell>{permission.description}</TableCell>
                        <TableCell>{permission.category}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div
                              className={`h-2.5 w-2.5 rounded-full mr-2 ${
                                permission.isActive ? "bg-green-500" : "bg-gray-300"
                              }`}
                            />
                            {permission.isActive ? "Active" : "Inactive"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {permission.roles.map((role) => (
                              <span
                                key={role}
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  role === "Lab Admin (Superadmin)"
                                    ? "bg-purple-100 text-purple-800"
                                    : role === "Office Admin"
                                      ? "bg-blue-100 text-blue-800"
                                      : role === "Doctor"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-orange-100 text-orange-800"
                                }`}
                              >
                                {role === "Lab Admin (Superadmin)" ? "Admin" : role.split(" ")[0]}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => togglePermissionStatus(permission.id)}
                              title={permission.isActive ? "Deactivate" : "Activate"}
                            >
                              {permission.isActive ? (
                                <X className="h-4 w-4 text-red-500" />
                              ) : (
                                <Check className="h-4 w-4 text-green-500" />
                              )}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Manage Roles
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => deletePermission(permission.id)}
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
