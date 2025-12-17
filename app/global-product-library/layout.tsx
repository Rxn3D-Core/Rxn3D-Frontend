"use client"

import type React from "react"

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
import { AddOnsCategoryProvider } from "@/contexts/product-add-on-category-context"
import { ProductsProvider } from "@/contexts/product-products-context"
import { CaseTrackingProvider } from "@/contexts/case-tracking-context"
import { ProtectedRoute } from "@/components/protected-route"

export default function GlobalProductLibraryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
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
                                <div className="flex min-h-screen bg-[#f9f9f9]">
                                  <DashboardSidebar />
                                  <div className="flex-1 flex flex-col">
                                    <Header />
                                    <div className="flex-1 flex">
                                      <ProductSidebar />
                                      <main className="flex-1">
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
    </ProtectedRoute>
  )
}
