"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"

/** Copyright line with the HIPAA notice as the last link. */
export function SiteCopyrightFooter() {
  const { t } = useTranslation()

  return (
    <footer className="shrink-0 border-t border-[#e4e6ef] bg-white px-4 py-3 text-center">
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs leading-4 text-[#6b7280]">
        <span>
          © {new Date().getFullYear()} Rxn3D. {t("All rights reserved.", "All rights reserved.")}
        </span>
        <span aria-hidden="true">·</span>
        <Link href="/hipaa-notice" className="font-medium text-[#1162a8] hover:underline">
          {t("HIPAA Compliance", "HIPAA Compliance")}
        </Link>
      </p>
    </footer>
  );
}
