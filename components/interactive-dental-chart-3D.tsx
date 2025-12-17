"use client"

import React, { useState, useRef, useEffect, Suspense, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronsRight, ChevronsLeft } from "lucide-react"
import { Canvas, useLoader, useThree, useFrame } from "@react-three/fiber"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import { OrbitControls, useProgress, Html } from '@react-three/drei'
import * as THREE from 'three'
import { Environment } from '@react-three/drei';
import { useModelPreload } from "@/contexts/3d-model-preload-context"
import { useProductToothStatus } from "@/hooks/use-product-tooth-status"
import { TOOTH_STATUS_DISPLAY_MAP, getFilteredProducts } from "@/lib/product-requirements"
import { ToothMappingToolbar } from "@/components/tooth-mapping-toolbar"
import { MissingTeethCards } from "@/components/missing-teeth-cards"
import { createToothMaterial, getToothMappingColor, getToothMappingOpacity } from "@/lib/tooth-mapping-materials"
import { useDentalValidation } from "@/hooks/use-dental-validation"
import ValidationModal from "@/components/validation-modal"
import { useTeethSelectionStore } from "@/stores/teeth-selection-store"
import { EXTRACTION_TYPE_COLORS } from "@/lib/extraction-type-colors"
// import { useRenderTime, useLazyLoad } from "@/lib/performance-optimizations"

// ---------- Interfaces ----------
interface ToothInfo {
  number: number
  name: string
  type: string
  function: string
  location: string
  characteristics: string[]
  commonIssues: string[]
}

// ---------- Helper Functions ----------
/**
 * Determines if teeth cards should be shown based on extraction criteria
 * Shows teeth cards when: is_default="Yes" OR is_required="Yes" OR is_optional="Yes"
 */
function shouldShowTeethCards(productDetails: any, extractionName: string, productId?: string, getProductExtractions?: (productId: string) => any): boolean {
  // First check productDetails - try both data.extractions and extractions
  let extractions = productDetails?.data?.extractions || productDetails?.extractions;

  // If not found in productDetails and we have a productId, check Zustand store
  if ((!extractions || !Array.isArray(extractions)) && productId && getProductExtractions) {
    const storeData = getProductExtractions(productId);
    extractions = storeData?.extractions;
  }

  if (!extractions || !Array.isArray(extractions)) {
    return false;
  }

  const extraction = extractions.find((ext: any) => ext.name === extractionName);

  if (!extraction) {
    return false;
  }

  // Check if extraction meets the criteria
  return extraction.status === "Active" && (
    extraction.is_default === "Yes" ||
    extraction.is_required === "Yes" ||
    extraction.is_optional === "Yes"
  );
}

interface ProductBadgeInfo {
  abbreviation: string
  color: string
  hasAddOn: boolean
}

interface InteractiveDentalChartProps {
  type: "maxillary" | "mandibular"
  selectedTeeth: number[]
  onToothToggle: (toothNumber: number) => void
  title: string
  productTeethMap: { [key: number]: ProductBadgeInfo[] }
  productButtons: {
    id: string
    name: string
    teeth: string
    color: string
    maxillaryTeeth?: string
    mandibularTeeth?: string
  }[]
  visibleArch: string | null
  onProductButtonClick: (productId: string) => void
  openAccordionItem?: string
  isCaseSubmitted?: boolean
  onStatusAssign?: (status: string, teeth: number[]) => void
  selectedProduct?: string | null
  onProductSelect?: (productName: string | null) => void
  // Tooth mapping toolbar props
  showToothMappingToolbar?: boolean
  onToothMappingModeSelect?: (modeId: string | null) => void
  selectedToothMappingMode?: string | null
  // Missing teeth tracking
  missingTeeth?: number[]
  extractedTeeth?: number[]
  willExtractTeeth?: number[]
  onAllTeethMissing?: () => void
  onAutoSelectTeethInMouth?: (teeth: number[]) => void
  // Tooth status tracking for product filtering
  currentToothStatuses?: { [toothNumber: number]: string }
  // Product color application
  selectedProductForColor?: string | null
  onProductColorSelect?: (productId: string | null) => void
  // Will extract color application
  selectedWillExtractForColor?: boolean
  onWillExtractColorSelect?: (selected: boolean) => void
  // Product details from API
  productDetails?: any
  // Hide product selection initially
  hideProductSelection?: boolean
  // Validation props
  hasScans?: boolean
  implantCount?: number
  onValidationError?: (error: any) => void
  // New props for missing teeth cards integration
  selectedExtractionType?: string | null
  onExtractionTypeSelect?: (extractionType: string | null) => void
  // Layout mode for initial centered 2-column view
  layoutMode?: '2-column' | 'default'
  // Collapse/expand functionality
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onTeethSelectionChange?: (teeth: number[], archType?: 'maxillary' | 'mandibular') => void
  onClearTeethSelection?: () => void
  // Zustand store integration for extraction data
  getProductExtractions?: (productId: string) => any
}

// ---------- Progressive Loading Component ----------
function ProgressiveLoader() {
  const { progress, active } = useProgress()
  
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center p-8 bg-white/90 rounded-lg shadow-lg z-10">
        <div className="relative w-20 h-20 mb-4">
          {/* Progress ring */}
        
          {/* Center percentage */}
      
        </div>
        
      </div>
    </Html>
  )
}

// ---------- Animated Tooth Component ----------
function AnimatedTooth({ 
  children, 
  isPrepped, 
  isWillExtract,
  isActiveSelection,
  toothNumber 
}: { 
  children: React.ReactNode
  isPrepped: boolean
  isWillExtract: boolean
  isActiveSelection: boolean
  toothNumber: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime()
      
      if (isPrepped) {
        // Make prepped teeth bigger with no animation
        groupRef.current.scale.setScalar(1.2) // 20% bigger
        groupRef.current.rotation.set(0, 0, 0) // No rotation
      } else if (isWillExtract) {
        // No animation for will extract teeth - keep them static
        groupRef.current.scale.setScalar(1)
        groupRef.current.rotation.set(0, 0, 0)
      } else if (isActiveSelection) {
        // Create a gentle pulsing effect for active selection
        const pulse = Math.sin(time * 3) * 0.5 + 0.5 // Slower pulse
        const scale = 1 + (pulse * 0.08)
        groupRef.current.scale.setScalar(scale)
      } else {
        // Reset scale and rotation to normal
        groupRef.current.scale.setScalar(1)
        groupRef.current.rotation.set(0, 0, 0)
      }
    }
  })
  
  return (
    <group ref={groupRef}>
      {children}
    </group>
  )
}

// ---------- Optimized DRACO Loader Setup ----------
const setupDRACOLoader = () => {
  try {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    dracoLoader.setDecoderConfig({ 
      type: 'js',
      // Optimize for performance
      workerLimit: 2,
      taskScheduler: true
    });
    return dracoLoader;
  } catch (error) {
    return null;
  }
};

