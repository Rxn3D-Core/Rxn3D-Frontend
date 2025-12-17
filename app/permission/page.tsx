"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ACLManager } from "@/components/permission/acl-manager"
import { RoleManager } from "@/components/permission/role-manager"
import { UserPermissions } from "@/components/permission/user-permissions"

export default function PermissionPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Permission Management</h1>
        <p className="text-muted-foreground">Manage access control and user permissions</p>
      </div>

      <Tabs defaultValue="acl" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="acl">Access Control</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="users">User Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="acl">
          <ACLManager />
        </TabsContent>

        <TabsContent value="roles">
          <RoleManager />
        </TabsContent>

        <TabsContent value="users">
          <UserPermissions />
        </TabsContent>
      </Tabs>
    </div>
  )
}
