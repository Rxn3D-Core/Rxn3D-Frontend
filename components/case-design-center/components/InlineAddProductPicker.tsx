"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLibraryCategories } from "@/hooks/use-library-categories";
import {
  useLibraryProducts,
  useSubcategoryProductCounts,
} from "@/hooks/use-library-products";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductImagePreview } from "./ProductImagePreview";
import type { Arch } from "../types";
import { resolveLibraryCustomerId } from "../utils/libraryCustomerId";

export type InlineAddProductResult = {
  category: string;
  categoryName: string;
  product: string;
  material: string;
  materialName: string;
  arch: Arch;
};

type PickerStep = "category" | "subcategory" | "material";

function SelectionGrid({
  items,
  selectedId,
  onSelect,
}: {
  items: { id: number; name: string; img: string }[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className={`flex flex-col overflow-hidden rounded-[7px] border-2 w-[120px] sm:w-[140px] transition-all hover:border-[#1162A8] hover:bg-[#1162A8]/5 ${
            selectedId === item.id
              ? "border-[#1162A8] bg-[#1162A8]/5"
              : "border-[#d9d9d9] bg-white"
          }`}
        >
          <span
            className="text-[11px] sm:text-[12px] font-normal text-black text-center px-1 py-1.5 leading-tight"
            style={{ fontFamily: "Verdana, sans-serif" }}
          >
            {item.name}
          </span>
          <ProductImagePreview imageUrl={item.img} altText={item.name} />
        </button>
      ))}
    </div>
  );
}

