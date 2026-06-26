"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ACLManager } from "@/components/permission/acl-manager"
import { RoleManager } from "@/components/permission/role-manager"
import { UserPermissions } from "@/components/permission/user-permissions"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { canAccessAclManagement, profileScopeLabel } from "@/lib/permissions"

export default function PermissionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, profilePermissions, profileRole, isSuperadmin } = useAuth()
  const scopeLabel = profileScopeLabel()

  useEffect(() => {
    if (!user) return
    if (!canAccessAclManagement(profilePermissions, profileRole, isSuperadmin)) {
      toast({
        title: "Access Denied",
        description: "Only lab admins with update_role can manage ACL settings.",
        variant: "destructive",
      })
      router.replace("/dashboard")
    }
  }, [user, profilePermissions, profileRole, isSuperadmin, router, toast])

  return (
    <div className="w-full space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Permission Management</h1>
        <p className="text-muted-foreground mt-1">
          {isSuperadmin
            ? "Manage permissions for any user or role across the platform."
            : `Manage users, roles, and the permission catalog for your active ${scopeLabel.toLowerCase()} profile.`}
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-xl grid-cols-3 mb-8">
            <TabsTrigger value="users">User Permissions</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="acl">Catalog</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-0">
            <UserPermissions />
          </TabsContent>

          <TabsContent value="roles" className="mt-0">
            <RoleManager />
          </TabsContent>

          <TabsContent value="acl" className="mt-0">
            <ACLManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
