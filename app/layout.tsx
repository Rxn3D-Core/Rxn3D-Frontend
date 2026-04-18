import type { Metadata, Viewport } from "next"
import { Toaster } from "@/components/ui/toaster"
import { RouteAwareProviders } from "@/components/route-aware-providers"
import { I18nProvider } from "./i18n-provider"
import { AccessibilitySettings } from "@/components/accessibility-settings"
import { AccessibilityProvider } from "@/contexts/accessibility-context"
import "./globals.css"
import { ConditionalProviders } from "@/components/conditional-providers"
import { ConditionalClientLayout } from "@/components/conditional-client-layout"
import ReactQueryProvider from '@/components/ReactQueryProvider'
import { PerformanceMonitor } from '@/components/performance-monitor'
import { OnboardingCheck } from '@/components/onboarding-check'
import '@/lib/fetch-interceptor' // Global fetch interceptor for 401 handling

// Force all pages to be dynamic (client-rendered) to avoid SSR issues with i18n and navigation hooks
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Rxn3D LMS",
  description: "RxN3D is a digital case management platform for dental labs and offices.",
  icons: {
    icon: [
      { url: "/images/rxn3d-favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/images/rxn3d-favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/rxn3d-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/images/rxn3d-apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rxn3D",
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-[100dvh] bg-background font-sans antialiased" suppressHydrationWarning>
        <ReactQueryProvider>
          <RouteAwareProviders>
            <AccessibilityProvider>
            <I18nProvider>
              <ConditionalProviders>
                <OnboardingCheck />
                <ConditionalClientLayout>
                  {children}
                </ConditionalClientLayout>
              </ConditionalProviders>
            </I18nProvider>
            <AccessibilitySettings />
            </AccessibilityProvider>
          </RouteAwareProviders>
        </ReactQueryProvider>
        <Toaster />
        {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
      </body>
    </html>
  )
}
