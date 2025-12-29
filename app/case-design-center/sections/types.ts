// Shared types for case-design-center sections

export type ProductCategoryApi = {
  id: number
  name: string
  code?: string
  type?: string
  sequence?: number
  status?: string
  customer_id?: number | null
  image_url?: string
}

export interface Doctor {
  id: number
  first_name: string
  last_name: string
  email: string
  image?: string
}

export interface Lab {
  id: number
  name: string
  customer_id?: number
  logo?: string
}

export interface PatientData {
  name: string
  gender: string
}

export interface Product {
  id: number
  name: string
  image_url?: string
  price?: number
  estimated_days?: number
}

export interface SavedProduct {
  id: string // Unique ID for this saved product
  product: Product
  productDetails: any | null // Full product details from API including extractions
  category: string
  categoryId: number
  subcategory: string
  subcategoryId: number
  maxillaryTeeth: number[]
  mandibularTeeth: number[]
  maxillaryMaterial: string
  maxillaryStumpShade: string
  maxillaryRetention: string
  maxillaryNotes: string
  mandibularMaterial: string
  mandibularRetention: string
  mandibularImplantDetails: string
  createdAt: number // Timestamp
  addedFrom: "maxillary" | "mandibular" // Track which side the product was added from
  // Optional fields for case notes generation
  maxillaryStage?: string
  maxillaryToothShade?: string
  maxillaryPonticDesign?: string
  maxillaryEmbrasure?: string
  maxillaryOcclusalContact?: string
  maxillaryProximalContact?: string
  maxillaryImpression?: string
  maxillaryAddOns?: string[]
  maxillaryContourPonticType?: string
  // Maxillary implant fields
  maxillaryImplantBrand?: string
  maxillaryImplantPlatform?: string
  maxillaryImplantSize?: string
  maxillaryImplantInclusions?: string
  maxillaryAbutmentDetail?: string
  maxillaryAbutmentType?: string
  mandibularStage?: string
  mandibularToothShade?: string
  mandibularPonticDesign?: string
  mandibularEmbrasure?: string
  mandibularOcclusalContact?: string
  mandibularProximalContact?: string
  mandibularImpression?: string
  mandibularAddOns?: string[]
  mandibularContourPonticType?: string
  // Mandibular implant fields
  mandibularImplantBrand?: string
  mandibularImplantPlatform?: string
  mandibularImplantSize?: string
  mandibularImplantInclusions?: string
  mandibularAbutmentDetail?: string
  mandibularAbutmentType?: string
  // API integration fields
  // Rush request data
  rushData?: {
    targetDate: string
    daysSaved?: number
    rushPercentage?: number
    rushFee?: number
    totalPrice?: number
  }
  // Addons (structured format for API)
  maxillaryAddOnsStructured?: Array<{
    addon_id: number
    qty: number
    quantity?: number
    category?: string
    subcategory?: string
    name?: string
    price?: number
  }>
  mandibularAddOnsStructured?: Array<{
    addon_id: number
    qty: number
    quantity?: number
    category?: string
    subcategory?: string
    name?: string
    price?: number
  }>
  // Impressions
  impressions?: Array<{
    impression_id: number
    quantity: number
    notes?: string
  }>
  // Extractions
  extractions?: Array<{
    extraction_id: number
    teeth_numbers: number[]
    notes?: string
  }>
  // Advance fields
  advanceFields?: Array<{
    teeth_number?: number | null
    advance_field_id: number
    advance_field_value?: string | null
    file?: File
  }>
  // Slip-level notes
  slipNotes?: Array<{
    note: string
  }>
  // ID fields for API mapping
  maxillaryShadeBrand?: number
  maxillaryShadeId?: number
  maxillaryGumShadeBrand?: number
  maxillaryGumShadeId?: number
  maxillaryRetentionId?: number
  maxillaryRetentionOptionId?: number
  maxillaryMaterialId?: number
  maxillaryStageId?: number
  maxillaryGradeId?: number
  mandibularShadeBrand?: number
  mandibularShadeId?: number
  mandibularGumShadeBrand?: number
  mandibularGumShadeId?: number
  mandibularRetentionId?: number
  mandibularRetentionOptionId?: number
  mandibularMaterialId?: number
  mandibularStageId?: number
  mandibularGradeId?: number
  // Impression selections with quantities
  maxillaryImpressions?: Array<{
    impression_id: number
    quantity: number
    name?: string
  }>
  mandibularImpressions?: Array<{
    impression_id: number
    quantity: number
    name?: string
  }>
}

