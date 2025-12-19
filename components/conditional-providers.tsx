"use client"

import React, { Suspense } from "react"
import { usePathname } from "next/navigation"
import { InvitationProvider } from "@/contexts/invitation-context"
import { LabAdminProvider } from "@/contexts/lab-admin-context"
import { RegistrationProvider } from "@/contexts/registration-context"
import { BusinessSettingsProvider } from "@/contexts/business-settings-context"
import { LibraryItemsProvider } from "@/contexts/product-library-items-context"
import { SlipCreationProvider } from "@/contexts/slip-creation-context"
import { HolidaysProvider } from "@/contexts/holidays-context"
import { AddSlipModalProvider } from "@/components/add-slip-modal-provider"
import { SlipProvider } from "@/app/lab-case-management/SlipContext"
import { ProductCategoryProvider } from "@/contexts/product-category-context"
import { StagesProvider } from "@/contexts/product-stages-context"
import { GradesProvider } from "@/contexts/product-grades-context"
import { DriverSlipProvider } from "@/contexts"
import { CustomerProvider } from "@/contexts/customer-context"
// Lazy load ModelPreloadProvider to prevent Three.js from loading on login page
const ModelPreloadProvider = React.lazy(() =>
  import("@/contexts/3d-model-preload-context").then(mod => ({ default: mod.ModelPreloadProvider }))
)
// Routes that don't need authenticated providers
const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password", "/setup-account"]

/**
 * Internal component that uses usePathname
 */
function ConditionalProvidersInternal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Check if current route is a public route
  const isPublicRoute = pathname ? PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) : false

  // For public routes, skip loading authenticated providers to reduce bundle size
  if (isPublicRoute) {
    return <>{children}</>
  }

  // For authenticated routes, load all providers
  return (
    <InvitationProvider>
      <LabAdminProvider>
        <RegistrationProvider>
          <BusinessSettingsProvider>
            <CustomerProvider>
              <LibraryItemsProvider>
                <ProductCategoryProvider>
                  <StagesProvider>
                    <GradesProvider>
                      <SlipCreationProvider>
                        <HolidaysProvider>
                          <AddSlipModalProvider>
                            <SlipProvider>
                              <DriverSlipProvider>
                                <React.Suspense fallback={null}>
                                    {children}
                                </React.Suspense>
                              </DriverSlipProvider>
                            </SlipProvider>
                          </AddSlipModalProvider>
                        </HolidaysProvider>
                      </SlipCreationProvider>
                    </GradesProvider>
                  </StagesProvider>
                </ProductCategoryProvider>
              </LibraryItemsProvider>
            </CustomerProvider>
          </BusinessSettingsProvider>
        </RegistrationProvider>
      </LabAdminProvider>
    </InvitationProvider>
  )
}

/**
 * Conditionally renders providers based on route.
 * This prevents loading heavy providers and making unnecessary API calls on public pages like login.
 *
 * On public routes (login, forgot-password, etc.), we skip loading all the authenticated providers
 * which significantly reduces initial bundle size and network requests.
 */
export function ConditionalProviders({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <ConditionalProvidersInternal>{children}</ConditionalProvidersInternal>
    </Suspense>
  )
}

