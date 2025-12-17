"use client"

import React from 'react'
import dynamic from 'next/dynamic'
import { ComponentType } from 'react'
import LoadingOverlay from '@/components/ui/loading-overlay'

// Loading components for better UX
const LoadingSpinner = () => (
  <LoadingOverlay
    isLoading={true}
    title="Loading component..."
    message="Please wait while we load this component"
    zIndex={9999}
  />
)

const LoadingSpinnerLarge = () => (
  <LoadingOverlay
    isLoading={true}
    title="Loading dashboard..."
    message="Please wait while we load the dashboard"
    zIndex={9999}
  />
)

const LoadingSpinner3D = () => (
  <LoadingOverlay
    isLoading={true}
    title="Loading 3D Chart..."
    message="Please wait while we load the 3D visualization"
    zIndex={9999}
  />
)

// ===== HEAVY 3D COMPONENTS =====
// These are the most expensive components and should be loaded on demand

export const InteractiveDentalChart3D = dynamic(
  () => import('@/components/interactive-dental-chart-3D'),
  {
    loading: LoadingSpinner3D,
    ssr: false, // Disable SSR for 3D components
  }
)

export const STLViewer = dynamic(
  () => import('@/components/stl-viewer'),
  {
    loading: LoadingSpinner3D,
    ssr: false,
  }
)

export const SimpleSTLViewer = dynamic(
  () => import('@/components/simple-stl-viewer'),
  {
    loading: LoadingSpinner3D,
    ssr: false,
  }
)

// ===== DENTAL SLIP COMPONENTS =====
// Heavy dental slip components that should be loaded on demand

export const OptimizedDentalSlipPage = dynamic(
  () => import('@/components/dental-slip/optimized-dental-slip-page'),
  {
    loading: LoadingSpinnerLarge,
    ssr: false, // Disable SSR for complex form components
  }
)

export const DentalSlipStep1 = dynamic(
  () => import('@/components/dental-slip/steps/step-1-lab-selection'),
  {
    loading: LoadingSpinner,
  }
)

export const DentalSlipStep2 = dynamic(
  () => import('@/components/dental-slip/steps/step-2-doctor-selection'),
  {
    loading: LoadingSpinner,
  }
)

export const DentalSlipStep3 = dynamic(
  () => import('@/components/dental-slip/steps/step-3-patient-input'),
  {
    loading: LoadingSpinner,
  }
)

export const DentalSlipStep4 = dynamic(
  () => import('@/components/dental-slip/steps/step-4-category-selection'),
  {
    loading: LoadingSpinner,
  }
)

// ===== HEAVY MODALS =====
// Large modals that are not always needed

export const AddProductModal = dynamic(
  () => import('@/components/add-product-modal'),
  {
    loading: LoadingSpinner,
  }
)

export const TeethShadeSelectionModal = dynamic(
  () => import('@/components/teeth-shade-selection-modal').then(mod => ({ default: mod.TeethShadeSelectionModal })),
  {
    loading: LoadingSpinner,
  }
)

export const AddLabProductModal = dynamic(
  () => import('@/components/product-management/add-lab-product-modal'),
  {
    loading: LoadingSpinner,
  }
)

export const AddNewLabModal = dynamic(
  () => import('@/components/add-new-lab-modal'),
  {
    loading: LoadingSpinner,
  }
)

export const AddDoctorModal = dynamic(
  () => import('@/components/add-doctor-modal'),
  {
    loading: LoadingSpinner,
  }
)

export const AddOnsModal = dynamic(
  () => import('@/components/add-ons-modal'),
  {
    loading: LoadingSpinner,
  }
)

export const ImpressionSelectionModal = dynamic(
  () => import('@/components/impression-selection-modal'),
  {
    loading: LoadingSpinner,
  }
)

export const StageNotesModal = dynamic(
  () => import('@/components/stage-notes-modal'),
  {
    loading: LoadingSpinner,
  }
)

export const RushRequestModal = dynamic(
  () => import('@/components/rush-request-modal'),
  {
    loading: LoadingSpinner,
  }
)

export const DeliveryDateModal = dynamic(
  () => import('@/components/delivery-date-modal'),
  {
    loading: LoadingSpinner,
  }
)

export const FileAttachmentModalContent = dynamic(
  () => import('@/components/file-attachment-modal-content'),
  {
    loading: LoadingSpinner,
  }
)

// ===== DASHBOARD COMPONENTS =====
// Dashboard components that are heavy

