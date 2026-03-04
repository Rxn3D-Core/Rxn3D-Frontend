import type React from "react";

/** Snapshot of per-product design data collected at submit time */
export interface SlipProductSnapshot {
  /** "Upper" or "Lower" */
  type: string;
  productId: number;
  productApiData: ProductApiData | null;
  /** Tooth numbers selected for this product card on this arch */
  teethNumbers: number[];
  /** Representative tooth number (first in group — field values are keyed here) */
  repToothNumber: number;
  /** Field values keyed by step name */
  fieldValues: Record<string, string>;
  /** Stage name selected for this product */
  stageName: string | null;
  /** Impression selections: { impressionCode: quantity } */
  impressions: Record<string, number>;
  /** Rush data if applicable */
  rush: Record<string, any> | null;
  /** Product card ID (0 = initial, otherwise AddedProduct.id) */
  cardId: number;
  /**
   * Selected shades keyed as `${productId}_${arch}_${fieldType}`.
   * Provides teeth/stump shade names for resolving shade IDs at submit time.
   */
  selectedShades: Record<string, string>;
  /** The active shade guide name (e.g. "Vita Classical") */
  shadeGuide: string;
}

export interface CaseDesignProps {
  right1Brand: string;
  setRight1Brand: (v: string) => void;
  right1Platform: string;
  setRight1Platform: (v: string) => void;
  right2Brand: string;
  setRight2Brand: (v: string) => void;
  right2Platform: string;
  setRight2Platform: (v: string) => void;
  onAddProduct?: (arch: "maxillary" | "mandibular") => void;
  onBackToProducts?: () => void;
  selectedProductId?: number;
  /** Category name of the selected/initial product (e.g. "Removable restoration"). When set, used to hide retention popover for Removables. */
  selectedProductCategoryName?: string;
  /** When true, hides Back to Products and makes all panel fields read-only. */
  caseSubmitted?: boolean;
  /** Called whenever the "all teeth have impression complete" state changes. */
  onReadinessChange?: (ready: boolean) => void;
  /** Called with a human-readable label of the first incomplete required field, or null when complete. */
  onIncompleteFieldChange?: (label: string | null) => void;
  /** Called whenever any tooth-status required-validation error appears or clears. */
  onToothStatusValidationChange?: (hasValidation: boolean) => void;
  /** Externally controlled list of added products (from page-level state) */
  addedProducts?: AddedProduct[];
  /** Called when addedProducts changes internally (toggle expand, remove) */
  onProductsChange?: (products: AddedProduct[]) => void;
  /** Initial arch selection from Removable Restoration dropdown — controls which panels are shown */
  initialArch?: "maxillary" | "mandibular" | "both";
  /**
   * When provided, CaseDesignCenter assigns a collector function to this ref.
   * The parent calls slipCollectorRef.current() at submit time to collect
   * the current product snapshots needed to build the slip payload.
   */
  slipCollectorRef?: React.MutableRefObject<(() => SlipProductSnapshot[]) | null>;
}

export interface AddedProduct {
  id: number;
  /** The real product ID from the API, used to fetch full ProductApiData when a tooth is assigned. */
  productId?: number;
  product: any;
  arch: string;
  expanded: boolean;
}

export interface NotesProps {
  right1Brand: string;
  right1Platform: string;
  right2Brand: string;
  right2Platform: string;
  /** All tooth retention types per arch */
  maxillaryRetentionTypes: Record<number, Array<RetentionType>>;
  mandibularRetentionTypes: Record<number, Array<RetentionType>>;
  /** Selected teeth arrays (for removables) */
  maxillaryTeeth: number[];
  mandibularTeeth: number[];
  /** Get the API product assigned to a tooth */
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null;
  /** Get the value for a field step on a tooth */
  getFieldValue: (arch: Arch, toothNumber: number, step: any) => string;
  /** Get the selected shade for a product/arch/fieldType */
  getSelectedShade: (productId: string, arch: Arch, fieldType: "tooth_shade" | "stump_shade") => string;
  /** Selected stages keyed by product key (e.g. "fixed_4") */
  selectedStages: Record<string, string>;
  /** Get display text for impression */
  getImpressionDisplayText: (productId: string, arch: Arch, toothNumber?: number) => string;
  /** Implant inclusions for right1 and right2 */
  right1Inclusion: string;
  right2Inclusion: string;
  /** Added products list */
  addedProducts: AddedProduct[];
  /** Product card ID that "owns" a tooth */
  getToothProductCard: (arch: Arch, toothNumber: number) => number;
}

