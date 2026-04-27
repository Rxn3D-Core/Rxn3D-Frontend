"use client";

import { useState } from "react";
import type { AddedProduct } from "../types";

export function useProductManagement(
  externalProducts?: AddedProduct[],
  onProductsChange?: (products: AddedProduct[]) => void
) {
  const [internalProducts, setInternalProducts] = useState<AddedProduct[]>([]);

  // Use external products if provided, otherwise fall back to internal state
  const addedProducts = externalProducts ?? internalProducts;

  const persistAddedProducts = (products: AddedProduct[]) => {
    if (onProductsChange) {
      onProductsChange(products);
    } else {
      setInternalProducts(products);
    }
  };

  const handleRemoveAddedProduct = (productId: number) => {
    persistAddedProducts(addedProducts.filter((p) => p.id !== productId));
  };

  const toggleAddedProductExpanded = (productId: number) => {
    const target = addedProducts.find(p => p.id === productId);
    const willExpand = !target?.expanded;
    persistAddedProducts(
      addedProducts.map((p) =>
        p.id === productId
          ? { ...p, expanded: !p.expanded }
          : willExpand ? { ...p, expanded: false } : p
      )
    );
  };

  const collapseAllAddedProducts = () => {
    persistAddedProducts(addedProducts.map(p => ({ ...p, expanded: false })));
  };

  return {
    addedProducts,
    persistAddedProducts,
    handleRemoveAddedProduct,
    toggleAddedProductExpanded,
    collapseAllAddedProducts,
  };
}
