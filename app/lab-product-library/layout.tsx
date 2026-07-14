"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { Header } from "@/components/header"
import { ProductSidebar } from "@/components/product-management/product-sidebar"
import { ProductLibraryProvider } from "@/contexts/product-case-pan-context"
import { ProductCategoryProvider } from "@/contexts/product-category-context"
import { GradesProvider } from "@/contexts/product-grades-context"
import { ImpressionsProvider } from "@/contexts/product-impression-context"
import { MaterialsProvider } from "@/contexts/product-materials-context"
import { RetentionProvider } from "@/contexts/product-retention-context"
import { StagesProvider } from "@/contexts/product-stages-context"
import { TeethShadesProvider } from "@/contexts/product-teeth-shade-context"
import { GumShadesProvider } from "@/contexts/product-gum-shade-context"
import { AddOnsProvider } from "@/contexts/product-add-on-context"
import { ProductsProvider } from "@/contexts/product-products-context"
import { AddOnsCategoryProvider } from "@/contexts/product-add-on-category-context"
import { CaseTrackingProvider } from "@/contexts/case-tracking-context"
import { ProtectedRoute } from "@/components/protected-route"
import { PermissionRoute } from "@/components/permission-route"

const SUPERADMIN_ONLY = process.env.NEXT_PUBLIC_PRODUCT_MGMT_SUPERADMIN_ONLY === "true"

function ProductManagementGuard({ children }: { children: React.ReactNode }) {
  const { isActingAsLabAdmin, isSuperadmin, user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading || !user) return
    // Block regular lab admins when the env flag is on; superadmin acting as lab admin passes
    if (SUPERADMIN_ONLY && !isActingAsLabAdmin && !isSuperadmin) {
      router.replace("/dashboard")
    }
  }, [isLoading, user, isActingAsLabAdmin, isSuperadmin, router])

  if (SUPERADMIN_ONLY && !isActingAsLabAdmin && !isSuperadmin) return null

  return <>{children}</>
}

export default function LabProductLibraryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <ProductManagementGuard>
      <PermissionRoute
        permissions={["view_product", "create_product", "update_product", "delete_product"]}
      >
      <ProductLibraryProvider>
        <ProductCategoryProvider>
          <GradesProvider>
            <ImpressionsProvider>
              <MaterialsProvider>
                <RetentionProvider>
                  <StagesProvider>
                    <TeethShadesProvider>
                      <GumShadesProvider>
                        <AddOnsProvider>
                          <AddOnsCategoryProvider>
                            <ProductsProvider>
                              <CaseTrackingProvider>
                              <div className="flex h-[100dvh] bg-[#f9f9f9] overflow-hidden">
                                <DashboardSidebar />
                                <div className="flex-1 flex flex-col overflow-hidden">
                                  <Header />
                                  <div className="flex-1 flex overflow-hidden">
                                    <ProductSidebar />
                                    <main className="flex-1 overflow-auto">
                                      {children}
                                    </main>
                                  </div>
                                </div>
                              </div>
                              </CaseTrackingProvider>
                            </ProductsProvider>
                          </AddOnsCategoryProvider>
                        </AddOnsProvider>
                      </GumShadesProvider>
                    </TeethShadesProvider>
                  </StagesProvider>
                </RetentionProvider>
              </MaterialsProvider>
            </ImpressionsProvider>
          </GradesProvider>
        </ProductCategoryProvider>
      </ProductLibraryProvider>
      </PermissionRoute>
      </ProductManagementGuard>
    </ProtectedRoute>
  )
}