// ---------- Simple GLTF Loader Function ----------
const loadGLTFModel = (url: string, onSuccess: (gltf: any) => void, onError: (error: string) => void, onProgress?: (progress: number) => void) => {
  const loader = new GLTFLoader();
  const dracoLoader = setupDRACOLoader();
  if (dracoLoader) {
    loader.setDRACOLoader(dracoLoader);
  }

  // Simple loading without optimization for now
  loader.load(
    url,
    (loadedGltf) => {
      onSuccess(loadedGltf);
    },
    (progress) => {
      // Progress callback for better UX
      if (progress.lengthComputable && onProgress) {
        const percentComplete = (progress.loaded / progress.total) * 100;
        onProgress(percentComplete);
      }
    },
    (error) => {
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  );
};

// ---------- Model Optimization Function ----------
const optimizeModel = (gltf: any) => {
  try {
    // Try to clone the scene first
    let optimizedScene;
    try {
      optimizedScene = gltf.scene.clone();
    } catch (cloneError) {
      optimizedScene = gltf.scene;
    }
    
    // Create a deep copy of the GLTF object
    const optimized = {
      ...gltf,
      scene: optimizedScene
    };
    
    // Optimize the scene in place to avoid cloning issues
    optimized.scene.traverse((child: THREE.Object3D) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh;
        
        // Optimize geometry
        if (mesh.geometry) {
          // Note: mergeVertices() is deprecated in newer Three.js versions
          // The geometry is already optimized during export
          
          // Optimize attributes
          if (mesh.geometry.attributes.position) {
            mesh.geometry.attributes.position.needsUpdate = true;
          }
        }
        
        // Optimize materials
        if (mesh.material) {
          const material = mesh.material as THREE.Material;
          
          // Enable texture compression
          if ((material as any).map) {
            const texture = (material as any).map;
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = 4; // Reduce anisotropy for performance
          }
          
          // Optimize material properties
          if ((material as any).roughness !== undefined) {
            (material as any).roughness = Math.max(0.1, (material as any).roughness);
          }
          
          // Disable features that impact performance
          (material as any).transparent = false;
          (material as any).alphaTest = 0.5;
        }
      }
    });
    
    return optimized;
  } catch (error) {
    // Return the original model if optimization fails
    return gltf;
  }
};

