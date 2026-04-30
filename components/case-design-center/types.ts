import type React from "react";
import type { ImplantDetailData } from "./components/ImplantDetailSection";

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
  /**
   * Opposing extraction selections: maps opposite extraction id → tooth numbers
   * selected on the opposing arch. Only present when the product has opposite_extractions configured.
   */
  oppositeExtractions?: Array<{ extraction_id: number; teeth_numbers: number[] }>;
  /** Tooth numbers checked via the extraction checkbox UI (used for teeth_selection on submit). */
  checkedTeeth?: number[];
  /**
   * Implant detail form data per tooth (keyed by tooth number).
   * Collected from MaxillaryPanel / MandibularPanel at snapshot time.
   */
  implantDetailByTooth?: Record<number, ImplantDetailData>;
  /**
   * Structured addon selections keyed as `${arch}_${toothNumber}`.
   * Each entry carries addon_id and qty for payload submission.
   */
  selectedAddonsByTooth?: Record<string, Array<{ addon_id: number; qty: number }>>;
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
  /**
   * Navigate back to the category-selection step of the new-case wizard.
   * Invoked when a Fixed Restoration accordion is deleted so the user can pick
   * a replacement category/product. Optional arch hint is forwarded to the
   * wizard (when provided) so the correct arch stays preselected.
   */
  onBackToCategories?: (arch?: "maxillary" | "mandibular") => void;
  selectedProductId?: number;
  /** Display name of the selected/initial product (e.g. "Full contour Zirconia"). Used in modal tabs. */
  selectedProductName?: string;
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
  /**
   * Pre-built state from the virtual slip API response.
   * When provided alongside caseSubmitted=true, hydrates all panels on first mount
   * without requiring interactive tooth selection. Has no effect in interactive mode.
   */
  initialSlipState?: VirtualSlipInitialState;
  /** When true the footer acknowledgement checkbox is checked — accordion header borders turn green; orange when false. */
  confirmDetailsChecked?: boolean;
  /** Called whenever any full-screen modal (impression, stage, add-ons, etc.) opens or closes. */
  onAnyModalOpenChange?: (isOpen: boolean) => void;
}

export interface AddedProduct {
  id: number;
  /** The real product ID from the API, used to fetch full ProductApiData when a tooth is assigned. */
  productId?: number;
  product: any;
  arch: string;
  expanded: boolean;
}

/**
 * Pre-built state from the virtual slip details API response,
 * used to hydrate CaseDesignCenter in read-only mode on first mount.
 */
export interface VirtualSlipInitialState {
  /** Tooth numbers selected for the maxillary arch */
  maxillaryTeeth: number[];
  /** Tooth numbers selected for the mandibular arch */
  mandibularTeeth: number[];
  /**
   * Retention types per tooth per arch.
   * Key: tooth number, Value: array of RetentionType objects.
   * Used to show Prep/Pontic badges in read-only panels.
   */
  maxillaryRetentionTypes: Record<number, RetentionType[]>;
  mandibularRetentionTypes: Record<number, RetentionType[]>;
  /**
   * Product API data per tooth, keyed as `${arch}_${toothNumber}` (e.g. "maxillary_4").
   * Drives field rendering inside each tooth accordion.
   */
  toothProducts: Record<string, ProductApiData>;
  /**
   * Card ID that owns each tooth, keyed as `${arch}_${toothNumber}`.
   * 0 = initial product card; other values = AddedProduct.id
   */
  toothProductCards: Record<string, number>;
  /**
   * Shade name selections keyed as `${productId}_${arch}_${fieldType}`
   * (e.g. "prep_4_maxillary_tooth_shade").
   */
  selectedShades: Record<string, string>;
  /**
   * Stage name selections keyed as `${arch}_prep_${toothNumber}` for removables
   * or `${arch}_fixed_${toothNumber}` for fixed restoration.
   */
  selectedStages: Record<string, string>;
  /**
   * Impression quantities keyed as `${productId}_${arch}_${impressionCode}`
   * (e.g. "prep_4_maxillary_alginate").
   */
  selectedImpressions: Record<string, number>;
  /**
   * Completed field steps per tooth keyed as `${arch}_${toothNumber}`.
   * Value is an array of FieldStep strings (e.g. ["grade", "stage", "teeth_shade"]).
   */
  completedFields: Record<string, string[]>;
  /**
   * Field values per tooth, keyed as `${arch}_${toothNumber}`.
   * Each value is a Record<stepName, value>.
   */
  fieldValues: Record<string, Record<string, string>>;
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
  /** Extraction map: toothNumber → extractionCode for non-default boxes (missing, extracting, etc.) */
  maxillaryToothExtractionMap?: Record<number, string>;
  mandibularToothExtractionMap?: Record<number, string>;
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
  // Raw state objects — used as useMemo deps to trigger realtime note updates
  /** Raw field values map — triggers note rebuild on any field change */
  fieldValues?: Record<string, Record<string, string>>;
  /** Raw tooth products map — triggers note rebuild when product assigned */
  toothProducts?: Record<string, ProductApiData>;
  /** Raw tooth product card map — triggers note rebuild on card assignment */
  toothProductCardMap?: Record<string, number>;
  /** Raw selected shades map — triggers note rebuild when shade changes */
  selectedShades?: Record<string, string>;
  /** Raw selected impressions map — triggers note rebuild when impression changes */
  selectedImpressions?: Record<string, number>;
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
  /** Lab default for this product when "Yes" (persisted on product–shade pivot). */
  is_preferred?: string;
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

/** Opposite extraction option from the product API */
export interface ProductOppositeExtraction {
  id: number;
  code: string;
  name: string;
  color?: string | null;
  is_default?: string;
  is_required?: string;
  is_optional?: string;
  min_teeth?: number | null;
  max_teeth?: number | null;
}

/** Teeth shade entry from product details API (includes brand for shade-guide grouping). */
export interface ProductTeethShadeBrand {
  id: number;
  name: string;
  system_name: string;
  brand_color?: string | null;
  status?: string;
}

export interface ProductTeethShade {
  id: number;
  teeth_shade_id?: number;
  name: string;
  code?: string | null;
  sequence?: number;
  status?: string;
  price?: string | number | null;
  brand?: ProductTeethShadeBrand | null;
}

export interface ProductAddon {
  id: number;
  name: string;
  code: string;
  sequence?: number;
  status?: string;
  is_default?: string;
  price?: string | number | null;
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
  /** May be brand groups with nested shades or a flat list, depending on API shape. */
  teeth_shades?: unknown[];
  extractions?: ProductExtraction[];
  addons?: ProductAddon[];
  advance_fields?: ProductAdvanceField[];
  teeth_shades?: ProductTeethShade[];
  opposite_impression?: "Yes" | "No";
  opposite_extractions?: ProductOppositeExtraction[];
  retention_options?: Array<{
    id: number;
    name: string;
    image_url: string | null;
    tooth_chart_type: string | null;
    status?: string;
    sequence?: number;
    lab_retention_option?: {
      name?: string;
      image_url?: string | null;
      tooth_chart_type?: string | null;
    };
  }>;
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
  has_impression?: "Yes" | "No" | null;
  has_variation?: string | boolean | null;
  variations?: Array<{
    id?: number;
    sort_order?: number;
    image_url?: string | null;
    teeth_spec?: string | null;
    name_template?: string | null;
  }>;
}

/** Product selected for a specific tooth in Prep/Pontic flow */
export interface ToothProductSelection {
  arch: Arch;
  toothNumber: number;
  product: ProductApiData;
}
