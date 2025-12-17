"use client"

import Link from "next/link"
import { Home } from "lucide-react"
import { AuthHeader } from "@/components/auth-header"
import { useRouter } from "next/navigation"
import { Suspense, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "next/navigation"

function NotFoundContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()

  useEffect(() => {
    const status = searchParams.get("status")
    if (status === "Connected") {
      router.replace("/")
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex flex-col">
      <AuthHeader />
      <div className="flex-1 bg-[#f7fbff] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-[#e6f0f9] rounded-full mb-4">
              <span className="text-[#1162a8] text-5xl font-bold">{t("404")}</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">{t("Page Not Found")}</h1>
            <p className="text-[#a19d9d]">{t("The page you are looking for doesn't exist or has been moved.")}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.replace("/")}
              className="flex items-center justify-center gap-2 w-full py-2.5 border border-[#d9d9d9] rounded-md hover:bg-[#f0f0f0] transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>{t("Go to Home", "Go to Home")}</span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-[#e4e6ef]">
            <p className="text-sm text-[#a19d9d]">
              {t("If you believe this is an error, please", "If you believe this is an error, please")}{" "}
              <Link href="#" className="text-[#1162a8]">
                {t("contact support", "contact support")}
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e4e6ef] py-4 px-6 text-center text-sm text-[#a19d9d]">
        <p>© {new Date().getFullYear()} Rxn3D. {t("All rights reserved.", "All rights reserved.")}</p>
      </footer>
    </div>
  )
}

export default function NotFound() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotFoundContent />
    </Suspense>
  )
}
