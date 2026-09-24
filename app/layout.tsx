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
import { inter, islandMoments, windSong } from "@/lib/fonts"
import { getSiteUrl } from "@/lib/site-url"

// Force all pages to be dynamic (client-rendered) to avoid SSR issues with i18n and navigation hooks
export const dynamic = 'force-dynamic'

const siteUrl = getSiteUrl()
const ogImageUrl = "/images/rxn3d-og.png"
const siteTitle = "Rxn3D LMS — Dental Lab Management Software"
const siteDescription =
  "Rxn3D is cloud dental laboratory management software for dental labs and dental offices: digital prescriptions, case tracking, production workflows, billing, and delivery."

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  applicationName: "Rxn3D LMS",
  authors: [{ name: "Rxn3D LLC", url: "https://www.rxn3d.com" }],
  keywords: [
    "dental lab software",
    "dental laboratory management",
    "dental lab SaaS",
    "digital prescriptions",
    "dental case tracking",
    "dental lab billing",
    "dental lab production software",
    "Rxn3D",
    "Rxn3D LMS",
  ],
  category: "business",
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
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
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Rxn3D",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Rxn3D — Dental Lab Management Software",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [ogImageUrl],
  },
}

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Rxn3D",
      legalName: "Rxn3D LLC",
      url: "https://www.rxn3d.com",
      logo: "https://www.rxn3d.com/logo.png",
      description:
        "Modern dental lab management platform — from prescription to delivery.",
      knowsAbout: [
        "Dental laboratory management",
        "Dental lab software",
        "Digital prescriptions",
        "Dental case tracking",
        "Dental lab billing",
      ],
    },
    {
      "@type": "SoftwareApplication",
      name: "Rxn3D LMS",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Dental Laboratory Management Software",
      operatingSystem: "Web",
      url: siteUrl,
      image: `${siteUrl}${ogImageUrl}`,
      description: siteDescription,
      provider: {
        "@type": "Organization",
        name: "Rxn3D",
        url: "https://www.rxn3d.com",
      },
      audience: {
        "@type": "Audience",
        audienceType: "Dental laboratories and dental offices",
      },
      keywords:
        "dental lab software, dental laboratory management, digital prescriptions, case tracking, dental lab billing",
    },
  ],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${islandMoments.variable} ${windSong.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
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
