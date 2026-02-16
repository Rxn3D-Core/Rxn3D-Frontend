"use client";

import { useState, useEffect } from "react";
import type { AddedProduct } from "../types";

export function useProductManagement() {
  const [addedProducts, setAddedProducts] = useState<AddedProduct[]>([]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("cdc_added_products");
      if (cached) {
        setAddedProducts(JSON.parse(cached));
      }
    } catch (e) {
      console.error("Failed to load cached products:", e);
    }
  }, []);

  const persistAddedProducts = (products: AddedProduct[]) => {
    setAddedProducts(products);
    try {
      localStorage.setItem("cdc_added_products", JSON.stringify(products));
    } catch (e) {
      console.error("Failed to cache products:", e);
    }
  };

  const handleRemoveAddedProduct = (productId: number) => {
    persistAddedProducts(addedProducts.filter((p) => p.id !== productId));
  };

  const toggleAddedProductExpanded = (productId: number) => {
    persistAddedProducts(
      addedProducts.map((p) =>
        p.id === productId ? { ...p, expanded: !p.expanded } : p
      )
    );
  };

  return {
    addedProducts,
    persistAddedProducts,
    handleRemoveAddedProduct,
    toggleAddedProductExpanded,
  };
}
