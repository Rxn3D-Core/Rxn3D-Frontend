// Product requirements data structure based on the provided table
export interface ProductRequirement {
  product: string;
  initialLoading: string;
  toothStatusSelection: string;
  requiredStatus: string;
  requiredEquivalent: string;
}

export interface ProductToothStatusMapping {
  [productName: string]: {
    initialLoading: string;
    availableStatuses: string[];
    requiredStatuses: string[];
    statusEquivalents: { [status: string]: string };
  };
}

// Complete product requirements data from the provided table
export const PRODUCT_REQUIREMENTS: ProductRequirement[] = [
  // Crowns
  { product: "Full Contour Zirconia Crown", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Prepped", requiredEquivalent: "-" },
  { product: "Full Contour Zirconia Crown", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Lithium Disilicate Crown (e.max)", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Prepped", requiredEquivalent: "-" },
  { product: "Lithium Disilicate Crown (e.max)", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "PFM Crown", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Prepped", requiredEquivalent: "-" },
  { product: "PFM Crown", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Full Cast Crown", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Prepped", requiredEquivalent: "-" },
  { product: "Full Cast Crown", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  
  // Bridges
  { product: "Standard Bridge", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Missing teeth", requiredEquivalent: "Will Extract on Delivery" },
  { product: "Standard Bridge", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Standard Bridge", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Splinted Crowns", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Prepped", requiredEquivalent: "-" },
  { product: "Splinted Crowns", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Cantilever Bridge", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Prepped", requiredEquivalent: "-" },
  { product: "Cantilever Bridge", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Cantilever Bridge", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Implant-Supported Zirconia Bridge", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "Prepped", requiredEquivalent: "-" },
  { product: "Implant-Supported Zirconia Bridge", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Implant-Supported Zirconia Bridge", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Implant", requiredStatus: "-", requiredEquivalent: "-" },
  
  // Full Arch
  { product: "Full Arch Hybrid", initialLoading: "All Missing", toothStatusSelection: "Missing teeth", requiredStatus: "Missing teeth", requiredEquivalent: "Will Extract on Delivery" },
  { product: "Full Arch Hybrid", initialLoading: "All Missing", toothStatusSelection: "Has been extracted", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Full Arch Hybrid", initialLoading: "All Missing", toothStatusSelection: "Will extract on delivery", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Full Arch Hybrid", initialLoading: "All Missing", toothStatusSelection: "Implant", requiredStatus: "-", requiredEquivalent: "-" },
  
  // Inlays/Onlays
  { product: "Lithium Disilicate Inlay/Onlay (e.max)", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Prepped", requiredEquivalent: "-" },
  { product: "Lithium Disilicate Inlay/Onlay (e.max)", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Composite Onlay", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Prepped", requiredEquivalent: "-" },
  { product: "Composite Onlay", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Overlay", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Prepped", requiredEquivalent: "-" },
  { product: "Overlay", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  
  // Veneers
  { product: "Porcelain Veneer", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Prepped", requiredEquivalent: "-" },
  { product: "Porcelain Veneer", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Lithium Disilicate Veneer (e.max)", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Prepped", requiredEquivalent: "-" },
  { product: "Lithium Disilicate Veneer (e.max)", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Composite Veneer", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Prepped", requiredEquivalent: "-" },
  { product: "Composite Veneer", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  
  // Posts & Cores
  { product: "Cast Post & Core", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Prepped", requiredEquivalent: "-" },
  { product: "Cast Post & Core", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Fiber Post & Core", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Prepped", requiredEquivalent: "-" },
  { product: "Fiber Post & Core", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  
  // Maryland Bridge
  { product: "Maryland Bridge (Resin-Bonded)", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Missing teeth", requiredEquivalent: "Will Extract on Delivery" },
  { product: "Maryland Bridge (Resin-Bonded)", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Maryland Bridge (Resin-Bonded)", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  
  // Special Crowns
  { product: "Telescopic Crown", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Prepped", requiredEquivalent: "-" },
  { product: "Telescopic Crown", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Survey Crown (for RPD)", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Prepped", requiredEquivalent: "-" },
  { product: "Survey Crown (for RPD)", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Survey Crown (for RPD)", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Clasp", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Attachment Crown (Precision)", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Prepped", requiredEquivalent: "-" },
  { product: "Attachment Crown (Precision)", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  
  // Orthodontic Appliances
  { product: "Hawley", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Clear (Essix)", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Fixed Lingual", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Band & Loop", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Band & Loop", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Nance Appliance", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Distal Shoe", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Distal Shoe", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Rapid Palatal Expander", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Quad Helix", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Twin Block", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Herbst Appliance", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Bionator", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Clear Aligners", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Tongue Crib", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Thumb Guard", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Surgical Splints", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Repositioning Splints", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  
  // Dentures
  { product: "Conventional Full Denture", initialLoading: "All Missing", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Conventional Full Denture", initialLoading: "All Missing", toothStatusSelection: "Has been extracted", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Conventional Full Denture", initialLoading: "All Missing", toothStatusSelection: "Will extract on delivery", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Immediate Full Denture", initialLoading: "All Missing", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Immediate Full Denture", initialLoading: "All Missing", toothStatusSelection: "Has been extracted", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Immediate Full Denture", initialLoading: "All Missing", toothStatusSelection: "Will extract on delivery", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Overdenture", initialLoading: "Will extract on delivery", toothStatusSelection: "Teeth in mouth", requiredStatus: "Missing teeth", requiredEquivalent: "Will Extract on Delivery" },
  { product: "Overdenture", initialLoading: "Will extract on delivery", toothStatusSelection: "Prepped", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Overdenture", initialLoading: "Will extract on delivery", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Overdenture", initialLoading: "Will extract on delivery", toothStatusSelection: "Has been extracted", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Overdenture", initialLoading: "Will extract on delivery", toothStatusSelection: "Will extract on delivery", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Overdenture", initialLoading: "Will extract on delivery", toothStatusSelection: "Implant", requiredStatus: "-", requiredEquivalent: "-" },
  
  // Partial Dentures
  { product: "Acrylic Partial", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Missing teeth", requiredEquivalent: "Will Extract on Delivery" },
  { product: "Acrylic Partial", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Acrylic Partial", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Has been extracted", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Acrylic Partial", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Will extract on delivery", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Acrylic Partial", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Clasp", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Cast metal", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Missing teeth", requiredEquivalent: "Will Extract on Delivery" },
  { product: "Cast metal", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Cast metal", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Has been extracted", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Cast metal", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Will extract on delivery", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Cast metal", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Clasp", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Flexible/Valplast", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Missing teeth", requiredEquivalent: "Will Extract on Delivery" },
  { product: "Flexible/Valplast", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Flexible/Valplast", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Has been extracted", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Flexible/Valplast", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Will extract on delivery", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Flexible/Valplast", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Clasp", requiredStatus: "-", requiredEquivalent: "-" },
  
  // Flippers
  { product: "Flipper 1 tooth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Missing teeth", requiredEquivalent: "Will Extract on Delivery" },
  { product: "Flipper 1 tooth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Flipper 1 tooth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Has been extracted", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Flipper 1 tooth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Will extract on delivery", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Flipper 1 tooth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Clasp", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Flipper 2 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Missing teeth", requiredEquivalent: "Will Extract on Delivery" },
  { product: "Flipper 2 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Flipper 2 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Has been extracted", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Flipper 2 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Will extract on delivery", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Flipper 2 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Clasp", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Flipper 3 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Missing teeth", requiredEquivalent: "Will Extract on Delivery" },
  { product: "Flipper 3 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Flipper 3 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Has been extracted", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Flipper 3 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Will extract on delivery", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Flipper 3 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Clasp", requiredStatus: "-", requiredEquivalent: "-" },
  
  // Stay Plates
  { product: "Stay plate 4 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Missing teeth", requiredEquivalent: "Will Extract on Delivery" },
  { product: "Stay plate 4 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Stay plate 4 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Has been extracted", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Stay plate 4 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Will extract on delivery", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Stay plate 4 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Clasp", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Stay plate 5 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Missing teeth", requiredEquivalent: "Will Extract on Delivery" },
  { product: "Stay plate 5 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Stay plate 5 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Has been extracted", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Stay plate 5 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Will extract on delivery", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Stay plate 5 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Clasp", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Stay plate 6 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Missing teeth", requiredEquivalent: "Will Extract on Delivery" },
  { product: "Stay plate 6 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Stay plate 6 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Has been extracted", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Stay plate 6 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Will extract on delivery", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Stay plate 6 teeth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Clasp", requiredStatus: "-", requiredEquivalent: "-" },
  
  // Repairs
  { product: "Acrylic Fracture", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Repair", requiredEquivalent: "-" },
  { product: "Acrylic Fracture", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Repair", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Repair/Add 1 tooth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Repair", requiredEquivalent: "-" },
  { product: "Repair/Add 1 tooth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Missing teeth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Repair/Add 1 tooth", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Repair", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Minimum Acrylic Repair", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Minimum Acrylic Repair", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Repair", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Add 1 tooth to flexible", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Repair", requiredEquivalent: "-" },
  { product: "Add 1 tooth to flexible", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Repair", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Welded mesh or clasp", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Clasp", requiredEquivalent: "-" },
  { product: "Welded mesh or clasp", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Clasp", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Welded mesh or clasp", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Repair", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Flexible reline", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Hard reline", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Soft reline", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Complete Denture repair", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Reattachment of broken parts", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Repair", requiredEquivalent: "-" },
  { product: "Reattachment of broken parts", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Repair", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Adjustment of Occlusion", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Repair", requiredEquivalent: "-" },
  { product: "Adjustment of Occlusion", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Repair", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Replace Missing Clasps", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "Clasp", requiredEquivalent: "-" },
  { product: "Replace Missing Clasps", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Clasp", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Replace Missing Clasps", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Repair", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Polish and finish", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  
  // Night Guards & Appliances
  { product: "Hard night guard (Heavy grinders)", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Soft night guard (mild grinders)", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Hard and Soft night guard", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Bleaching trays", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
  { product: "Sleep Apnea Device", initialLoading: "All Teeth in Mouth", toothStatusSelection: "Teeth in mouth", requiredStatus: "-", requiredEquivalent: "-" },
];

// Convert the requirements data into a more usable mapping structure
export const PRODUCT_TOOTH_STATUS_MAPPING: ProductToothStatusMapping = {};

// Process the requirements data to create the mapping
PRODUCT_REQUIREMENTS.forEach(requirement => {
  const productName = requirement.product;
  
  if (!PRODUCT_TOOTH_STATUS_MAPPING[productName]) {
    PRODUCT_TOOTH_STATUS_MAPPING[productName] = {
      initialLoading: requirement.initialLoading,
      availableStatuses: [],
      requiredStatuses: [],
      statusEquivalents: {}
    };
  }
  
  // Add available status if not already present
  if (!PRODUCT_TOOTH_STATUS_MAPPING[productName].availableStatuses.includes(requirement.toothStatusSelection)) {
    PRODUCT_TOOTH_STATUS_MAPPING[productName].availableStatuses.push(requirement.toothStatusSelection);
  }
  
  // Add required status if not empty
  if (requirement.requiredStatus && requirement.requiredStatus !== "-") {
    if (!PRODUCT_TOOTH_STATUS_MAPPING[productName].requiredStatuses.includes(requirement.requiredStatus)) {
      PRODUCT_TOOTH_STATUS_MAPPING[productName].requiredStatuses.push(requirement.requiredStatus);
    }
  }
  
  // Add status equivalent mapping
  if (requirement.requiredEquivalent && requirement.requiredEquivalent !== "-") {
    PRODUCT_TOOTH_STATUS_MAPPING[productName].statusEquivalents[requirement.toothStatusSelection] = requirement.requiredEquivalent;
  }
});

// Helper functions for working with product requirements
export function getAvailableToothStatuses(productName: string): string[] {
  return PRODUCT_TOOTH_STATUS_MAPPING[productName]?.availableStatuses || [];
}

export function getRequiredToothStatuses(productName: string): string[] {
  return PRODUCT_TOOTH_STATUS_MAPPING[productName]?.requiredStatuses || [];
}

export function getStatusEquivalent(productName: string, status: string): string {
  return PRODUCT_TOOTH_STATUS_MAPPING[productName]?.statusEquivalents[status] || "";
}

export function getInitialLoadingRequirement(productName: string): string {
  return PRODUCT_TOOTH_STATUS_MAPPING[productName]?.initialLoading || "";
}

export function isStatusValidForProduct(productName: string, status: string): boolean {
  const availableStatuses = getAvailableToothStatuses(productName);
  return availableStatuses.includes(status);
}

export function getProductNames(): string[] {
  return Object.keys(PRODUCT_TOOTH_STATUS_MAPPING);
}

// Function to determine if a product should be shown based on current tooth statuses
export function shouldShowProduct(
  productName: string, 
  currentToothStatuses: { [toothNumber: number]: string },
  selectedTeeth: number[],
  archType: "maxillary" | "mandibular"
): boolean {
  const productMapping = PRODUCT_TOOTH_STATUS_MAPPING[productName];
  if (!productMapping) return false;

  // Get teeth in the current arch
  const archTeeth = archType === "maxillary" 
    ? Array.from({ length: 16 }, (_, i) => i + 1)
    : Array.from({ length: 16 }, (_, i) => i + 17);

  // Get current statuses for teeth in this arch
  const archStatuses = archTeeth
    .map(tooth => currentToothStatuses[tooth])
    .filter(status => status !== undefined);

  // If no statuses are assigned yet, show all products
  if (archStatuses.length === 0) {
    return true;
  }

  // Check if any of the current statuses are compatible with this product
  const availableStatuses = productMapping.availableStatuses;
  const hasCompatibleStatus = archStatuses.some(status => 
    availableStatuses.includes(status)
  );

  return hasCompatibleStatus;
}

// Function to get products that should be shown based on current tooth statuses
export function getFilteredProducts(
  allProducts: Array<{ name: string; [key: string]: any }>,
  currentToothStatuses: { [toothNumber: number]: string },
  selectedTeeth: number[],
  archType: "maxillary" | "mandibular"
): Array<{ name: string; [key: string]: any }> {
  return allProducts.filter(product => 
    shouldShowProduct(product.name, currentToothStatuses, selectedTeeth, archType)
  );
}

// Status mapping for UI display - Updated to match API colors
export const TOOTH_STATUS_DISPLAY_MAP: { [key: string]: { label: string; color: string; bgColor: string } } = {
  "Teeth in mouth": { label: "Teeth in mouth", color: "#374151", bgColor: "#F3EBD7" }, // Matches API
  "Missing teeth": { label: "Missing teeth", color: "#374151", bgColor: "#D3D3D3" }, // Matches API
  "Will extract on delivery": { label: "Will extract on delivery", color: "#ffffff", bgColor: "#E92520" }, // Matches API
  "Has been extracted": { label: "Has been extracted", color: "#ffffff", bgColor: "#595652" }, // Matches API
  "Prepped": { label: "Prepped", color: "#ffffff", bgColor: "#AFAA9D" }, // Updated to match API
  "Repair": { label: "Repair", color: "#ffffff", bgColor: "#90EE90" },
  "Clasp": { label: "Clasp", color: "#ffffff", bgColor: "#FFB6C1" },
  "Implant": { label: "Implant", color: "#ffffff", bgColor: "#90BDD8" }, // Updated to match API
};
