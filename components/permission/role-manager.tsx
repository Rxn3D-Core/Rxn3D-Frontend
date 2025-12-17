"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, Edit, Trash, Users, Shield } from "lucide-react"

// Define role types
interface Role {
  id: string
  name: string
  description: string
  permissionCount: number
  userCount: number
  isDefault: boolean
}

// Sample role data
const initialRoles: Role[] = [
  {
    id: "r1",
    name: "Lab Admin (Superadmin)",
    description: "Full system access with all permissions",
    permissionCount: 13,
    userCount: 2,
    isDefault: false,
  },
  {
    id: "r2",
    name: "Office Admin",
    description: "Manage office operations, appointments, and billing",
    permissionCount: 10,
    userCount: 5,
    isDefault: false,
  },
  {
    id: "r3",
    name: "Doctor",
    description: "Access to patient records and case management",
    permissionCount: 8,
    userCount: 12,
    isDefault: true,
  },
  {
    id: "r4",
    name: "User Technician",
    description: "Access to production queue and assigned cases",
    permissionCount: 6,
    userCount: 8,
    isDefault: false,
  },
]

export function RoleManager() {
  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newRole, setNewRole] = useState<Omit<Role, "id" | "permissionCount" | "userCount">>({
    name: "",
    description: "",
    isDefault: false,
  })

  // Filter roles based on search query
  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Add new role
  const handleAddRole = () => {
    const newId = `r${roles.length + 1}`
    setRoles([
      ...roles,
      {
        id: newId,
        ...newRole,
        permissionCount: 0,
        userCount: 0,
      },
    ])
    setIsAddDialogOpen(false)
    setNewRole({
      name: "",
      description: "",
      isDefault: false,
    })
  }

  // Delete role
  const deleteRole = (id: string) => {
    setRoles(roles.filter((role) => role.id !== id))
  }

  // Set default role
  const setDefaultRole = (id: string) => {
    setRoles(
      roles.map((role) => ({
        ...role,
        isDefault: role.id === id,
      })),
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Role Management</CardTitle>
            <CardDescription>Create and manage user roles</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <Plus className="h-4 w-4" />
                Add Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Role</DialogTitle>
                <DialogDescription>Create a new role to assign to users</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Role name"
                    className="col-span-3"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="description"
                    placeholder="Role description"
                    className="col-span-3"
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddRole} disabled={!newRole.name}>
                  Add Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between">
              <div className="relative w-full md:w-1/3">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search roles..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No roles found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>{role.description}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-blue-500" />
                            {role.permissionCount}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2 text-green-500" />
                            {role.userCount}
                          </div>
                        </TableCell>
                        <TableCell>
                          {role.isDefault ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              Default
                            </span>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDefaultRole(role.id)}
                              className="h-7 text-xs"
                            >
                              Set as Default
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
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
                                Manage Permissions
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => deleteRole(role.id)}>
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
