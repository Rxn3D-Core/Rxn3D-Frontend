// Slip Data Transformer
// Transforms frontend data structure to API format

import type {
  SlipCreationPayload,
  SlipCreationCase,
  SlipCreationSlip,
  SlipCreationProduct,
  SlipCreationRush,
  SlipCreationImpression,
  SlipCreationExtraction,
  SlipCreationAddon,
  SlipCreationAdvanceField,
  SlipCreationNote,
} from "@/services/slip-creation-service";

// Frontend data types
interface Lab {
  id: number;
  name: string;
  logo?: string;
}

interface Doctor {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  image?: string;
}

interface PatientData {
  name: string;
  gender: string;
}

interface User {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface SavedProduct {
  id: string;
  product: {
    id: number;
    name: string;
    image_url?: string;
    price?: number;
    estimated_days?: number;
  };
  productDetails: any | null;
  category: string;
  categoryId: number;
  subcategory: string;
  subcategoryId: number;
  maxillaryTeeth: number[];
  mandibularTeeth: number[];
  maxillaryMaterial: string;
  maxillaryStumpShade: string;
  maxillaryRetention: string;
  maxillaryNotes: string;
  mandibularMaterial: string;
  mandibularRetention: string;
  mandibularImplantDetails: string;
  createdAt: number;
  addedFrom: "maxillary" | "mandibular";
  // Optional fields for case notes generation
  maxillaryStage?: string;
  maxillaryToothShade?: string;
  maxillaryPonticDesign?: string;
  maxillaryEmbrasure?: string;
  maxillaryOcclusalContact?: string;
  maxillaryProximalContact?: string;
  maxillaryImpression?: string;
  maxillaryAddOns?: string[];
  maxillaryContourPonticType?: string;
  // Maxillary implant fields
  maxillaryImplantBrand?: string;
  maxillaryImplantPlatform?: string;
  maxillaryImplantSize?: string;
  maxillaryImplantInclusions?: string;
  maxillaryAbutmentDetail?: string;
  maxillaryAbutmentType?: string;
  mandibularStage?: string;
  mandibularToothShade?: string;
  mandibularPonticDesign?: string;
  mandibularEmbrasure?: string;
  mandibularOcclusalContact?: string;
  mandibularProximalContact?: string;
  mandibularImpression?: string;
  mandibularAddOns?: string[];
  mandibularContourPonticType?: string;
  // Mandibular implant fields
  mandibularImplantBrand?: string;
  mandibularImplantPlatform?: string;
  mandibularImplantSize?: string;
  mandibularImplantInclusions?: string;
  mandibularAbutmentDetail?: string;
  mandibularAbutmentType?: string;
  // API integration fields
  rushData?: {
    targetDate: string;
    daysSaved?: number;
    rushPercentage?: number;
    rushFee?: number;
    totalPrice?: number;
  };
  maxillaryAddOnsStructured?: Array<{
    addon_id: number;
    qty: number;
    quantity?: number;
    category?: string;
    subcategory?: string;
    name?: string;
    price?: number;
  }>;
  mandibularAddOnsStructured?: Array<{
    addon_id: number;
    qty: number;
    quantity?: number;
    category?: string;
    subcategory?: string;
    name?: string;
    price?: number;
  }>;
  impressions?: Array<{
    impression_id: number;
    quantity: number;
    notes?: string;
  }>;
  extractions?: Array<{
    extraction_id: number;
    teeth_numbers: number[];
    notes?: string;
  }>;
  advanceFields?: Array<{
    teeth_number?: number | null;
    advance_field_id: number;
    advance_field_value?: string | null;
    file?: File;
  }>;
  slipNotes?: Array<{
    note: string;
  }>;
  // ID fields for API mapping
  maxillaryShadeBrand?: number;
  maxillaryShadeId?: number;
  maxillaryGumShadeBrand?: number;
  maxillaryGumShadeId?: number;
  maxillaryRetentionId?: number;
  maxillaryRetentionOptionId?: number;
  maxillaryMaterialId?: number;
  maxillaryStageId?: number;
  maxillaryGradeId?: number;
  mandibularShadeBrand?: number;
  mandibularShadeId?: number;
  mandibularGumShadeBrand?: number;
  mandibularGumShadeId?: number;
  mandibularRetentionId?: number;
  mandibularRetentionOptionId?: number;
  mandibularMaterialId?: number;
  mandibularStageId?: number;
  mandibularGradeId?: number;
}

interface TransformOptions {
  selectedLab: Lab | null;
  selectedDoctor: Doctor | null;
  patientData: PatientData | null;
  savedProducts: SavedProduct[];
  user: User | null;
  locationId?: number;
}

/**
 * Transform frontend data structure to API payload format
 */
export function transformToSlipCreationPayload(
  options: TransformOptions
): SlipCreationPayload {
  const { selectedLab, selectedDoctor, patientData, savedProducts, user, locationId } = options;

  // Validate required data
  if (!selectedLab) {
    throw new Error("Lab is required");
  }
  if (!selectedDoctor) {
    throw new Error("Doctor is required");
  }
  if (!patientData || !patientData.name) {
    throw new Error("Patient name is required");
  }
  if (savedProducts.length === 0) {
    throw new Error("At least one product is required");
  }
  if (!user || !user.id) {
    throw new Error("User information is required");
  }

  // Determine office_id and lab_id based on user role
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const customerId = typeof window !== "undefined" ? localStorage.getItem("customerId") : null;
  
  let office_id: number;
  let lab_id: number;

  if (role === "lab_admin") {
    // For lab_admin: lab_id = customerId, office_id = selectedLab.id (which is actually an office)
    lab_id = customerId ? Number(customerId) : selectedLab.id;
    office_id = selectedLab.id;
  } else {
    // For office_admin/doctor: office_id = customerId, lab_id = selectedLab.id
    office_id = customerId ? Number(customerId) : selectedLab.id;
    lab_id = selectedLab.id;
  }

  // Transform case data
  const caseData: SlipCreationCase = {
    lab_id,
    office_id,
    doctor: selectedDoctor.id,
    patient_name: patientData.name.trim(),
    gender: patientData.gender ? capitalizeFirstLetter(patientData.gender) : undefined,
    case_status: "In Progress",
  };

  // Group products by slip (for now, we'll create one slip per product pair or single product)
  // API allows multiple products per slip (max 2: Upper and Lower)
  const productsBySlip: SlipCreationProduct[][] = [];
  
  // Group maxillary and mandibular products together
  const maxillaryProducts = savedProducts.filter(p => p.maxillaryTeeth.length > 0);
  const mandibularProducts = savedProducts.filter(p => p.mandibularTeeth.length > 0);

  // Create slip products: pair Upper and Lower if both exist, otherwise create separate slips
  if (maxillaryProducts.length > 0 && mandibularProducts.length > 0) {
    // Pair them up (take first of each for now - could be enhanced to match by product)
    const maxProduct = maxillaryProducts[0];
    const mandProduct = mandibularProducts[0];
    
    const upperProduct = transformProduct(maxProduct, "Upper");
    const lowerProduct = transformProduct(mandProduct, "Lower");
    
    productsBySlip.push([upperProduct, lowerProduct]);
    
    // Add remaining products as separate slips
    maxillaryProducts.slice(1).forEach(p => {
      productsBySlip.push([transformProduct(p, "Upper")]);
    });
    mandibularProducts.slice(1).forEach(p => {
      productsBySlip.push([transformProduct(p, "Lower")]);
    });
  } else {
    // Add all maxillary products
    maxillaryProducts.forEach(p => {
      productsBySlip.push([transformProduct(p, "Upper")]);
    });
    // Add all mandibular products
    mandibularProducts.forEach(p => {
      productsBySlip.push([transformProduct(p, "Lower")]);
    });
  }

  // Transform slips
  const slips: SlipCreationSlip[] = productsBySlip.map((products, index) => {
    // Get slip notes from first product (if any)
    const firstProduct = savedProducts.find(
      p => (p.maxillaryTeeth.length > 0 && products.some(prod => prod.type === "Upper")) ||
           (p.mandibularTeeth.length > 0 && products.some(prod => prod.type === "Lower"))
    );
    
    const slip: SlipCreationSlip = {
      location_id: locationId,
      created_by: user.id,
      products,
      notes: firstProduct?.slipNotes?.map(n => ({ note: n.note })),
    };
    
    return slip;
  });

  return {
    case: caseData,
    slips,
  };
}

/**
 * Transform a SavedProduct to SlipCreationProduct
 */
function transformProduct(
  savedProduct: SavedProduct,
  type: "Upper" | "Lower"
): SlipCreationProduct {
  const isUpper = type === "Upper";
  const teeth = isUpper ? savedProduct.maxillaryTeeth : savedProduct.mandibularTeeth;
  
  // Get stage and grade IDs
  const stageId = isUpper 
    ? savedProduct.maxillaryStageId 
    : savedProduct.mandibularStageId;
  const gradeId = isUpper
    ? savedProduct.maxillaryGradeId
    : savedProduct.mandibularGradeId;

  // Get shade IDs
  const teethShadeBrandId = isUpper
    ? savedProduct.maxillaryShadeBrand
    : savedProduct.mandibularShadeBrand;
  const teethShadeId = isUpper
    ? savedProduct.maxillaryShadeId
    : savedProduct.mandibularShadeId;
  const gumShadeBrandId = isUpper
    ? savedProduct.maxillaryGumShadeBrand
    : savedProduct.mandibularGumShadeBrand;
  const gumShadeId = isUpper
    ? savedProduct.maxillaryGumShadeId
    : savedProduct.mandibularGumShadeId;

  // Get retention IDs
  const retentionId = isUpper
    ? savedProduct.maxillaryRetentionId
    : savedProduct.mandibularRetentionId;
  const retentionOptionId = isUpper
    ? savedProduct.maxillaryRetentionOptionId
    : savedProduct.mandibularRetentionOptionId;

  // Get material ID
  const materialId = isUpper
    ? savedProduct.maxillaryMaterialId
    : savedProduct.mandibularMaterialId;

  // Get notes
  const notes = isUpper
    ? savedProduct.maxillaryNotes
    : savedProduct.mandibularImplantDetails || savedProduct.mandibularNotes || "";

  // Transform rush data
  const rush: SlipCreationRush | undefined = savedProduct.rushData
    ? {
        is_rush: true,
        requested_rush_date: savedProduct.rushData.targetDate,
      }
    : undefined;

  // Transform addons
  const addons: SlipCreationAddon[] | undefined = (() => {
    const addOnsData = isUpper
      ? savedProduct.maxillaryAddOnsStructured
      : savedProduct.mandibularAddOnsStructured;
    
    if (!addOnsData || addOnsData.length === 0) return undefined;
    
    return addOnsData.map(addon => ({
      addon_id: addon.addon_id,
      quantity: addon.qty || addon.quantity || 1,
      notes: undefined, // Could be added if needed
    }));
  })();

  // Transform impressions (if available)
  const impressions: SlipCreationImpression[] | undefined = savedProduct.impressions
    ? savedProduct.impressions.map(imp => ({
        impression_id: imp.impression_id,
        quantity: imp.quantity,
        notes: imp.notes,
      }))
    : undefined;

  // Transform extractions (if available)
  const extractions: SlipCreationExtraction[] | undefined = savedProduct.extractions
    ? savedProduct.extractions.map(ext => ({
        extraction_id: ext.extraction_id,
        teeth_numbers: ext.teeth_numbers,
        notes: ext.notes,
      }))
    : undefined;

  // Transform advance fields (if available)
  const advanceFields: SlipCreationAdvanceField[] | undefined = savedProduct.advanceFields
    ? savedProduct.advanceFields.map((field, index) => ({
        teeth_number: field.teeth_number ?? null,
        advance_field_id: field.advance_field_id,
        advance_field_value: field.advance_field_value ?? null,
        file: field.file,
        file_index: field.file ? index : undefined,
      }))
    : undefined;

  const product: SlipCreationProduct = {
    type,
    category_id: savedProduct.categoryId,
    product_id: savedProduct.product.id,
    subcategory_id: savedProduct.subcategoryId,
    stage_id: stageId,
    grade_id: gradeId,
    teeth_selection: teeth.length > 0 ? teeth.sort((a, b) => a - b).join(",") : undefined,
    teeth_shade_brand_id: teethShadeBrandId,
    teeth_shade_id: teethShadeId,
    gum_shade_brand_id: gumShadeBrandId,
    gum_shade_id: gumShadeId,
    retention_id: retentionId,
    retention_option_id: retentionOptionId,
    material_id: materialId,
    status: "Draft",
    notes: notes || undefined,
    rush,
    impressions,
    extractions,
    addons,
    advance_fields: advanceFields,
  };

  return product;
}

/**
 * Helper to capitalize first letter
 */
function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Extract files from advance fields for multipart upload
 */
export function extractFilesFromAdvanceFields(
  savedProducts: SavedProduct[]
): File[] {
  const files: File[] = [];
  
  savedProducts.forEach(product => {
    if (product.advanceFields) {
      product.advanceFields.forEach(field => {
        if (field.file) {
          files.push(field.file);
        }
      });
    }
  });
  
  return files;
}

