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
