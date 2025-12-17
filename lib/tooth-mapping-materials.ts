import * as THREE from 'three';

export interface ToothMappingMaterial {
  color: string;
  emissive?: string;
  opacity?: number;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
}

export const TOOTH_MAPPING_MATERIALS: { [key: string]: ToothMappingMaterial } = {
  teeth_in_mouth: {
    color: '#F3EBD7', // Matches API: "Teeth in mouth"
    emissive: '#000000',
    opacity: 1,
    roughness: 0.8,
    metalness: 0.1,
    transparent: false
  },
  missing_teeth: {
    color: '#D3D3D3', // Updated to match API: "Missing teeth"
    emissive: '#000000',
    opacity: 0.3,
    roughness: 0.9,
    metalness: 0.05,
    transparent: true
  },
  will_extract: {
    color: '#E92520', // Updated to match API: "Will extract on delivery"
    emissive: '#000000',
    opacity: 1,
    roughness: 0.7,
    metalness: 0.2,
    transparent: false
  },
  extracted: {
    color: '#595652', // Updated to match API: "Has been extracted"
    emissive: '#000000',
    opacity: 1,
    roughness: 0.8,
    metalness: 0.1,
    transparent: false
  },
  prepped: {
    color: '#AFAA9D', // Updated to match API: "Prepped"
    emissive: '#000000',
    opacity: 1,
    roughness: 0.6,
    metalness: 0.3,
    transparent: false
  },
  repair: {
    color: '#A0F69A',
    emissive: '#000000',
    opacity: 1,
    roughness: 0.6,
    metalness: 0.3,
    transparent: false
  },
  clasp: {
    color: '#FFD1F9',
    emissive: '#000000',
    opacity: 1,
    roughness: 0.5,
    metalness: 0.4,
    transparent: false
  },
  implant: {
    color: '#90BDD8', // Updated to match API: "Implant"
    emissive: '#000000',
    opacity: 1,
    roughness: 0.3,
    metalness: 0.7,
    transparent: false
  }
};

export function createToothMaterial(mappingMode: string, originalMaterial?: THREE.Material, productColor?: string): THREE.Material {
  const materialConfig = TOOTH_MAPPING_MATERIALS[mappingMode] || TOOTH_MAPPING_MATERIALS.teeth_in_mouth;
  
  // Use product color if provided, otherwise use the mapping mode color
  const colorToUse = productColor || materialConfig.color;
  
  // Create a new material based on the mapping mode or product color
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorToUse),
    emissive: new THREE.Color(materialConfig.emissive || '#000000'),
    opacity: materialConfig.opacity || 1,
    transparent: materialConfig.transparent || false,
    roughness: materialConfig.roughness || 0.8,
    metalness: materialConfig.metalness || 0.1,
  });

  // If we have an original material, try to preserve some properties
  if (originalMaterial) {
    // Preserve texture maps if they exist
    if ((originalMaterial as any).map) {
      (material as any).map = (originalMaterial as any).map;
    }
    if ((originalMaterial as any).normalMap) {
      (material as any).normalMap = (originalMaterial as any).normalMap;
    }
    if ((originalMaterial as any).roughnessMap) {
      (material as any).roughnessMap = (originalMaterial as any).roughnessMap;
    }
    if ((originalMaterial as any).metalnessMap) {
      (material as any).metalnessMap = (originalMaterial as any).metalnessMap;
    }
  }

  return material;
}

export function getToothMappingColor(mappingMode: string): string {
  return TOOTH_MAPPING_MATERIALS[mappingMode]?.color || TOOTH_MAPPING_MATERIALS.teeth_in_mouth.color;
}

export function getToothMappingOpacity(mappingMode: string): number {
  return TOOTH_MAPPING_MATERIALS[mappingMode]?.opacity || 1;
}