// ---------- LOD (Level of Detail) Component ----------
function LODTeeth({
  selectedTeeth,
  onToothToggle,
  type,
  groupRef,
  onLoaded,
  isCaseSubmitted = false,
  selectedToothMappingMode = null,
  selectedProductForColor = null,
  productButtons = [],
  selectedWillExtractForColor = false,
  isChartLocked = false,
  selectedExtractionType = null,
  productDetails = null
}: {
  selectedTeeth: number[];
  onToothToggle: (toothNumber: number) => void;
  type: "maxillary" | "mandibular";
  groupRef: any;
  onLoaded?: () => void;
  isCaseSubmitted?: boolean;
  selectedToothMappingMode?: string | null;
  selectedProductForColor?: string | null;
  productButtons?: any[];
  selectedWillExtractForColor?: boolean;
  isChartLocked?: boolean;
  selectedExtractionType?: string | null;
  productDetails?: any;
}) {
  // Use teeth selection store for per-extraction-type selection
  const { getExtractionTypeTeeth } = useTeethSelectionStore();
  const { isModelLoaded, isModelLoading } = useModelPreload()
  const modelUrl = type === "maxillary" ? "/images/glb/Upper_Teeth.glb" : "/images/glb/Lower_Teeth.glb"
  
  // Use simple loader with state management
  const [gltf, setGltf] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the model when component mounts
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    loadGLTFModel(
      modelUrl,
      (loadedGltf) => {
        if (mounted) {
          setGltf(loadedGltf);
          setLoading(false);
        }
      },
      (errorMessage) => {
        if (mounted) {
          setError(errorMessage);
          setLoading(false);
        }
      },
      (progress) => {
        // Progress callback for better UX
      }
    );

    return () => {
      mounted = false;
    };
  }, [modelUrl]);
  
  // Performance optimization: measure render time (commented out for now)
  // useRenderTime(`LODTeeth-${type}`);

  // Memoize materials to prevent recreation on every render
  const materialCache = useRef<Map<string, { original: THREE.Material; selected: THREE.Material }>>(new Map());
  
  // Memoize meshes array to prevent recalculation
  const meshes = useMemo(() => {
    if (!gltf) return [];
    
    const meshArray: THREE.Mesh[] = [];
    gltf.scene.traverse((child: THREE.Object3D) => {
      if ((child as any).isMesh) {
        meshArray.push(child as THREE.Mesh);
      }
    });
    return meshArray;
  }, [gltf]);

  // Memoize tooth number extraction to prevent recalculation
  const getToothNumberFromMeshName = useCallback((meshName: string, type: "maxillary" | "mandibular", idx: number): number => {
    if (type === "maxillary") {
      const match = meshName.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        if (num >= 1 && num <= 16) return num;
        if (num >= 11 && num <= 18) return num - 10;
        if (num >= 21 && num <= 28) return num - 12;
      }
    } else {
      const match = meshName.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        if (num >= 17 && num <= 32) return num;
        if (num >= 31 && num <= 38) return num - 14;
        if (num >= 41 && num <= 48) return num - 16;
      }
    }
    return type === "maxillary" ? idx + 1 : idx + 17;
  }, [type]);

  // Get effective selected teeth based on extraction type
  const getEffectiveSelectedTeeth = useCallback(() => {
    if (selectedExtractionType) {
      // If an extraction type is selected, use the per-extraction-type selection
      const extractionTypeTeeth = getExtractionTypeTeeth(selectedExtractionType, type);
      return extractionTypeTeeth;
    } else {
      // Otherwise, use the regular selected teeth
      return selectedTeeth;
    }
  }, [selectedExtractionType, type, getExtractionTypeTeeth, selectedTeeth]);

  // Get all teeth assigned to extraction types for visual display
  const getAllExtractionTypeTeeth = useCallback(() => {
    const allExtractionTeeth: { [toothNumber: number]: string } = {};
    
    // Get all available extraction types from product details
    const extractions = productDetails?.data?.extractions || productDetails?.extractions || [];
    
    
    if (!extractions || extractions.length === 0) {
      // Use fallback extraction types when productDetails doesn't have extraction data
      const fallbackExtractionTypes = ['Teeth in mouth', 'Missing teeth', 'Will extract on delivery', 'Has been extracted', 'Prepped', 'Implant'];
      
      fallbackExtractionTypes.forEach((extractionTypeName: string) => {
        const teethForType = getExtractionTypeTeeth(extractionTypeName, type);
        teethForType.forEach(toothNumber => {
          allExtractionTeeth[toothNumber] = extractionTypeName;
        });
      });
    } else {
      extractions.forEach((extraction: any) => {
        if (extraction.status === "Active" && (extraction.is_default === "Yes" || extraction.is_required === "Yes" || extraction.is_optional === "Yes")) {
          const teethForType = getExtractionTypeTeeth(extraction.name, type);
          teethForType.forEach(toothNumber => {
            allExtractionTeeth[toothNumber] = extraction.name;
          });
        }
      });
    }
    
    return allExtractionTeeth;
  }, [productDetails, getExtractionTypeTeeth, type]);


  // Clear material cache when dependencies change
  useEffect(() => {
    materialCache.current.clear();
  }, [selectedExtractionType, selectedToothMappingMode, selectedProductForColor, selectedWillExtractForColor, getEffectiveSelectedTeeth, getAllExtractionTypeTeeth]);

  // Memoize material creation and caching with tooth mapping support
  const getMaterials = useCallback((mesh: THREE.Mesh, toothNumber: number) => {
    const effectiveSelectedTeeth = getEffectiveSelectedTeeth();
    const isToothSelected = effectiveSelectedTeeth.includes(toothNumber);
    const allExtractionTypeTeeth = getAllExtractionTypeTeeth();
    const toothExtractionType = allExtractionTypeTeeth[toothNumber];
    
    const cacheKey = `${mesh.uuid}-${toothNumber}-${selectedToothMappingMode || 'default'}-${selectedProductForColor || 'no-product'}-${selectedWillExtractForColor ? 'will-extract' : 'no-will-extract'}-${selectedExtractionType || 'no-extraction'}-${isToothSelected ? 'selected' : 'unselected'}-${toothExtractionType || 'no-assignment'}`;
    
    if (!materialCache.current.has(cacheKey)) {
      const originalMaterial = mesh.material as THREE.Material;
      
      let selectedMaterial: THREE.Material;
      
      // Get product color if a product is selected for color application
      let productColor: string | undefined;
      if (selectedProductForColor) {
        const selectedProduct = productButtons.find(p => p.id === selectedProductForColor);
        productColor = selectedProduct?.color;
      }
      
      // Get extraction type color for the tooth's assigned extraction type
      let extractionTypeColor: string | undefined;
      if (toothExtractionType) {
        // First try to get color from product details
        const extractions = productDetails?.data?.extractions || productDetails?.extractions || [];
        const extractionType = extractions.find((ext: any) => ext.name === toothExtractionType);
        if (extractionType?.color) {
          extractionTypeColor = extractionType?.color;
        } else {
          // Use shared colors for consistency across components
          extractionTypeColor = EXTRACTION_TYPE_COLORS[toothExtractionType as keyof typeof EXTRACTION_TYPE_COLORS];
        }
      }
      
      // Priority order: 
      // 1. Tooth's assigned extraction type color (ALWAYS show - this is the key change)
      // 2. Currently selected extraction type color (for active selection)
      // 3. Tooth mapping mode
      // 4. Will extract color
      // 5. Product color
      // 6. Default selection
      
      if (toothExtractionType && extractionTypeColor) {
        // ALWAYS apply the tooth's assigned extraction type color - this is the main fix
        selectedMaterial = createToothMaterial('teeth_in_mouth', originalMaterial, extractionTypeColor);
        
        // Make the color more vibrant and distinctive
        if ((selectedMaterial as any).color) {
          const currentColor = (selectedMaterial as any).color;
          // Increase saturation and brightness for better visibility
          currentColor.multiplyScalar(1.3); // Make colors 30% brighter for better visibility
        }
        
        // Add special effects for different extraction types
        if (toothExtractionType === 'Prepped') {
          // Keep original tooth color but add a subtle glow
          if ((selectedMaterial as any).emissive) {
            (selectedMaterial as any).emissive.setHex(0x444400); // Warm glow
          }
          // Add a custom property to track prepped state
          (selectedMaterial as any).isPrepped = true;
        } else if (toothExtractionType === 'Missing teeth') {
          // Make missing teeth semi-transparent but still visible
          (selectedMaterial as any).opacity = 0.6;
          (selectedMaterial as any).transparent = true;
          // Add a subtle glow to make them more visible
          if ((selectedMaterial as any).emissive) {
            (selectedMaterial as any).emissive.setHex(0x222222);
          }
        } else if (toothExtractionType === 'Implant') {
          // Add metallic effect for implants with more shine
          (selectedMaterial as any).metalness = 0.9;
          (selectedMaterial as any).roughness = 0.1;
          // Add emissive glow for implants
          if ((selectedMaterial as any).emissive) {
            (selectedMaterial as any).emissive.setHex(0x002244);
          }
        } else if (toothExtractionType === 'Will extract on delivery') {
          // Add pulsing red glow for teeth to be extracted
          if ((selectedMaterial as any).emissive) {
            (selectedMaterial as any).emissive.setHex(0x440000);
          }
          // Add a custom property for pulsing animation
          (selectedMaterial as any).isWillExtract = true;
          (selectedMaterial as any).animationTime = 0;
        } else if (toothExtractionType === 'Has been extracted') {
          // Make extracted teeth darker but still visible
          if ((selectedMaterial as any).color) {
            (selectedMaterial as any).color.multiplyScalar(0.8); // Slightly less dark
          }
          // Add subtle emissive glow
          if ((selectedMaterial as any).emissive) {
            (selectedMaterial as any).emissive.setHex(0x222222);
          }
        } else if (toothExtractionType === 'Teeth in mouth') {
          // Add subtle glow for teeth in mouth
          if ((selectedMaterial as any).emissive) {
            (selectedMaterial as any).emissive.setHex(0x002200);
          }
        }
        
        // If this tooth is also currently selected for the active extraction type, add extra emphasis
        if (selectedExtractionType === toothExtractionType && isToothSelected) {
          // Add a stronger glow for active selection
          if ((selectedMaterial as any).emissive) {
            const currentEmissive = (selectedMaterial as any).emissive.getHex();
            (selectedMaterial as any).emissive.setHex(currentEmissive + 0x333333); // Much brighter
          }
          // Mark as active selection (no animation)
          (selectedMaterial as any).isActiveSelection = true;
        }
      } else if (selectedExtractionType && isToothSelected) {
        // Apply currently selected extraction type color to selected teeth
        const currentExtractionTypeColor = EXTRACTION_TYPE_COLORS[selectedExtractionType as keyof typeof EXTRACTION_TYPE_COLORS];
        selectedMaterial = createToothMaterial('teeth_in_mouth', originalMaterial, currentExtractionTypeColor);
        
        // Add special effects for "Prepped" extraction type
        if (selectedExtractionType === 'Prepped') {
          if ((selectedMaterial as any).emissive) {
            (selectedMaterial as any).emissive.setHex(0x222200); // Subtle warm glow
          }
          (selectedMaterial as any).isPrepped = true;
        }
      } else if (selectedToothMappingMode) {
        selectedMaterial = createToothMaterial(selectedToothMappingMode, originalMaterial, productColor);
      } else if (selectedWillExtractForColor && isToothSelected) {
        // Apply will extract red color to selected teeth (matching card color)
        selectedMaterial = createToothMaterial('teeth_in_mouth', originalMaterial, '#E92520');
      } else if (productColor && isToothSelected) {
        // Apply product color to selected teeth
        selectedMaterial = createToothMaterial('teeth_in_mouth', originalMaterial, productColor);
      } else {
        // Default selection material (darker for visibility)
        selectedMaterial = originalMaterial.clone();
        if ((selectedMaterial as any).color) {
          const color = (selectedMaterial as any).color;
          color.setRGB(0.4, 0.4, 0.4); // Lighter dark color for selection
        }
      }

      materialCache.current.set(cacheKey, {
        original: originalMaterial,
        selected: selectedMaterial
      });
    }

    return materialCache.current.get(cacheKey)!;
  }, [selectedToothMappingMode, selectedProductForColor, productButtons, selectedWillExtractForColor, selectedExtractionType, productDetails, getEffectiveSelectedTeeth, getAllExtractionTypeTeeth]);

  useEffect(() => {
    if (!gltf || !groupRef.current) return;
    
    // Setup model with original material properties preserved
    gltf.scene.traverse((child: THREE.Object3D) => {
      if ((child as any).isMesh && (child as THREE.Mesh).material) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.Material;
        
        // Set initial teeth color to a natural white only if there is no texture map
        if ((material as any).color && !(material as any).map) {
          // Use a slightly off-white color for natural teeth
          (material as any).color.setHex(0xF3F3F3);
        }
        // Keep original texture quality without modifications
        if ((material as any).map) {
          (material as any).map.needsUpdate = true;
          (material as any).map.flipY = false;
          // Standard texture quality settings
          (material as any).map.minFilter = THREE.LinearMipmapLinearFilter;
          (material as any).map.magFilter = THREE.LinearFilter;
        }
        
        // Preserve all texture maps as-is
        ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'].forEach(prop => {
          if ((material as any)[prop]) {
            (material as any)[prop].needsUpdate = true;
            (material as any)[prop].minFilter = THREE.LinearMipmapLinearFilter;
            (material as any)[prop].magFilter = THREE.LinearFilter;
          }
        });
        
        material.needsUpdate = true;
      }
    });

    const scaleTarget = 8;
    groupRef.current.scale.set(scaleTarget, scaleTarget, scaleTarget);
    
    const box = new THREE.Box3().setFromObject(groupRef.current);
    const center = new THREE.Vector3();
    box.getCenter(center);
    groupRef.current.position.set(-center.x, -center.y, -center.z);
    
    if (onLoaded) onLoaded();
  }, [gltf, groupRef, onLoaded]);

  // For mandibular, rotate 180deg around X to mirror the arch
  const groupRotation: [number, number, number] = useMemo(() => 
    type === "maxillary"
      ? [-Math.PI / 1.3, 0, Math.PI]
      : [-Math.PI / 1.3, 0, Math.PI], 
    [type]
  );

  // Render the component based on state
 

  if (error) {
    return (
      <Html center>
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <p className="text-red-600 font-medium">Failed to load 3D model</p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </Html>
    );
  }

  if (!gltf) {
    return null;
  }

  // Render the 3D scene
  return (
    <group ref={groupRef} rotation={groupRotation}>
      {meshes.map((child, idx) => {
        const isNumberMesh = /^\d+$/.test(child.name) || /number|label/i.test(child.name);
        const toothNumber = getToothNumberFromMeshName(child.name, type, idx);
        const effectiveSelectedTeeth = getEffectiveSelectedTeeth();
        const isSelected = effectiveSelectedTeeth.includes(toothNumber);

        if (isNumberMesh) {
          // Handle number meshes with extraction type-aware color handling
          const allExtractionTypeTeeth = getAllExtractionTypeTeeth();
          const toothExtractionType = allExtractionTypeTeeth[toothNumber];
          
          // Determine number color based on extraction type
          let numberColor = 0x000000; // Default black
          if (toothExtractionType === 'Will extract on delivery') {
            numberColor = 0xFFFFFF; // White for will extract teeth (red background)
          } else if (toothExtractionType === 'Has been extracted') {
            numberColor = 0xFFFFFF; // White for extracted teeth (dark background)
          } else if (toothExtractionType === 'Missing teeth') {
            numberColor = 0x000000; // Black for missing teeth (light background)
          } else if (toothExtractionType === 'Teeth in mouth') {
            numberColor = 0x000000; // Black for teeth in mouth (light background)
          } else if (toothExtractionType === 'Prepped') {
            numberColor = 0x000000; // Black for prepped teeth (light background)
          } else if (toothExtractionType === 'Implant') {
            numberColor = 0x000000; // Black for implants (light background)
          }
          
          let numberMaterial = child.material;
          if (Array.isArray(child.material)) {
            numberMaterial = child.material.map(mat => {
              if ((mat as any).color) {
                const cloned = mat.clone();
                (cloned as any).color.setHex(numberColor);
                return cloned;
              }
              return mat;
            });
          } else if ((child.material as any).color) {
            const cloned = child.material.clone();
            (cloned as any).color.setHex(numberColor);
            numberMaterial = cloned;
          }

          // Check if this tooth is prepped to make the number bigger
          const isPrepped = toothExtractionType === 'Prepped';
          
          // Apply bigger scale for prepped teeth numbers
          const numberScale = isPrepped ? 1.2 : 1.0;

          return (
            <mesh
              key={`${child.uuid}-number`}
              geometry={child.geometry}
              material={numberMaterial}
              position={child.position}
              rotation={child.rotation}
              scale={[child.scale.x * numberScale, child.scale.y * numberScale, child.scale.z * numberScale]}
            />
          );
        }

        // Use cached materials to prevent recreation
        const materials = getMaterials(child, toothNumber);
        
        // Get extraction type for this tooth to determine material
        const allExtractionTypeTeeth = getAllExtractionTypeTeeth();
        const toothExtractionType = allExtractionTypeTeeth[toothNumber];
        
        // Apply material based on extraction type assignment
        let material;
        if (toothExtractionType) {
          // This tooth has an extraction type assignment - use the extraction type material
          material = materials.selected;
        } else if (selectedToothMappingMode && isSelected) {
          // Use mapping material if a mode is selected and tooth is selected
          material = materials.selected;
        } else if (isSelected) {
          // Use selected material for selected teeth without extraction type
          material = materials.selected;
        } else {
          // Use original material for unassigned teeth
          material = materials.original;
        }
        
        // Check if this tooth should be animated based on extraction type
        const isPrepped = toothExtractionType === 'Prepped';
        const isWillExtract = toothExtractionType === 'Will extract on delivery';
        const isActiveSelection = selectedExtractionType === toothExtractionType && isSelected;
        
        const toothMesh = (
          <mesh
            key={`${child.uuid}-${toothNumber}`}
            geometry={child.geometry}
            material={material}
            position={child.position}
            rotation={child.rotation}
            scale={child.scale}
            onClick={(e: any) => {
              e.stopPropagation();
              // Disable tooth selection when case is submitted or chart is locked
              if (!isCaseSubmitted && !isChartLocked) {
                onToothToggle(toothNumber);
              }
            }}
            onPointerEnter={() => {
              // Show pointer cursor only if case is not submitted, chart is not locked, and extraction type is selected
              if (!isCaseSubmitted && !isChartLocked && selectedExtractionType) {
                document.body.style.cursor = 'pointer';
              } else if (!isCaseSubmitted && !isChartLocked && !selectedExtractionType) {
                document.body.style.cursor = 'not-allowed';
              }
            }}
            onPointerLeave={() => {
              document.body.style.cursor = 'default';
            }}
          />
        );

        return (
          <AnimatedTooth 
            key={`animated-${child.uuid}-${toothNumber}`}
            isPrepped={isPrepped}
            isWillExtract={isWillExtract}
            isActiveSelection={isActiveSelection}
            toothNumber={toothNumber}
          >
            {toothMesh}
          </AnimatedTooth>
        );
      })}
    </group>
  );
}

