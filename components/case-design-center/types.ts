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
