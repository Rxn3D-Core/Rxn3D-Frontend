"use client"

import { useEffect, useRef, useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { usePermissionCapabilities } from "@/hooks/use-permission-capabilities"
import { useLatestImport } from "@/hooks/use-lab-product-import"
import { canImportProducts, isImportActive } from "@/lib/lab-product-import"
import { userIsSuperadmin } from "@/lib/permissions"
import { ImportProductsDialog } from "./import-products-dialog"

interface ImportProductsButtonProps {
  customerId: number | undefined
  /** Called once when an import seen running on this page has finished. */
  onImported: () => void
}

export function ImportProductsButton({ customerId, onImported }: ImportProductsButtonProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { user, profileRole } = useAuth()
  const { canCreateProduct } = usePermissionCapabilities()
  const allowed =
    !!user &&
    canImportProducts({
      activeRole: profileRole,
      isSuperadminUser: userIsSuperadmin(user),
      canCreateProduct,
    })

  const [open, setOpen] = useState(false)
  // The run whose progress and result the dialog shows, until the user leaves it.
  const [watchedId, setWatchedId] = useState<number | null>(null)
  const runningId = useRef<number | null>(null)
  const { data: latest } = useLatestImport(allowed ? (customerId ?? null) : null)
  const active = isImportActive(latest)

  const onImportedRef = useRef(onImported)
  onImportedRef.current = onImported

  useEffect(() => {
    if (!latest) return
    if (isImportActive(latest)) {
      runningId.current = latest.import_id
      setWatchedId(latest.import_id)
      return
    }
    if (runningId.current !== latest.import_id) return
    runningId.current = null
    onImportedRef.current()
    const failed = latest.status === "failed" || latest.failed_count > 0
    toast({
      title: failed ? t("productImport.finishedWithErrors") : t("productImport.finished"),
      description: t("productImport.summary", {
        imported: latest.imported_count,
        failed: latest.failed_count,
      }),
      variant: failed ? "destructive" : undefined,
    })
  }, [latest, t, toast])

  if (!allowed || !customerId) return null

  return (
    <>
      <Button
        variant="outline"
        className="px-4 py-2 rounded-lg text-sm font-medium border-[#1162a8] text-[#1162a8] hover:bg-blue-50"
        onClick={() => setOpen(true)}
        data-testid="product-import-open"
      >
        {active ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
        {active && latest
          ? t("productImport.importingCount", { done: latest.items.length, total: latest.total })
          : t("productImport.button")}
      </Button>

      {open && (
        <ImportProductsDialog
          customerId={customerId}
          run={latest && latest.import_id === watchedId ? latest : null}
          onLeaveRun={() => setWatchedId(null)}
          onClose={() => {
            setOpen(false)
            if (!active) setWatchedId(null)
          }}
        />
      )}
    </>
  )
}
