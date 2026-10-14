"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ACLManager } from "@/components/permission/acl-manager"
import { RoleManager } from "@/components/permission/role-manager"
import { UserPermissions } from "@/components/permission/user-permissions"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { canAccessAclManagement, profileScopeLabel } from "@/lib/permissions"
import { Users } from "lucide-react"

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
    <div className="py-6 px-4">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Permission Management</h1>
          <p className="text-gray-500 mt-1 max-w-2xl">
            {isSuperadmin
              ? "Assign permission overrides, edit role templates, and browse the permission catalog. To create or edit people and org memberships, use All Users."
              : `Manage user overrides, role templates, and the permission catalog for your active ${scopeLabel.toLowerCase()} profile.`}
          </p>
        </div>
        {isSuperadmin ? (
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/lab-office-management/all-users">
              <Users className="h-4 w-4 mr-2" />
              Go to All Users
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <Tabs defaultValue="users" className="w-full">
          <div className="border-b border-gray-200 px-4 pt-4">
            <TabsList className="h-auto w-full max-w-xl justify-start gap-1 rounded-none bg-transparent p-0">
              <TabsTrigger
                value="users"
                className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-[#1162a8] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                User overrides
              </TabsTrigger>
              <TabsTrigger
                value="roles"
                className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-[#1162a8] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Roles
              </TabsTrigger>
              <TabsTrigger
                value="acl"
                className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-[#1162a8] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Catalog
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4 md:p-6">
            <TabsContent value="users" className="mt-0">
              <UserPermissions />
            </TabsContent>

            <TabsContent value="roles" className="mt-0">
              <RoleManager />
            </TabsContent>

            <TabsContent value="acl" className="mt-0">
              <ACLManager />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