/** Compact category → subcategory → product picker for adding a product on one arch. */
export function InlineAddProductPicker({
  arch,
  labId,
  excludedProductIds = [],
  excludedSubcategoryIds = [],
  onComplete,
  onCancel,
}: {
  arch: Arch;
  labId?: number | null;
  excludedProductIds?: number[];
  excludedSubcategoryIds?: number[];
  onComplete: (result: InlineAddProductResult) => void;
  onCancel: () => void;
}) {
  const customerId = useMemo(
    () => resolveLibraryCustomerId(labId),
    [labId]
  );
  const canFetchLibrary = typeof customerId === "number";
  const [step, setStep] = useState<PickerStep>("category");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSubProduct, setSelectedSubProduct] = useState<number | null>(null);

  const {
    categoriesAsWizard,
    subcategoriesByCategoryId,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useLibraryCategories({
    customerId,
    lang: "en",
    enabled: canFetchLibrary,
  });

  const {
    productsAsWizard,
    isLoading: productsLoading,
    error: productsError,
  } = useLibraryProducts({
    customerId,
    subcategoryId: selectedSubProduct ?? undefined,
    perPage: 50,
    page: 1,
    enabled: canFetchLibrary && step === "material" && selectedSubProduct != null,
  });

  const filteredProducts = useMemo(
    () => productsAsWizard.filter((p) => !excludedProductIds.includes(p.id)),
    [productsAsWizard, excludedProductIds]
  );

  const currentSubcategoryIds = useMemo(
    () => (subcategoriesByCategoryId[selectedCategory ?? -1] ?? []).map((s) => s.id),
    [subcategoriesByCategoryId, selectedCategory]
  );

  const { counts: subcategoryProductCounts, products: subcategoryProducts } =
    useSubcategoryProductCounts({
      customerId,
      subcategoryIds: currentSubcategoryIds,
      enabled: canFetchLibrary && step === "subcategory" && selectedCategory != null,
    });

  const categoryName =
    categoriesAsWizard.find((c) => c.id === selectedCategory)?.name ?? "";
  const subProducts = subcategoriesByCategoryId[selectedCategory ?? -1] ?? [];
  const filteredSubProducts = useMemo(
    () => subProducts.filter((p) => !excludedSubcategoryIds.includes(p.id)),
    [subProducts, excludedSubcategoryIds]
  );
  const subProductName =
    filteredSubProducts.find((p) => p.id === selectedSubProduct)?.name ?? "";

  const finishWithMaterial = useCallback(
    (
      materialId: string,
      materialName: string,
      subId: number,
      catId: number,
      catLabel: string
    ) => {
      onComplete({
        category: String(catId),
        categoryName: catLabel,
        product: String(subId),
        material: materialId,
        materialName,
        arch,
      });
    },
    [arch, onComplete]
  );

  useEffect(() => {
    if (step !== "material" || productsLoading || productsError) return;
    if (selectedCategory == null || selectedSubProduct == null) return;
    if (filteredProducts.length !== 1) return;
    const only = filteredProducts[0];
    const catLabel =
      categoriesAsWizard.find((c) => c.id === selectedCategory)?.name ?? "";
    finishWithMaterial(
      String(only.id),
      only.name,
      selectedSubProduct,
      selectedCategory,
      catLabel
    );
  }, [
    step,
    filteredProducts,
    productsLoading,
    productsError,
    selectedCategory,
    selectedSubProduct,
    categoriesAsWizard,
    finishWithMaterial,
  ]);

  const handleSubcategorySelect = (subId: number) => {
    const count = subcategoryProductCounts?.[subId];
    const only = subcategoryProducts?.[subId]?.[0];
    const catLabel =
      categoriesAsWizard.find((c) => c.id === selectedCategory)?.name ?? "";
    if (selectedCategory == null) return;
    if (count === 1 && only) {
      setSelectedSubProduct(subId);
      finishWithMaterial(
        String(only.id),
        only.name,
        subId,
        selectedCategory,
        catLabel
      );
      return;
    }
    setSelectedSubProduct(subId);
    setStep("material");
  };

  const archLabel = arch === "maxillary" ? "Maxillary" : "Mandibular";

  return (
    <div className="mt-3 rounded-lg border-2 border-dashed border-[#1162A8] bg-[#f8fbff] overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#dfeefb] border-b border-[#c5d9ed]">
        <span className="text-[13px] font-semibold text-[#1162A8]">
          Add {archLabel} product
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-[12px] font-semibold text-[#7f7f7f] hover:text-[#1162A8] hover:underline"
        >
          Cancel
        </button>
      </div>

      <div className="px-3 py-3 max-h-[min(420px,55vh)] overflow-y-auto">
        {step === "subcategory" && (
          <button
            type="button"
            onClick={() => {
              setStep("category");
              setSelectedSubProduct(null);
            }}
            className="text-[12px] font-semibold text-[#1162A8] hover:underline mb-2"
          >
            ← Back to categories
          </button>
        )}
        {step === "material" && (
          <button
            type="button"
            onClick={() => setStep("subcategory")}
            className="text-[12px] font-semibold text-[#1162A8] hover:underline mb-2"
          >
            ← Back to subcategories
          </button>
        )}

        {step === "category" && (
          <>
            <p className="text-[12px] text-[#7f7f7f] mb-2 text-center">Choose a category</p>
            {!canFetchLibrary || categoriesLoading ? (
              <div className="flex flex-wrap justify-center gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="w-[120px] h-[100px] rounded-[7px]" />
                ))}
              </div>
            ) : categoriesError ? (
              <p className="text-[12px] text-red-600 text-center">Unable to load categories.</p>
            ) : categoriesAsWizard.length === 0 ? (
              <p className="text-[12px] text-[#7f7f7f] text-center">No categories available.</p>
            ) : (
              <SelectionGrid
                items={categoriesAsWizard}
                selectedId={selectedCategory}
                onSelect={(id) => {
                  setSelectedCategory(id);
                  setSelectedSubProduct(null);
                  setStep("subcategory");
                }}
              />
            )}
          </>
        )}

        {step === "subcategory" && selectedCategory != null && (
          <>
            <p className="text-[12px] text-[#7f7f7f] mb-2 text-center">
              Choose subcategory — {categoryName}
            </p>
            <SelectionGrid
              items={filteredSubProducts}
              selectedId={selectedSubProduct}
              onSelect={handleSubcategorySelect}
            />
          </>
        )}

        {step === "material" && selectedSubProduct != null && (
          <>
            <p className="text-[12px] text-[#7f7f7f] mb-2 text-center">
              Choose product — {subProductName}
            </p>
            {productsLoading ? (
              <div className="flex flex-wrap justify-center gap-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="w-[120px] h-[100px] rounded-[7px]" />
                ))}
              </div>
            ) : productsError ? (
              <p className="text-[12px] text-red-600 text-center">Unable to load products.</p>
            ) : filteredProducts.length === 0 ? (
              <p className="text-[12px] text-[#7f7f7f] text-center">No products available for this arch.</p>
            ) : (
              <SelectionGrid
                items={filteredProducts}
                selectedId={null}
                onSelect={(id) => {
                  if (selectedCategory == null || selectedSubProduct == null) return;
                  const materialName =
                    filteredProducts.find((p) => p.id === id)?.name ?? "";
                  const catLabel =
                    categoriesAsWizard.find((c) => c.id === selectedCategory)?.name ??
                    "";
                  finishWithMaterial(
                    String(id),
                    materialName,
                    selectedSubProduct,
                    selectedCategory,
                    catLabel
                  );
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
