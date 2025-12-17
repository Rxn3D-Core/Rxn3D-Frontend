/**
 * Shared color constants for extraction types
 * These colors must be consistent across all components (cards, 3D chart, etc.)
 */

export const EXTRACTION_TYPE_COLORS = {
  'Teeth in mouth': '#F3EBD7', // Light beige
  'Missing teeth': '#D3D3D3', // Light gray
  'Will extract on delivery': '#E92520', // Red
  'Has been extracted': '#595652', // Dark gray
  'Prepped': '#AFAA9D', // Medium gray
  'Implant': '#90BDD8' // Light blue
} as const;

export type ExtractionType = keyof typeof EXTRACTION_TYPE_COLORS;

/**
 * Get the color for a specific extraction type
 */
export function getExtractionTypeColor(extractionType: string): string {
  return EXTRACTION_TYPE_COLORS[extractionType as ExtractionType] || '#D3D3D3';
}

/**
 * Get all extraction types with their colors
 */
export function getAllExtractionTypes() {
  return Object.entries(EXTRACTION_TYPE_COLORS).map(([name, color]) => ({
    name,
    color,
    code: name.toLowerCase().replace(/\s+/g, '_'),
    id: name.toLowerCase().replace(/\s+/g, '_')
  }));
}
