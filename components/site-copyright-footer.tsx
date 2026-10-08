"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"

/** Copyright line with the HIPAA notice as the last link. */
export function SiteCopyrightFooter() {
  const { t } = useTranslation()

  return (
    <footer className="shrink-0 border-t border-[#e4e6ef] bg-white px-3 py-0.5 text-center text-[8px] leading-3 text-[#a19d9d]">
      <p className="text-[10px] leading-4">
        © {new Date().getFullYear()} Rxn3D. {t("All rights reserved.", "All rights reserved.")}
        {" · "}
        <Link href="/hipaa-notice" className="text-[8px] leading-3 hover:text-[#1162a8] hover:underline">
          {t("HIPAA Compliance", "HIPAA Compliance")}
        </Link>
      </p>
    </footer>
  );
}
