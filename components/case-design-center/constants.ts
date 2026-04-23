export const implantBrandPlatforms: Record<string, string[]> = {
  "Truabutment": ["Truscan", "Truscan NP", "Truscan WP", "NovaBridge"],
  "Nobel Biocare": ["Bone Level", "Bone Level Tapered", "Active", "Replace Select"],
  "Xtechnology": ["KATANA Zirconia", "KATANA UTML", "KATANA STML"],
  "H Implants": ["Legacy", "Legacy Zimmer", "SwissPlus", "Tapered Screw-Vent"],
  "Other Brands": ["Straumann BL", "Straumann TL", "Astra TX", "Astra EV", "Zimmer TSV", "BioHorizons"],
};

export const implantBrandList = Object.keys(implantBrandPlatforms);

/**
 * Fallback list used when a product's teeth_shades (brand.system_name) cannot be resolved.
 * Real options are derived per-product in `useCaseDesignState` from the product detail API.
 */
export const shadeGuideOptions: string[] = [];


export const mockImpressions = [
  { id: 1, name: "Clean Impression", code: "clean", value: "clean_impression", label: "Clean Impression" },
  { id: 2, name: "STL File", code: "stl", value: "stl_file", label: "STL File" },
  { id: 3, name: "PVS", code: "pvs", value: "pvs", label: "PVS" },
  { id: 4, name: "Light Body", code: "light_body", value: "light_body", label: "Light Body" },
  { id: 5, name: "Alginate", code: "alginate", value: "alginate", label: "Alginate" },
  { id: 6, name: "Digital Scan", code: "digital_scan", value: "digital_scan", label: "Digital Scan" },
];