// ---------- Scene Background Component ----------
function SceneBackground() {
  const { scene } = useThree();
  
  useEffect(() => {
    // Set scene background to the specified color
    scene.background = new THREE.Color('#FAFBFC');
  }, [scene]);
  
  return null;
}

// ---------- Main Chart Component ----------
const InteractiveDentalChart3D = React.memo(function InteractiveDentalChart3D({
  type,
  selectedTeeth,
  onToothToggle,
  title,
  productTeethMap,
  productButtons,
  visibleArch,
  onProductButtonClick = () => { },
  openAccordionItem,
  isCaseSubmitted = false,
  onStatusAssign = () => { },
  selectedProduct = null,
  onProductSelect = () => { },
  showToothMappingToolbar = false,
  onToothMappingModeSelect = () => { },
  selectedToothMappingMode = null,
  missingTeeth = [],
  extractedTeeth = [],
  willExtractTeeth = [],
  onAllTeethMissing = () => { },
  onAutoSelectTeethInMouth,
  currentToothStatuses = {},
  selectedProductForColor = null,
  onProductColorSelect = () => { },
  selectedWillExtractForColor = false,
  onWillExtractColorSelect = () => { },
  productDetails,
  hasScans = false,
  implantCount = 0,
  onValidationError = () => { },
  selectedExtractionType = null,
  onExtractionTypeSelect = () => { },
  onTeethSelectionChange = () => { },
  onClearTeethSelection = () => { },
  getProductExtractions = () => null,
  isCollapsed = false,
  onToggleCollapse = () => { },
  layoutMode = 'default',
}: InteractiveDentalChartProps) {
  const teethRange = type === "maxillary" ? [1, 16] : [17, 32];
  const groupRef = useRef();
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isToothMappingToolbarOpen, setIsToothMappingToolbarOpen] = useState(false);
  const { isModelLoaded, isModelLoading: isPreloading } = useModelPreload()
  const modelUrl = type === "maxillary" ? "/images/glb/Upper_Teeth.glb" : "/images/glb/Lower_Teeth.glb"
  
  // Use teeth selection store for per-extraction-type selection
  const { getExtractionTypeTeeth, toggleExtractionTypeTooth } = useTeethSelectionStore();
  
  // Get effective selected teeth count for the badge - now counts ALL teeth across ALL extraction types
  const getEffectiveSelectedTeethCount = useCallback(() => {
    // Get all available extraction types from product details
    const extractions = productDetails?.data?.extractions || productDetails?.extractions || [];
    
    let totalCount = 0;
    const allSelectedTeeth: number[] = [];
    
    if (extractions.length > 0) {
      // Count teeth across all extraction types from product details
      extractions.forEach((extraction: any) => {
        if (extraction.status === "Active" && (extraction.is_default === "Yes" || extraction.is_required === "Yes" || extraction.is_optional === "Yes")) {
          const teethForType = getExtractionTypeTeeth(extraction.name, type);
          allSelectedTeeth.push(...teethForType);
        }
      });
      
      // Remove duplicates and count unique teeth
      const uniqueTeeth = [...new Set(allSelectedTeeth)];
      totalCount = uniqueTeeth.filter((t) => t >= teethRange[0] && t <= teethRange[1]).length;
    } else {
      // Fallback: count ALL extraction types even when no product details are available
      // Use the standard extraction types that are always available
      const fallbackExtractionTypes = ['Teeth in mouth', 'Missing teeth', 'Will extract on delivery', 'Has been extracted', 'Prepped', 'Implant'];
      
      fallbackExtractionTypes.forEach((extractionTypeName: string) => {
        const teethForType = getExtractionTypeTeeth(extractionTypeName, type);
        allSelectedTeeth.push(...teethForType);
      });
      
      // Remove duplicates and count unique teeth
      const uniqueTeeth = [...new Set(allSelectedTeeth)];
      totalCount = uniqueTeeth.filter((t) => t >= teethRange[0] && t <= teethRange[1]).length;
    }
    
    return totalCount;
  }, [selectedExtractionType, type, getExtractionTypeTeeth, selectedTeeth, teethRange, productDetails]);
  
  // 3D Chart Props
  
  
  // Product-based tooth status management
  const {
    availableStatuses,
    requiredStatuses,
    assignStatusToTeeth,
    getTeethWithStatus,
    isStatusAvailable,
    getToothStatus,
    getToothValidationError
  } = useProductToothStatus();

  // Dental validation system
  const {
    validate,
    validateAll,
    isValid,
    hasErrors,
    hasWarnings,
    currentValidation,
    showValidationModal,
    openValidationModal,
    closeValidationModal,
    validateAndShowModal,
    validateExtractionRules,
    chartConfiguration
  } = useDentalValidation({
    selectedTeeth,
    toothStatuses: currentToothStatuses,
    productName: selectedProduct || '',
    archType: type,
    hasScans,
    implantCount,
    productExtractions: (productDetails?.data?.extractions || productDetails?.extractions)?.map((extraction: any) => ({
      name: extraction.name,
      is_required: extraction.is_required,
      is_optional: extraction.is_optional,
      is_default: extraction.is_default,
      min_teeth: extraction.min_teeth,
      max_teeth: extraction.max_teeth
    }))
  });

  // Calculate teeth present in mouth (non-selected teeth in current arch)
  const computedTeethInMouth = useMemo(() => {
    const archTeeth = type === "maxillary" ? 
      Array.from({ length: 16 }, (_, i) => i + 1) : 
      Array.from({ length: 16 }, (_, i) => i + 17);
    
    return archTeeth.filter(tooth => !selectedTeeth.includes(tooth));
  }, [selectedTeeth, type]);

  // Filter product buttons based on current tooth statuses
  const filteredProductButtons = useMemo(() => {
    return getFilteredProducts(
      productButtons,
      currentToothStatuses,
      selectedTeeth,
      type
    );
  }, [productButtons, currentToothStatuses, selectedTeeth, type]);

  // Performance optimization: measure render time (commented out for now)
  // useRenderTime(`InteractiveDentalChart3D-${type}`);

  // Memoize tooth toggle handler to prevent recreation
  const handleToothToggle = useCallback((toothNumber: number) => {
    if (isCaseSubmitted || chartConfiguration.lockChart) return; // Don't allow tooth toggling when case is submitted or chart is locked
    
    // Validation: Require an extraction type to be selected before allowing tooth clicks
    if (!selectedExtractionType) {
      return; // Block tooth clicking if no extraction type is selected
    }
    
    if (selectedExtractionType) {
      // Get current teeth selection before toggling
      const currentTeeth = getExtractionTypeTeeth(selectedExtractionType, type);
      const isCurrentlySelected = currentTeeth.includes(toothNumber);
      
      // Calculate the new teeth selection after toggling
      const newTeeth = isCurrentlySelected 
        ? currentTeeth.filter(t => t !== toothNumber)
        : [...currentTeeth, toothNumber];
      
      
      // Update the Zustand store with the new selection
      toggleExtractionTypeTooth(selectedExtractionType, type, toothNumber);
      
      // Sync with parent component to update local state
      if (onTeethSelectionChange) {
        onTeethSelectionChange(newTeeth, type);
      }
    }
  }, [onToothToggle, isCaseSubmitted, chartConfiguration.lockChart, selectedExtractionType, type, toggleExtractionTypeTooth, getExtractionTypeTeeth, onTeethSelectionChange]);

  // Memoize model loaded handler
  const handleModelLoaded = useCallback(() => {
    setIsModelLoading(false);
  }, []);

  // Tooth mapping handlers
  const handleToothMappingModeSelect = useCallback((modeId: string | null) => {
    onToothMappingModeSelect(modeId);
  }, [onToothMappingModeSelect]);

  const handleApplyToothMappingToSelected = useCallback(() => {
    if (selectedToothMappingMode && getEffectiveSelectedTeethCount() > 0) {
      // Get the effective selected teeth for the current arch
      let effectiveTeeth: number[] = [];
      if (selectedExtractionType) {
        effectiveTeeth = getExtractionTypeTeeth(selectedExtractionType, type);
      } else {
        effectiveTeeth = selectedTeeth.filter((t) => t >= teethRange[0] && t <= teethRange[1]);
      }
      
      // Apply the selected mapping mode to selected teeth
      onStatusAssign(selectedToothMappingMode, effectiveTeeth);
    }
  }, [selectedToothMappingMode, getEffectiveSelectedTeethCount, selectedExtractionType, getExtractionTypeTeeth, type, selectedTeeth, teethRange, onStatusAssign]);

  const handleAllTeethMissing = useCallback(() => {
    if (isCaseSubmitted) return;
    onAllTeethMissing();
  }, [isCaseSubmitted, onAllTeethMissing]);

  // Handle status assignment with product-based validation
  const handleStatusClick = useCallback((status: string) => {
    if (isCaseSubmitted) return; // Don't allow status changes when case is submitted

    // Check if status is available for the selected product
    if (selectedProduct && !isStatusAvailable(status)) {
      return;
    }

    let teethToAssign: number[] = [];

    if (status === 'Teeth in mouth') {
      // For teeth in mouth, get all non-selected teeth in the current arch
      teethToAssign = computedTeethInMouth;
    } else {
      // For other statuses (including missing teeth), use selected teeth
      teethToAssign = selectedTeeth.filter(tooth =>
        type === "maxillary" ? tooth >= 1 && tooth <= 16 : tooth >= 17 && tooth <= 32
      );
    }

    if (teethToAssign.length > 0) {
      // Use the product-based status assignment
      assignStatusToTeeth(status, teethToAssign);
      // Also call the original callback for backward compatibility
      if (onStatusAssign) {
        onStatusAssign(status, teethToAssign);
      }

      // Validate after status assignment - removed to prevent multiple modals
      // Users can manually trigger validation using the "Check Extraction Rules" button
    }
  }, [selectedTeeth, type, isCaseSubmitted, onStatusAssign, selectedProduct, isStatusAvailable, assignStatusToTeeth, computedTeethInMouth]);

  // Handle product selection with validation
  const handleProductSelect = useCallback((productName: string | null) => {
    onProductSelect(productName);

    // Validate after product selection - removed to prevent multiple modals
    // Users can manually trigger validation using the "Check Extraction Rules" button
  }, [onProductSelect]);

  // Auto-show validation modal when errors occur - DISABLED
  // Users will manually trigger validation when needed
  // useEffect(() => {
  //   if (selectedProduct && selectedTeeth.length > 0 && (hasErrors || hasWarnings)) {
  //     // Add a longer delay to prevent rapid modal reopening
  //     const timer = setTimeout(() => {
  //       if (!showValidationModal) {
  //         validateAndShowModal();
  //       }
  //     }, 500); // Reduced delay to 500ms for better responsiveness

  //     return () => clearTimeout(timer);
  //   }
  // }, [hasErrors, hasWarnings, selectedProduct, selectedTeeth.length, showValidationModal, validateAndShowModal]);

  // Debug logging for MissingTeethCards props removed

  // Handle tooth selection with validation
  const handleToothSelection = useCallback((toothNumber: number) => {
    if (isCaseSubmitted || chartConfiguration.lockChart) return;

    handleToothToggle(toothNumber);

    // Validate after tooth selection - removed to prevent multiple modals
    // Users can manually trigger validation using the "Check Extraction Rules" button
  }, [isCaseSubmitted, chartConfiguration.lockChart, handleToothToggle]);

  return (
    <>
      
      
      {isCollapsed ? (
        <div className="h-full flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              onToggleCollapse();
            }}
            className="flex flex-col items-center justify-start p-4 hover:bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:text-gray-700 transition-colors min-h-[200px] w-full"
            aria-label={`Expand ${title} chart`}
          >
            <div className="text-sm font-semibold mb-2">Click to expand</div>
            <div className="text-sm font-semibold mb-4">{title}</div>
            {type === "maxillary" ? (
              <ChevronsRight className="h-8 w-8 transform rotate-180" />
            ) : (
              <ChevronsLeft className="h-8 w-8 transform rotate-180" />
            )}
          </button>
        </div>
      ) : (
        <Card className="flex flex-col min-h-0">
          <CardHeader className="flex flex-col items-center pb-3 flex-shrink-0">
            <div className="flex justify-between items-center w-full mb-2">
              <CardTitle className="text-lg text-center flex-1">{title}</CardTitle>
              <button
                type="button"
                onClick={() => {
                  onToggleCollapse();
                }}
                className="flex justify-center items-center p-2 hover:bg-gray-100 rounded border border-gray-200 bg-blue-50"
                aria-label={`Collapse ${title} chart`}
              >
                {type === "maxillary" ? (
                  <ChevronsRight className="h-4 w-4 text-gray-600" />
                ) : (
                  <ChevronsLeft className="h-4 w-4 text-gray-600" />
                )}
              </button>
            </div>
            
          </CardHeader>
          
          <CardContent className={`p-1 sm:p-2 lg:p-4 ${layoutMode === '2-column' ? 'grid grid-cols-2 gap-6' : 'flex flex-col'} flex-1 min-h-0`}>
        {/* Left Column: Dental Chart */}
        <div className={layoutMode === '2-column' ? '' : 'w-full'}>
        {/* Extraction Type Color Legend - Temporarily disabled due to scope issues */}
        <div className="flex justify-center mb-4 sm:mb-6 lg:mb-8 gap-2 flex-wrap">
          <Badge variant="secondary">
            {getEffectiveSelectedTeethCount()} Total Selected
          </Badge>
      
          {selectedProduct && getEffectiveSelectedTeethCount() > 0 && (
            <>
              {hasErrors && (
                <Badge
                  variant="destructive"
                  onClick={() => validateExtractionRules()}
                  style={{ cursor: "pointer" }}
                  title="Click to check extraction rules"
                >
                  ⚠️ Validation Error
                </Badge>
              )}
              {hasWarnings && !hasErrors && (
                <Badge
                  variant="secondary"
                  className="bg-yellow-100 text-yellow-800 border-yellow-200"
                >
                  ⚠️ Warning
                </Badge>
              )}
              {isValid && !hasErrors && !hasWarnings && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  ✓ Valid
                </Badge>
              )}
            </>
          )}
        </div>
        <div
          className="
            relative w-full mx-auto flex justify-center items-center
            max-w-full
            sm:max-w-2xl
            md:max-w-3xl
            lg:max-w-4xl
          "
          style={{
            height: 'min(max(45vw, 350px), 600px)',
            minHeight: '300px',
            maxHeight: '55vh'
          }}
        >
          <Suspense fallback={<ProgressiveLoader />}>
            <Canvas 
              style={{ 
                backgroundColor: '#FAFBFC' // Fallback background color
              }}
              camera={{ 
                fov: 50, // Slightly tighter FOV for better detail
                near: 1, 
                far: 1000,
                position: [0, 13, 15] // Zoomed out for a wider view
              }}
              gl={{
                antialias: true, // Enable for better quality
                alpha: false, // Disable alpha to show solid background
                powerPreference: "high-performance", // Use discrete GPU for better quality
                preserveDrawingBuffer: false,
                failIfMajorPerformanceCaveat: false,
                // Performance optimizations
                stencil: false,
                depth: true,
                logarithmicDepthBuffer: false
              }}
              onCreated={({ gl }) => {
                gl.toneMapping = THREE.NoToneMapping; // Use no tone mapping for original look
                gl.toneMappingExposure = 1.0; // Standard exposure
                
                // Performance optimizations
                gl.setClearColor('#FAFBFC', 1);
                gl.shadowMap.enabled = false;
                gl.shadowMap.type = THREE.BasicShadowMap;
              }}
              dpr={[1, 2]} // Higher pixel ratio for better quality
              performance={{ min: 0.5 }} // Higher performance threshold for quality
            >
              <SceneBackground />
              <ambientLight intensity={1.0} color="#ffffff" />
              {/* Main key light from above */}
              <directionalLight 
                position={[0, 30, 20]} 
                intensity={2.0} 
                color="#ffffff" 
                castShadow={false}
              />
              {/* Fill lights from sides */}
              <directionalLight 
                position={[20, 15, 10]} 
                intensity={1.2} 
                color="#ffffff" 
                castShadow={false}
              />
              <directionalLight 
                position={[-20, 15, 10]} 
                intensity={1.2} 
                color="#ffffff" 
                castShadow={false}
              />
              {/* Rim light for definition */}
              <directionalLight 
                position={[0, -5, -20]} 
                intensity={0.8} 
                color="#ffffff" 
                castShadow={false}
              />
              {/* Point lights for detail enhancement */}
              <pointLight position={[0, 15, 15]} intensity={1.0} color="#ffffff" />
              <pointLight position={[10, 10, 10]} intensity={0.8} color="#ffffff" />
              <pointLight position={[-10, 10, 10]} intensity={0.8} color="#ffffff" />
              <Suspense fallback={<ProgressiveLoader />}>
                <LODTeeth
                  selectedTeeth={selectedTeeth}
                  onToothToggle={handleToothSelection}
                  type={type}
                  groupRef={groupRef}
                  onLoaded={handleModelLoaded}
                  isCaseSubmitted={isCaseSubmitted}
                  selectedToothMappingMode={selectedToothMappingMode}
                  selectedProductForColor={selectedProductForColor}
                  productButtons={productButtons}
                  selectedWillExtractForColor={selectedWillExtractForColor}
                  isChartLocked={chartConfiguration.lockChart}
                  selectedExtractionType={selectedExtractionType}
                  productDetails={productDetails}
                />
              </Suspense>
              <OrbitControls
                enablePan={true} // Disable panning when case is submitted
                enableZoom={true} // Disable zooming when case is submitted
                enableRotate={false} // Disable rotation when case is submitted
                target={[0, 0, 0]}
                enableDamping={false}
                dampingFactor={0.9} // Slightly higher for smoother feel
                rotateSpeed={0.6}
                zoomSpeed={1.0}
                panSpeed={0.8}
                minDistance={5}
                maxDistance={40}
                maxPolarAngle={Math.PI * 0.8}
                minPolarAngle={Math.PI * 0.1}
                makeDefault
              />
            </Canvas>
            {/* Overlay loader if model is loading */}
            
            {/* Overlay when case is submitted to indicate disabled state */}
            {isCaseSubmitted && (
              <div className="absolute inset-0 bg-gray-200/30 z-10 flex items-center justify-center">
                <div className="bg-white/90 px-4 py-2 rounded-lg shadow-lg">
                  <p className="text-sm text-gray-600 font-medium">Case Submitted - View Only</p>
                </div>
              </div>
            )}
          </Suspense>
        </div>
        </div>
        {/* End Left Column */}

        {/* Right Column: Missing Teeth Cards - Hide when case is submitted */}
        {!isCaseSubmitted && (
          <div className={layoutMode === '2-column' ? '' : 'w-full mt-6'}>
            <MissingTeethCards
              type={type}
              selectedTeeth={selectedTeeth}
              missingTeeth={missingTeeth}
              extractedTeeth={extractedTeeth}
              willExtractTeeth={willExtractTeeth}
              onAllTeethMissing={handleAllTeethMissing}
              onTeethInMouthClick={() => handleStatusClick('Teeth in mouth')}
              onMissingTeethClick={() => handleStatusClick('Missing teeth')}
              onWillExtractClick={() => handleStatusClick('Will extract on delivery')}
              onAutoSelectTeethInMouth={onAutoSelectTeethInMouth}
              isCaseSubmitted={isCaseSubmitted}
              selectedWillExtractForColor={selectedWillExtractForColor}
              onWillExtractColorSelect={onWillExtractColorSelect}
              selectedToothMappingMode={selectedToothMappingMode}
              onExtractionTypeSelect={onExtractionTypeSelect}
              onTeethSelectionChange={onTeethSelectionChange}
              onClearTeethSelection={onClearTeethSelection}
              productDetails={productDetails}
              productId={selectedProduct ? (() => {
                // Find the product ID from the products array
                const product = productButtons.find(p => p.name === selectedProduct);
                return product?.id;
              })() : undefined}
              selectedProduct={selectedProduct || undefined}
              extractionData={selectedProduct ? (() => {
                // Find the product ID from the products array
                const product = productButtons.find(p => p.name === selectedProduct);
                const productId = product?.id;
                const extractionData = productId ? getProductExtractions(productId) : null;
                return extractionData?.extractions;
              })() : undefined}
              // Show teeth cards for all active extraction types from the product
              showTeethInMouth={!!selectedProduct && !!productDetails && shouldShowTeethCards(productDetails, 'Teeth in mouth', selectedProduct, getProductExtractions)}
              showMissingTeeth={!!selectedProduct && !!productDetails && shouldShowTeethCards(productDetails, 'Missing teeth', selectedProduct, getProductExtractions)}
              showWillExtract={!!selectedProduct && !!productDetails && shouldShowTeethCards(productDetails, 'Will extract on delivery', selectedProduct, getProductExtractions)}
              // Additional extraction types
              showHasBeenExtracted={!!selectedProduct && !!productDetails && shouldShowTeethCards(productDetails, 'Has been extracted', selectedProduct, getProductExtractions)}
              showPrepped={!!selectedProduct && !!productDetails && shouldShowTeethCards(productDetails, 'Prepped', selectedProduct, getProductExtractions)}
              showImplant={!!selectedProduct && !!productDetails && shouldShowTeethCards(productDetails, 'Implant', selectedProduct, getProductExtractions)}
            />
          </div>
        )}

        {/* Product Buttons and Selected teeth summary combined */}
        <div className="mt-4 space-y-3">
          {filteredProductButtons
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((product) => {
            const archTeeth =
              type === "maxillary"
                ? product.maxillaryTeeth || product.teeth
                : product.mandibularTeeth || product.teeth
            // const productTeethNumbers = archTeeth
            //   .split(",")
            //   .map((t: string) => parseInt(t.trim()))
            //   .filter((t: number) => !isNaN(t))
            // const productTeethList = archTeeth
            //   .split(",")
            //   .map((t: string) => t.trim().replace(/^#/, '')) // Remove # symbol
            //   .filter((t: string) => t.length > 0)
            //   .sort((a: string, b: string) => {
            //     const numA = parseInt(a);
            //     const numB = parseInt(b);
            //     return numA - numB; // Sort numerically in ascending order
            //   })
            // const isSelected = openAccordionItem === product.id
            return (
              <div key={product.id} className="w-full">
                {/* <button
                  type="button"
                  className={`w-full h-16 rounded-lg border-2 text-gray-800 hover:bg-gray-50 flex items-center justify-between px-4 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200
                    ${isSelected ? "opacity-60 pointer-events-none border-blue-600" : ""} 
                    ${selectedProduct === product.name ? "border-green-600 bg-green-50" : "border-blue-600"}
                    ${selectedProductForColor === product.id ? "ring-4 ring-yellow-300 border-yellow-500 bg-yellow-50" : ""}
                    ${isCaseSubmitted ? "opacity-50 pointer-events-none cursor-not-allowed" : "hover:shadow-md hover:scale-[1.02]"} text-lg`}
                  onClick={() => {
                    if (!isSelected && !isCaseSubmitted) {
                      onProductButtonClick(product.id)
                      // Also set the product for tooth status filtering
                      onProductSelect(product.name)
                      // Set the product for color application
                      onProductColorSelect(product.id)
                    }
                  }}
                  disabled={isSelected || isCaseSubmitted}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium justify-center">{product.name}</span>
                      {selectedProductForColor === product.id && (
                        <div 
                          className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: product.color }}
                          title={`Color applied to selected teeth: ${product.color}`}
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {productTeethList.length > 0 ? (
                        productTeethList.map((tooth: string, idx: number, arr: string[]) => (
                          <span
                            className="text-sm font-semibold rounded px-1 pointer-events-none"
                            key={tooth}
                          >
                            {tooth}
                            {idx < arr.length - 1 && <span>, </span>}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-600 italic">Teeth in mouth</span>
                      )}
                    </div>
                  </div>
                </button> */}
              </div>
            )
          })}
        </div>
        {/* Product Selection Controls */}
        <div className="mt-4 flex justify-center gap-2">
          {(selectedProductForColor || selectedWillExtractForColor) && (
            <button
              type="button"
              className="px-4 py-2 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg transition-colors"
              onClick={() => {
                onProductColorSelect(null);
                onWillExtractColorSelect(false);
              }}
            >
              Clear Color Selection
            </button>
          )}
        </div>
        
       
          </CardContent>
        </Card>
      )}

      {/* Validation Modal */}
      <ValidationModal
        isOpen={showValidationModal}
        onClose={closeValidationModal}
        validationResult={currentValidation}
        onConfirm={closeValidationModal}
        onCancel={closeValidationModal}
        onSuggestedAction={() => {
          // Handle suggested actions based on validation type
          if (currentValidation?.suggestedAction) {
            const { action, targetStatus, targetProduct } = currentValidation.suggestedAction;
            
            // Suggested Action logging removed
            
            switch (action) {
              case 'changeStatus':
                if (targetStatus && currentValidation.affectedTeeth) {
                  // Status change logging removed
                  // Use the onStatusAssign callback to update tooth statuses
                  onStatusAssign(targetStatus, currentValidation.affectedTeeth);
                }
                break;
              case 'selectTeeth':
                // This would require more complex logic to select appropriate teeth
                // For now, just close the modal
                break;
              case 'switchProduct':
                if (targetProduct) {
                  // Product switch logging removed
                  onProductSelect(targetProduct);
                }
                break;
              case 'markAsPrepped':
                if (currentValidation.affectedTeeth) {
                  // Prepped marking logging removed
                  onStatusAssign('Prepped', currentValidation.affectedTeeth);
                }
                break;
              case 'markAsMissing':
                if (currentValidation.affectedTeeth) {
                  // Missing marking logging removed
                  onStatusAssign('Missing teeth', currentValidation.affectedTeeth);
                }
                break;
              case 'markAsImplant':
                if (currentValidation.affectedTeeth) {
                  // Implant marking logging removed
                  onStatusAssign('Implant', currentValidation.affectedTeeth);
                }
                break;
              default:
                // For other actions, just close the modal
                // Unknown action logging removed
                break;
            }
          }
          
          // Always close the modal after handling the action
          // Closing validation modal logging removed
          closeValidationModal();
          
          // Add a fallback timeout to ensure modal closes even if status update fails
          setTimeout(() => {
            if (showValidationModal) {
              // Fallback modal closing logging removed
              closeValidationModal();
            }
          }, 500);
        }}
        suggestedActionLabel="Fix Issue"
      />
    </>
  )
});

export { InteractiveDentalChart3D };
export default InteractiveDentalChart3D;