export const LabAdminDashboard = dynamic(
  () => import('@/components/dashboard/lab-admin-dashboard'),
  {
    loading: LoadingSpinnerLarge,
  }
)

export const OfficeAdminDashboard = dynamic(
  () => import('@/components/dashboard/office-admin-dashboard'),
  {
    loading: LoadingSpinnerLarge,
  }
)

export const SuperAdminDashboard = dynamic(
  () => import('@/components/dashboard/superadmin-dashboard'),
  {
    loading: LoadingSpinnerLarge,
  }
)

export const DashboardSidebar = dynamic(
  () => import('@/components/dashboard/dashboard-sidebar').then(mod => ({ default: mod.DashboardSidebar })),
  {
    loading: LoadingSpinner,
  }
)

// ===== PRODUCT MANAGEMENT COMPONENTS =====
// Heavy product management components

export const ProductManagementSidebar = dynamic(
  () => import('@/components/product-management/product-sidebar'),
  {
    loading: LoadingSpinner,
  }
)

export const AddCategoryModal = dynamic(
  () => import('@/components/product-management/add-category-modal'),
  {
    loading: LoadingSpinner,
  }
)

export const AddCasePanModal = dynamic(
  () => import('@/components/product-management/add-case-pan-modal'),
  {
    loading: LoadingSpinner,
  }
)

export const AddAddOnModal = dynamic(
  () => import('@/components/product-management/add-add-on-modal'),
  {
    loading: LoadingSpinner,
  }
)

export const AddAddOnCategoryModal = dynamic(
  () => import('@/components/product-management/add-add-on-category-modal'),
  {
    loading: LoadingSpinner,
  }
)

// ===== FORM COMPONENTS =====
// Heavy form components

export const RegistrationUserForm = dynamic(
  () => import('@/components/registration/user-form'),
  {
    loading: LoadingSpinner,
  }
)

export const RegistrationProfileForm = dynamic(
  () => import('@/components/registration/profile-form'),
  {
    loading: LoadingSpinner,
  }
)

export const RegistrationLabProfileForm = dynamic(
  () => import('@/components/registration/lab-profile-form'),
  {
    loading: LoadingSpinner,
  }
)

export const MultipleLocationForm = dynamic(
  () => import('@/components/multiple-location-form'),
  {
    loading: LoadingSpinner,
  }
)

// ===== CALENDAR COMPONENTS =====
// Calendar components that are heavy

export const CalendarMeetingView = dynamic(
  () => import('@/components/calendar/calendar-meeting-view'),
  {
    loading: LoadingSpinnerLarge,
  }
)

export const CalendarGrid = dynamic(
  () => import('@/components/lab-administrator/calendar/calendar-grid'),
  {
    loading: LoadingSpinnerLarge,
  }
)

// ===== BILLING COMPONENTS =====
// Billing components

export const BillingDataTable = dynamic(
  () => import('@/components/billing/billing-data-table'),
  {
    loading: LoadingSpinner,
  }
)

export const TransactionHistory = dynamic(
  () => import('@/components/billing/transaction-history'),
  {
    loading: LoadingSpinner,
  }
)

export const PaymentMethods = dynamic(
  () => import('@/components/billing/payment-methods'),
  {
    loading: LoadingSpinner,
  }
)

// ===== CHART COMPONENTS =====
// Chart components using recharts library - should be loaded on demand

export const RevenueChart = dynamic(
  () => import('@/components/revenue-chart').then(mod => ({ default: mod.RevenueChart })),
  {
    loading: LoadingSpinner,
    ssr: false, // Charts don't need SSR
  }
)

export const SalesChart = dynamic(
  () => import('@/components/sales-chart').then(mod => ({ default: mod.SalesChart })),
  {
    loading: LoadingSpinner,
    ssr: false,
  }
)

export const AnalyticsBarChart = dynamic(
  () => import('@/components/analytics-bar-chart').then(mod => ({ default: mod.AnalyticsBarChart })),
  {
    loading: LoadingSpinner,
    ssr: false,
  }
)

export const AnalyticsPieChart = dynamic(
  () => import('@/components/analytics-pie-chart').then(mod => ({ default: mod.AnalyticsPieChart })),
  {
    loading: LoadingSpinner,
    ssr: false,
  }
)

export const AnalyticsLineChart = dynamic(
  () => import('@/components/analytics-line-chart').then(mod => ({ default: mod.AnalyticsLineChart })),
  {
    loading: LoadingSpinner,
    ssr: false,
  }
)

