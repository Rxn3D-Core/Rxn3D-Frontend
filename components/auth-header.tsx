"use client"

import type React from "react"

import Link from "next/link"
import Image from "next/image"
import { useTranslation } from "react-i18next"

interface AuthHeaderProps {
  showSupport?: boolean
  customContent?: React.ReactNode
  className?: string
}

export function AuthHeader({ showSupport = true, customContent, className = "" }: AuthHeaderProps) {
  const { t } = useTranslation()

  return (
    <header className={`flex justify-between items-center py-4 px-6 border-b border-[#e4e6ef] bg-white ${className}`}>
      <div className="flex items-center">
        <Link href="/">
          <Image src="/images/rxn3d-logo.png" alt="RXN3D" width={100} height={32} className="h-8 w-auto" />
        </Link>
      </div>

      {/* Custom content or support text */}
      {customContent
        ? customContent
        : showSupport && (
            <div className="text-sm text-[#545f71]">
              {t("needHelp")}{" "}
              <Link href="#" className="text-[#1162a8] font-medium hover:underline">
                {t("contactSupport")}
              </Link>
            </div>
          )}
    </header>
  )
}
