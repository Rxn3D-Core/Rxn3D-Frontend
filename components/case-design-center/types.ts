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
  /** When true, hides Back to Products and makes all panel fields read-only. */
  caseSubmitted?: boolean;
}

export interface AddedProduct {
  id: number;
  product: any;
  arch: string;
  expanded: boolean;
}

export interface NotesProps {
  right1Brand: string;
  right1Platform: string;
  right2Brand: string;
  right2Platform: string;
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
  grades?: any[];
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