export type Arch = "maxillary" | "mandibular";
export type RetentionType = "Implant" | "Prep" | "Pontic";
export type ShadeFieldType = "tooth_shade" | "stump_shade";

export interface ShadeSelectionState {
  arch: Arch | null;
  fieldType: ShadeFieldType | null;
  productId: string | null;
}

export interface RetentionPopoverState {
  arch: Arch | null;
  toothNumber: number | null;
}

export interface ActiveCardType {
  right1: "brand" | "platform" | null;
  right2: "brand" | "platform" | null;
}

/** Stage configuration from the product API */
export interface StageConfiguration {
  grade: string;
  material: string;
  gum_shade: string;
  retention: string;
  impression: string;
  teeth_shade: string;
}

/** Product stage from the product API */
export interface ProductStage {
  id: number;
  stage_id: number;
  name: string;
  code: string;
  sequence: number;
  status: string;
  price: string;
  days: number;
  is_common: string;
  days_to_pickup: number;
  days_to_process: number;
  days_to_deliver: number;
  is_releasing_stage: string;
  is_default: string;
  is_stage_with_addons: string;
  stage_configurations: StageConfiguration;
  image_url: string | null;
}

/** Product impression from the product API */
export interface ProductImpression {
  id: number;
  impression_id: number;
  name: string;
  code: string;
  image_url: string | null;
  sequence: number;
  status: string;
  price: string | null;
}

/** Option shape for the impression selection modal (id, name, code, image_url, value, label) */
export interface ImpressionOptionForModal {
  id: number;
  name: string;
  code?: string;
  description?: string;
  image_url?: string | null;
  value: string;
  label: string;
}

/** Convert product API impressions to modal options; uses code as value for stable keys. */
export function productImpressionsToModalOptions(
  impressions: ProductImpression[] | undefined
): ImpressionOptionForModal[] {
  if (!impressions?.length) return [];
  return impressions
    .filter((i) => i.status === "Active")
    .sort((a, b) => a.sequence - b.sequence)
    .map((i) => ({
      id: i.id,
      name: i.name,
      code: i.code,
      image_url: i.image_url ?? undefined,
      value: i.code,
      label: i.name,
    }));
}

/** Gum shade from the product API */
export interface ProductGumShade {
  id: number;
  gum_shade_id: number;
  name: string;
  code: string | null;
  sequence: number;
  status: string;
  price: string | null;
  brand: {
    id: number;
    name: string;
    system_name: string;
    status: string;
    sequence: number;
  };
  color_code_top: string;
  color_code_middle: string;
  color_code_bottom: string;
}

/** Extraction from the product API */
export interface ProductExtraction {
  id: number;
  extraction_id: number;
  name: string;
  code: string;
  color: string | null;
  url: string | null;
  is_default: string;
  is_required: string;
  is_optional: string;
  min_teeth: number | null;
  max_teeth: number | null;
  is_image_extraction: string;
  image_url: string | null;
  sequence: number;
  status: string;
  price: string | null;
}

/** Advance field from the product API */
export interface ProductAdvanceField {
  id: number;
  name: string;
  field_type: string;
  sequence?: number;
  status?: string;
  options?: any[];
  [key: string]: any;
}

/** Grade from the product API */
export interface ProductGrade {
  id: number;
  grade_id: number;
  name: string;
  code: string;
  sequence: number;
  is_default: string;
  status: string;
  price: string;
  created_at?: string;
  updated_at?: string;
}

/** Product from the products API */
export interface ProductApiData {
  id: number;
  name: string;
  code: string;
  status: string;
  sequence: number;
  is_single_stage: string;
  has_multiple_grades: string;
  is_teeth_based_price: string;
  customer_id: number | null;
  is_custom: string;
  price: string;
  image_url: string | null;
  min_days_to_process: number | null;
  max_days_to_process: number | null;
  grades?: ProductGrade[];
  stages?: ProductStage[];
  impressions?: ProductImpression[];
  gum_shades?: ProductGumShade[];
  extractions?: ProductExtraction[];
  advance_fields?: ProductAdvanceField[];
  subcategory?: {
    id: number;
    name: string;
    code: string;
    category_id: number;
    image_url: string | null;
    category?: {
      id: number;
      name: string;
      code: string;
      type: string;
      image_url: string | null;
    };
  };
}

/** Product selected for a specific tooth in Prep/Pontic flow */
export interface ToothProductSelection {
  arch: Arch;
  toothNumber: number;
  product: ProductApiData;
}
