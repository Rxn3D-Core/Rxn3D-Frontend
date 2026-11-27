"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { usePermissionCapabilities } from "@/hooks/use-permission-capabilities"
import { canImportProducts } from "@/lib/lab-product-import"
import { userIsSuperadmin } from "@/lib/permissions"
import { ImportProductsDialog } from "./import-products-dialog"

interface ImportProductsButtonProps {
  customerId: number | undefined
  /** Called after an import added at least one product. */
  onImported: () => void
}

export function ImportProductsButton({ customerId, onImported }: ImportProductsButtonProps) {
  const { t } = useTranslation()
  const { user, profileRole } = useAuth()
  const { canCreateProduct } = usePermissionCapabilities()
  const [open, setOpen] = useState(false)
  const allowed =
    !!user &&
    canImportProducts({
      activeRole: profileRole,
      isSuperadminUser: userIsSuperadmin(user),
      canCreateProduct,
    })

  if (!allowed || !customerId) return null

  return (
    <>
      <Button
        variant="outline"
        className="px-4 py-2 rounded-lg text-sm font-medium border-[#1162a8] text-[#1162a8] hover:bg-blue-50"
        onClick={() => setOpen(true)}
        data-testid="product-import-open"
      >
        <Download className="h-4 w-4 mr-2" />
        {t("productImport.button")}
      </Button>

      {open && (
        <ImportProductsDialog customerId={customerId} onImported={onImported} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