export const AnalyticsAreaChart = dynamic(
  () => import('@/components/analytics-area-chart').then(mod => ({ default: mod.AnalyticsAreaChart })),
  {
    loading: LoadingSpinner,
    ssr: false,
  }
)

export const CreditUsageChart = dynamic(
  () => import('@/components/billing/credit-usage-chart').then(mod => ({ default: mod.CreditUsageChart })),
  {
    loading: LoadingSpinner,
    ssr: false,
  }
)

// ===== UTILITY FUNCTIONS =====

// Create dynamic import with custom loading component
export function createDynamicImport<T = any>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  loadingComponent?: ComponentType
) {
  return dynamic(importFn, {
    loading: loadingComponent || LoadingSpinner,
  })
}

// Preload critical components based on user role and current page
export function preloadComponentsByRoute(pathname: string, userRole?: string) {
  if (typeof window === 'undefined') return

  // Preload components based on current route
  const preloadMap: Record<string, (() => Promise<any>)[]> = {
    '/case-design': [
      () => import('@/components/interactive-dental-chart-3D'),
      () => import('@/components/add-product-modal'),
      () => import('@/components/teeth-shade-selection-modal'),
    ],
    '/dashboard': [
      () => import('@/components/dashboard/lab-admin-dashboard'),
      () => import('@/components/dashboard/office-admin-dashboard'),
      () => import('@/components/dashboard/superadmin-dashboard'),
    ],
    '/lab-product-library': [
      () => import('@/components/product-management/add-lab-product-modal'),
      () => import('@/components/product-management/product-sidebar'),
    ],
    '/global-product-library': [
      () => import('@/components/product-management/add-product-modal'),
      () => import('@/components/product-management/product-sidebar'),
    ],
    '/lab-administrator': [
      () => import('@/components/lab-administrator/calendar/calendar-grid'),
      () => import('@/components/lab-administrator/staff'),
    ],
    '/office-administrator': [
      () => import('@/components/office-administrator/user-list-table'),
      () => import('@/components/office-administrator/create-user-modal'),
    ],
    '/billing': [
      () => import('@/components/billing/billing-data-table'),
      () => import('@/components/billing/transaction-history'),
    ],
  }

  const componentsToPreload = preloadMap[pathname] || []
  
  // Preload components after a short delay
  setTimeout(() => {
    componentsToPreload.forEach(preloadFn => {
      preloadFn().catch(console.warn)
    })
  }, 1000)
}

// Hook to preload components based on route changes
export function useRouteBasedPreloading() {
  if (typeof window === 'undefined') return

  // Preload components when user hovers over navigation links
  const preloadOnHover = (pathname: string) => {
    preloadComponentsByRoute(pathname)
  }

  return { preloadOnHover }
}

// Export all dynamic components for easy importing
export const DynamicComponents = {
  // 3D Components
  InteractiveDentalChart3D,
  STLViewer,
  SimpleSTLViewer,
  
  // Dental Slip Components
  OptimizedDentalSlipPage,
  DentalSlipStep1,
  DentalSlipStep2,
  DentalSlipStep3,
  DentalSlipStep4,
  
  // Modals
  AddProductModal,
  TeethShadeSelectionModal,
  AddLabProductModal,
  AddNewLabModal,
  AddDoctorModal,
  AddOnsModal,
  ImpressionSelectionModal,
  StageNotesModal,
  RushRequestModal,
  DeliveryDateModal,
  FileAttachmentModalContent,
  
  // Dashboard
  LabAdminDashboard,
  OfficeAdminDashboard,
  SuperAdminDashboard,
  DashboardSidebar,
  
  // Product Management
  ProductManagementSidebar,
  AddCategoryModal,
  AddCasePanModal,
  AddAddOnModal,
  AddAddOnCategoryModal,
  
  // Forms
  RegistrationUserForm,
  RegistrationProfileForm,
  RegistrationLabProfileForm,
  MultipleLocationForm,
  
  // Calendar
  CalendarMeetingView,
  CalendarGrid,
  
  // Billing
  BillingDataTable,
  TransactionHistory,
  PaymentMethods,
  
  // Charts
  RevenueChart,
  SalesChart,
  AnalyticsBarChart,
  AnalyticsPieChart,
  AnalyticsLineChart,
  AnalyticsAreaChart,
  CreditUsageChart,
}
