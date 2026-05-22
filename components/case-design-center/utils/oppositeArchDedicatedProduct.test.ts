import { describe, expect, it } from "vitest";
import {
  oppositeArchHasDedicatedProduct,
  shouldShowOpposingProductMirror,
} from "./oppositeArchDedicatedProduct";
import type { AddedProduct } from "../types";

describe("oppositeArchHasDedicatedProduct", () => {
  it("returns true when an added product exists on the opposite arch", () => {
    const added: AddedProduct[] = [
      { id: 1, arch: "mandibular", productId: 10, product: { id: 10, name: "X" } as AddedProduct["product"] },
    ];
    expect(
      oppositeArchHasDedicatedProduct("mandibular", "maxillary", 5, added)
    ).toBe(true);
  });

  it("returns true when wizard product lives on the opposite arch", () => {
    expect(oppositeArchHasDedicatedProduct("mandibular", "mandibular", 5, [])).toBe(true);
    expect(oppositeArchHasDedicatedProduct("maxillary", "maxillary", 5, [])).toBe(true);
    expect(oppositeArchHasDedicatedProduct("mandibular", "both", 5, [])).toBe(true);
  });

  it("returns false when only primary arch has wizard product and no added opposite products", () => {
    expect(oppositeArchHasDedicatedProduct("mandibular", "maxillary", 5, [])).toBe(false);
    expect(oppositeArchHasDedicatedProduct("maxillary", "mandibular", 5, [])).toBe(false);
  });
});

describe("shouldShowOpposingProductMirror", () => {
  const base = {
    initialProductHasOppositeSection: true,
    hostMatchesInitialArch: true,
    primaryArchTeethSelected: true,
    initialArch: "maxillary" as const,
    selectedProductId: 1,
    addedProducts: [] as AddedProduct[],
    bothArchesHaveRemovables: false,
  };

  it("shows mirror for mandibular opposing when maxillary-primary and no mand dedicated product", () => {
    expect(
      shouldShowOpposingProductMirror({
        ...base,
        oppositeArch: "mandibular",
      })
    ).toBe(true);
  });

  it("hides mirror when user added a product on the opposite arch", () => {
    expect(
      shouldShowOpposingProductMirror({
        ...base,
        oppositeArch: "mandibular",
        addedProducts: [
          { id: 2, arch: "mandibular", productId: 99, product: { id: 99 } as AddedProduct["product"] },
        ],
      })
    ).toBe(false);
  });

  it("hides mirror when both arches already have removables work", () => {
    expect(
      shouldShowOpposingProductMirror({
        ...base,
        oppositeArch: "mandibular",
        bothArchesHaveRemovables: true,
      })
    ).toBe(false);
  });
});
