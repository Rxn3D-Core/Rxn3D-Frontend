"use client"

import Link from "next/link"
import { Home } from "lucide-react"
import { AuthHeader } from "@/components/auth-header"
import { useRouter } from "next/navigation"
import { Suspense, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "next/navigation"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"

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
      <div className="flex-1 relative flex items-center justify-center bg-[#f7fbff]">
        <DotLottieReact
          src="https://lottie.host/e5f0328c-41d8-4c4a-8ced-ebac204fb9b0/kyoH0HaX4Y.lottie"
          loop
          autoplay
          className="absolute inset-0 w-full h-full"
        />
        <div className="absolute bottom-8 left-0 right-0 z-10 text-center px-4">
          <div className="space-y-4">
            <button
              onClick={() => router.replace("/")}
              className="flex items-center justify-center gap-2 mx-auto px-8 py-3 text-lg bg-white border border-[#d9d9d9] rounded-xl hover:bg-[#f0f0f0] transition-colors shadow-sm"
            >
              <Home className="h-5 w-5" />
              <span>{t("Go to Home", "Go to Home")}</span>
            </button>
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
