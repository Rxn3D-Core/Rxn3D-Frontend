"use client"

import { CreateGradeModal } from "@/components/product-management/create-grade-modal"
import { CreateImpressionModal } from "@/components/product-management/create-impression-modal"
import { CreateGumShadeModal } from "@/components/product-management/create-gum-shade-modal"
import { CreateTeethShadeModal } from "@/components/product-management/create-teeth-shade-modal"
import { CreateMaterialModal } from "@/components/product-management/create-material-modal"
import { AddAddOnModal } from "@/components/product-management/add-add-on-modal"

export type ProductCustomItemKind = "grades" | "impressions" | "gumShade" | "teethShade" | "material" | "addOns"

const noop = () => {}

interface ProductCustomItemModalProps {
  kind: ProductCustomItemKind | null
  /** Called after a successful save and after cancel */
  onClose: () => void
}

/** "Add Custom" in the product modal: the same create form as the item's own library page. */
export function ProductCustomItemModal({ kind, onClose }: ProductCustomItemModalProps) {
  switch (kind) {
    case "grades":
      return <CreateGradeModal isOpen onClose={onClose} />
    case "impressions":
      return <CreateImpressionModal isOpen onClose={onClose} onChanges={noop} />
    case "gumShade":
      return <CreateGumShadeModal isOpen onClose={onClose} onChanges={noop} />
    case "teethShade":
      return <CreateTeethShadeModal isOpen onClose={onClose} onHasChangesChange={noop} />
    case "material":
      return <CreateMaterialModal isOpen onClose={onClose} />
    case "addOns":
      return <AddAddOnModal isOpen onClose={onClose} onHasChangesChange={noop} />
    default:
      return null
  }
}
