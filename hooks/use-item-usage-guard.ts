"use client"

import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { getAuthToken } from "@/lib/auth-utils"
import { useToast } from "@/hooks/use-toast"
import { resolveLibraryCustomerId } from "@/components/case-design-center/utils/libraryCustomerId"
import { useProductLibraryWarningsStore } from "@/stores/product-library-warnings-store"
import {
  findProductsUsingItem,
  type UsageItemType,
  type UsingProduct,
} from "@/lib/product-library/item-usage"
import type { WarningActionType } from "@/components/ui/warning-action-modal"

const fetchLibraryJson = async (path: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${getAuthToken()}`,
    },
  })
  if (!response.ok) throw new Error(`Usage check failed: ${response.status} ${path}`)
  return response.json()
}

interface GuardRequest {
  itemId: number
  itemName: string
  action: WarningActionType
  /** Performs the disable or delete. Returning false means it failed (no sidebar warning). */
  run: () => unknown | Promise<unknown>
  /** Today's behaviour when no product uses the item (defaults to `run`). */
  onNotUsed?: () => void
}

interface ModalState {
  action: WarningActionType
  itemName: string
  products: UsingProduct[]
  run: () => unknown | Promise<unknown>
  markWarning: boolean
}

/**
 * RXN-89: checks live whether products use an item before it is disabled or deleted,
 * and drives <WarningActionModal {...modalProps} />.
 */
export function useItemUsageGuard(
  type: UsageItemType,
  options: { customerId?: number | null; productsPath?: string } = {},
) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { addWarning } = useProductLibraryWarningsStore()
  const [checkingId, setCheckingId] = useState<number | null>(null)
  // Content is kept after closing so the dialog does not flash empty text while it animates out
  const [modal, setModal] = useState<ModalState | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const productsPath = options.productsPath ?? "/lab-product-library/products"
  const explicitCustomerId = options.customerId

  const requestAction = useCallback(
    async ({ itemId, itemName, action, run, onNotUsed }: GuardRequest) => {
      if (checkingId !== null) return
      setCheckingId(itemId)
      let products: UsingProduct[] | null = null
      try {
        products = await findProductsUsingItem({
          type,
          itemId,
          customerId: explicitCustomerId ?? resolveLibraryCustomerId() ?? null,
          fetchJson: fetchLibraryJson,
        })
      } catch (error) {
        console.error("RXN-89 product usage check failed:", error)
        toast({
          title: t("productLibrary.usageWarning.checkFailedTitle", "Could not check products"),
          description: t(
            "productLibrary.usageWarning.checkFailed",
            "We could not check which products use this item. Please confirm carefully.",
          ),
          variant: "destructive",
        })
      } finally {
        setCheckingId(null)
      }

      if (products && products.length > 0) {
        setModal({ action, itemName, products, run, markWarning: true })
        setIsOpen(true)
        return
      }
      // Not used (or check failed): keep today's behaviour.
      ;(onNotUsed ?? run)()
    },
    [checkingId, explicitCustomerId, t, toast, type],
  )

  /** Opens the same modal without products (plain confirmation), for pages that confirm today. */
  const openConfirm = useCallback(
    (req: Pick<GuardRequest, "itemName" | "action" | "run">) => {
      setModal({ ...req, products: [], markWarning: false })
      setIsOpen(true)
    },
    [],
  )

  const close = useCallback(() => {
    if (!isRunning) setIsOpen(false)
  }, [isRunning])

  const confirm = useCallback(async () => {
    if (!modal) return
    setIsRunning(true)
    try {
      const result = await modal.run()
      if (modal.markWarning && result !== false) {
        addWarning(type)
        addWarning("products")
      }
    } finally {
      setIsRunning(false)
      setIsOpen(false)
    }
  }, [addWarning, modal, type])

  return {
    requestAction,
    openConfirm,
    checkingId,
    modalProps: {
      isOpen: isOpen && modal !== null,
      onClose: close,
      onConfirm: confirm,
      type: modal?.action ?? ("deactivate" as WarningActionType),
      itemName: modal?.itemName ?? "",
      products: modal?.products ?? [],
      productHref: (productId: number) => `${productsPath}?edit=${productId}`,
      isLoading: isRunning,
    },
  }
}
