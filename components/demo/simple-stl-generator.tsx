"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  RotateCcw,
  Grid3X3,
  Maximize,
  Eye,
  EyeOff,
  CuboidIcon as Cube,
  SpaceIcon as Sphere,
  Pyramid,
  Rotate3d,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  X,
} from "lucide-react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"

interface SimpleSTLViewerProps {
  title: string
  geometryType?: "cube" | "sphere" | "pyramid" // Make optional, as STL will define
  fileSize?: string
  dimensions?: string
  stlUrl?: string // Make optional for cases where only geometryType is used
  materialColor?: string
  viewerKey?: string
  autoOpen?: boolean
  thumbnailUrls?: string[] // <-- Multiple thumbnails
}

export default function SimpleSTLViewer({
  title,
  geometryType = "cube", // Default if no STL provided
  fileSize,
  dimensions,
  stlUrl,
  materialColor,
  viewerKey,
  autoOpen = false,
  thumbnailUrls = [], // <-- Default empty array
}: SimpleSTLViewerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [wireframe, setWireframe] = useState(false)
  const [showGrid, setShowGrid] = useState(true) // Set grid to true on initial load
  const [loading, setLoading] = useState(true) // New state for loading indicator
  const [error, setError] = useState<string | null>(null) // New state for errors
  const [modelColor, setModelColor] = useState<string>(materialColor || "#cccccc") // Color state
  const [viewerModels, setViewerModels] = useState<Array<{ url: string; color: string }>>([]) // Models in viewer

  const thumbnailRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const thumbnailSceneRef = useRef<any>(null)
  const modalSceneRef = useRef<any>(null)

  const [selectedLayout, setSelectedLayout] = useState(0) // Track selected layout

  // Ensure grid is always triggered on initial load and retrigger if not loading
  useEffect(() => {
    if (!loading && !showGrid) {
      setShowGrid(true)
    }
  }, [loading, showGrid])

  // Generate a random pastel color if materialColor is not provided
  const getRandomPastel = useCallback(() => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 85%)`;
  }, []);

  // Always use materialColor or random pastel
  const meshColor = materialColor || getRandomPastel();

  // Add a fit offset for thumbnail to zoom out a bit more
  const thumbnailFitOffset = 1.5; // Increase this value to zoom out more

  // Function to create basic geometries for fallback or default
  const createBasicGeometry = useCallback((type: string) => {
    // Increased segments for higher detail
    switch (type) {
      case "cube":
        return new THREE.BoxGeometry(2, 2, 2, 64, 64, 64)
      case "sphere":
        return new THREE.SphereGeometry(1.2, 128, 128)
      case "pyramid":
        return new THREE.ConeGeometry(1.2, 2, 6, 64)
      default:
        return new THREE.BoxGeometry(2, 2, 2, 64, 64, 64)
    }
  }, []);

  // Function to load STL geometry
  const loadSTLGeometry = useCallback(async (url: string) => {
    if (!url) {
      throw new Error("No STL file URL provided.");
    }
    // Check if the blob URL is still valid (basic check)
    if (url.startsWith("blob:") && !window.URL) {
      throw new Error("Blob URL is not available.");
    }
    const loader = new STLLoader()
    return new Promise<THREE.BufferGeometry>((resolve, reject) => {
      loader.load(
        url,
        geometry => {
          geometry.computeVertexNormals();
          geometry.computeBoundingBox();
          resolve(geometry);
        },
        (xhr) => {
          // ...existing code...
        },
        (err) => {
          // Improved error message
          reject(new Error(`Failed to load STL: ${url}. The file may have been removed or revoked.`));
        }
      )
    })
  }, []);

  // Helper to create a solid background color
  const createGradientTexture = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Set solid background color
      ctx.fillStyle = "rgb(224,224,224)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  // Main viewer initialization logic
  const initializeViewer = useCallback(async (container: HTMLDivElement, isModal = false) => {
    setError(null);
    setLoading(true);

    // Clean up previous renderer if any
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const width = container.clientWidth || (isModal ? window.innerWidth * 0.7 : 300);
    const height = container.clientHeight || (isModal ? window.innerHeight * 0.7 : 200);

    const scene = new THREE.Scene();
    scene.background = createGradientTexture();

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.enablePan = isModal;
    controls.autoRotate = !isModal;
    controls.autoRotateSpeed = 1;

    // --- Enhanced Lighting ---
    // Hemisphere light for ambient sky/ground
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // Directional light (key light)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048; // Higher resolution for sharper shadows
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    scene.add(dirLight);

    // SpotLight for focused highlights
    const spotLight = new THREE.SpotLight(0xffffff, 0.5);
    spotLight.position.set(-15, 25, 15);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.camera.near = 1;
    spotLight.shadow.camera.far = 40;
    scene.add(spotLight);

    // Subtle ambient light for soft fill
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    let grid: THREE.GridHelper | undefined;
    if (isModal) {
      grid = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc);
      scene.add(grid);
      grid.visible = showGrid;
    }

    let geometry: THREE.BufferGeometry;
    try {
      geometry = stlUrl ? await loadSTLGeometry(stlUrl) : createBasicGeometry(geometryType);
    } catch (e: any) {
      console.warn(`Failed to load STL: ${e.message}. Falling back to basic geometry.`);
      setError(`Failed to load STL: ${e.message}`);
      geometry = createBasicGeometry(geometryType);
    }

    // --- Enhanced Material ---
    const material = new THREE.MeshStandardMaterial({
      color: modelColor || meshColor,
      roughness: 0.5, // Adjust for surface realism
      metalness: 0.2, // Slight metallic effect
      wireframe: wireframe,
      transparent: true, // Enable transparency for fade-in
      opacity: 0,        // Start fully transparent
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Center and fit camera
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (box) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      mesh.position.sub(center);

      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const fitOffset = isModal ? 1.2 : thumbnailFitOffset;
      const fov = camera.fov * (Math.PI / 180);
      const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * fitOffset;

      camera.position.set(0, 0, cameraZ);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }

    controls.update();

    // Initialize the model's scale to small
    mesh.scale.set(0.1, 0.1, 0.1);

    // Smooth scale-up effect for the model
    let scaleStartTime = performance.now();
    const scaleDuration = 1000; // 1 second scale-up
    const scaleUp = () => {
      const elapsed = performance.now() - scaleStartTime;
      if (elapsed < scaleDuration) {
        const scale = 0.1 + (elapsed / scaleDuration) * 0.9; // Scale from 0.1 to 1
        mesh.scale.set(scale, scale, scale);
        requestAnimationFrame(scaleUp);
      } else {
        mesh.scale.set(1, 1, 1); // Final scale
      }
    };
    scaleUp();

    // Smooth fade-in effect for the model
    let fadeStartTime = performance.now();
    const fadeDuration = 1000; // 1 second fade-in
    const fadeIn = () => {
      const elapsed = performance.now() - fadeStartTime;
      if (elapsed < fadeDuration) {
        const opacity = Math.min(elapsed / fadeDuration, 1);
        mesh.material.opacity = opacity;
        mesh.material.needsUpdate = true;
        requestAnimationFrame(fadeIn);
      } else {
        mesh.material.opacity = 1;
        mesh.material.needsUpdate = true;
      }
    };
    fadeIn();

    setLoading(false);
    return { scene, camera, renderer, controls, grid, mesh, animateEntrance: true };
  }, [
    loadSTLGeometry,
    createBasicGeometry,
    geometryType,
    meshColor,
    wireframe,
    showGrid,
    thumbnailFitOffset,
    createGradientTexture,
    stlUrl,
    modelColor,
  ]);

  // Animate function with smooth entrance animation
  const animate = useCallback((sceneRef: any) => {
    if (!sceneRef || !sceneRef.renderer || !sceneRef.scene || !sceneRef.camera) {
      console.warn("Animate called with incomplete sceneRef, skipping animation.");
      return;
    }
    let startTime = performance.now();
    const duration = 900; // ms for entrance animation

    const animateLoop = () => {
      sceneRef.animationId = requestAnimationFrame(animateLoop)
      // --- Smooth animated entrance logic ---
      if (sceneRef.animateEntrance && sceneRef.mesh && sceneRef.mesh.material) {
        const elapsed = performance.now() - startTime;
        if (elapsed < duration) {
          const t = Math.min(elapsed / duration, 1);
          // Cubic ease-out
          const ease = 1 - Math.pow(1 - t, 3);
          const scale = 0.1 + 0.9 * ease;
          sceneRef.mesh.scale.set(scale, scale, scale);
          sceneRef.mesh.material.opacity = ease;
          sceneRef.mesh.material.needsUpdate = true;
        } else {
          sceneRef.mesh.scale.set(1, 1, 1);
          sceneRef.mesh.material.opacity = 1;
          sceneRef.mesh.material.transparent = false;
          sceneRef.mesh.material.needsUpdate = true;
          sceneRef.animateEntrance = false;
        }
      }
      sceneRef.controls.update()
      sceneRef.renderer.render(sceneRef.scene, sceneRef.camera)
    }
    animateLoop()
  }, []);

  const resetView = useCallback(() => {
    if (modalSceneRef.current) {
      const { camera, controls, mesh } = modalSceneRef.current;
      if (mesh && mesh.geometry) {
        mesh.geometry.computeBoundingBox();
        const box = mesh.geometry.boundingBox;
        if (box) {
          const center = new THREE.Vector3();
          box.getCenter(center);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = camera.fov * (Math.PI / 180);
          const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.2;
          camera.position.set(0, 0, cameraZ);
          camera.lookAt(0, 0, 0);
          controls.target.set(0, 0, 0);
          controls.update();
        }
      }
    }
  }, []);

  // Camera movement controls
  const moveCamera = useCallback((direction: 'up' | 'down' | 'left' | 'right' | 'center') => {
    if (!modalSceneRef.current) return;
    const { camera, controls } = modalSceneRef.current;
    const moveDistance = 2; // Distance to move per click
    
    switch (direction) {
      case 'up':
        camera.position.y += moveDistance;
        controls.target.y += moveDistance;
        break;
      case 'down':
        camera.position.y -= moveDistance;
        controls.target.y -= moveDistance;
        break;
      case 'left':
        camera.position.x -= moveDistance;
        controls.target.x -= moveDistance;
        break;
      case 'right':
        camera.position.x += moveDistance;
        controls.target.x += moveDistance;
        break;
      case 'center':
        resetView();
        return;
    }
    controls.update();
  }, [resetView]);

  // Add to viewer functionality
  const addToViewer = useCallback(() => {
    if (stlUrl) {
      setViewerModels(prev => [...prev, { url: stlUrl, color: modelColor }]);
      // You could also trigger a notification or callback here
    }
  }, [stlUrl, modelColor]);

  // Clear display functionality
  const clearDisplay = useCallback(() => {
    if (modalSceneRef.current?.mesh) {
      const { scene, mesh } = modalSceneRef.current;
      // Remove mesh from scene
      scene.remove(mesh);
      // Dispose of geometry and material
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat: THREE.Material) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
      // Clear the mesh reference
      modalSceneRef.current.mesh = null;
    }
  }, []);

  // Update color
  const updateColor = useCallback((color: string) => {
    setModelColor(color);
    if (modalSceneRef.current?.mesh?.material) {
      modalSceneRef.current.mesh.material.color.set(color);
      modalSceneRef.current.mesh.material.needsUpdate = true;
    }
  }, []);

  const toggleWireframe = useCallback(() => {
    setWireframe(prev => {
      const newWireframe = !prev;
      if (modalSceneRef.current?.mesh?.material) {
        modalSceneRef.current.mesh.material.wireframe = newWireframe;
        modalSceneRef.current.mesh.material.needsUpdate = true; // Essential for material changes
      }
      return newWireframe;
    });
  }, []);

  const toggleGrid = useCallback(() => {
    setShowGrid(prev => {
      const newShowGrid = !prev;
      if (modalSceneRef.current?.grid) {
        modalSceneRef.current.grid.visible = newShowGrid;
      }
      return newShowGrid;
    });
  }, []);

  const getIcon = () => {
    switch (geometryType) {
      case "cube":
        return <Cube className="w-4 h-4" />
      case "sphere":
        return <Sphere className="w-4 h-4" />
      case "pyramid":
        return <Pyramid className="w-4 h-4" />
      default:
        return <Cube className="w-4 h-4" />
    }
  }

  // Cleanup function for useEffect
  const cleanupViewer = useCallback((ref: React.MutableRefObject<any>, container: HTMLDivElement | null) => {
    if (ref.current && ref.current.animationId) {
      cancelAnimationFrame(ref.current.animationId);
    }
    if (container) {
      // It's good practice to dispose of Three.js resources
      if (ref.current && ref.current.renderer) {
        ref.current.renderer.dispose();
      }
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }
    ref.current = null;
  }, []);


    // Layout options
    const layoutOptions = [
      { rows: 1, cols: 1, icon: "single" },
      { rows: 1, cols: 2, icon: "horizontal" },
      { rows: 2, cols: 1, icon: "vertical" },
      { rows: 2, cols: 2, icon: "quad" },
      { rows: 1, cols: 3, icon: "triple-h" },
      { rows: 3, cols: 1, icon: "triple-v" },
      { rows: 2, cols: 3, icon: "six" },
      { rows: 3, cols: 2, icon: "six-alt" },
      { rows: 3, cols: 3, icon: "nine" },
    ];

      const renderLayoutIcon = (layout: any, index: number) => {
      const isSelected = selectedLayout === index;
      const { rows, cols } = layout;
      
      return (
        <button
          key={index}
          onClick={() => setSelectedLayout(index)}
          className={`w-12 h-16 sm:w-15 sm:h-20 p-1 border rounded ${
            isSelected ? 'bg-blue-600 border-blue-600' : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
          } transition-colors`}
          aria-label={`Layout ${rows}x${cols}`}
        >
          <div className={`w-full h-full grid gap-px ${isSelected ? 'text-white' : 'text-gray-600'}`} 
               style={{ gridTemplateRows: `repeat(${rows}, 1fr)`, gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: rows * cols }).map((_, i) => (
              <div key={i} className={`${isSelected ? 'bg-white' : 'bg-current'} rounded-[1px]`} />
            ))}
          </div>
        </button>
      );
    };

  // Initialize thumbnail viewer
  useEffect(() => {
    const container = thumbnailRef.current;
    if (container) {
      let currentSceneRef = thumbnailSceneRef.current;
      // Clean up previous instance before re-initializing
      if (currentSceneRef) {
        cleanupViewer(thumbnailSceneRef, container);
      }
      initializeViewer(container, false).then(sceneData => {
        if (!sceneData) return; // If initialization failed (e.g., container not ready), do nothing
        thumbnailSceneRef.current = sceneData;
        animate(thumbnailSceneRef.current);
      }).catch(err => {
        console.error("Error initializing thumbnail viewer:", err);
        setError("Error rendering thumbnail viewer.");
        setLoading(false);
      });
    }

    return () => {
      cleanupViewer(thumbnailSceneRef, thumbnailRef.current);
    };
  }, [stlUrl, animate, initializeViewer, cleanupViewer]); // Re-run if stlUrl changes

  // Initialize modal viewer
  useEffect(() => {
    const container = modalRef.current;
    if (isModalOpen && container) {
      let currentSceneRef = modalSceneRef.current;
      // Clean up previous instance before re-initializing
      if (currentSceneRef) {
        cleanupViewer(modalSceneRef, container);
      }
      initializeViewer(container, true).then(sceneData => {
        if (!sceneData) return;
        modalSceneRef.current = sceneData;
        animate(modalSceneRef.current);
        // Ensure wireframe and grid states are applied on modal open
        if (modalSceneRef.current.mesh) {
          modalSceneRef.current.mesh.material.wireframe = wireframe;
          modalSceneRef.current.mesh.material.color.set(modelColor);
          modalSceneRef.current.mesh.material.needsUpdate = true;
        }
        if (modalSceneRef.current.grid) {
          modalSceneRef.current.grid.visible = showGrid;
        }
      }).catch(err => {
        console.error("Error initializing modal viewer:", err);
        setError("Error rendering modal viewer.");
        setLoading(false);
      });
    } else if (!isModalOpen && modalSceneRef.current) {
      // Cleanup when modal closes
      cleanupViewer(modalSceneRef, modalRef.current);
    }
    // No specific cleanup in return, as it's handled by conditional logic above
    // If you always want to run cleanup on unmount or dependency change, use return:
    // return () => {
    //   cleanupViewer(modalSceneRef, modalRef.current);
    // };
  }, [isModalOpen, stlUrl, animate, initializeViewer, cleanupViewer, wireframe, showGrid, modelColor]);

  // Handle window resize for modal viewer
  useEffect(() => {
    if (!isModalOpen || !modalSceneRef.current) return;

    const handleResize = () => {
      const container = modalRef.current;
      if (container && modalSceneRef.current?.renderer) {
        const width = container.clientWidth;
        const height = container.clientHeight;
        modalSceneRef.current.camera.aspect = width / height;
        modalSceneRef.current.camera.updateProjectionMatrix();
        modalSceneRef.current.renderer.setSize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isModalOpen]);


  // Extract filename from stlUrl
  const stlFilename = stlUrl ? stlUrl.split("/").pop() : undefined;

  // Helper for backward compatibility
  const hasThumbnails = thumbnailUrls && thumbnailUrls.length > 0;

  return (
    <>
      <Card
        className="w-full max-w-lg cursor-pointer hover:shadow-lg transition-shadow duration-200"
        key={viewerKey}
      >
        <CardContent className="p-0">
          <div className="relative">
            {/* Multiple thumbnails above STL viewer */}
            {hasThumbnails && (
              <div className="w-full flex gap-2 px-2 py-2 bg-white rounded-t-lg overflow-x-auto" style={{ minHeight: "80px" }}>
                {thumbnailUrls.map((url, idx) => (
                  <div key={url} className="flex-shrink-0 rounded-lg overflow-hidden border border-gray-200" style={{ width: "80px", height: "80px" }}>
                    <img
                      src={url}
                      alt={`Attachment thumbnail ${idx + 1}`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              className="stl-thumbnail-btn absolute bottom-4 right-4 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow hover:bg-blue-800 transition"
              style={{ zIndex: 20, display: "flex", alignItems: "center" }}
              onClick={() => setIsModalOpen(true)}
              data-viewer-key={viewerKey}
            >
              {getIcon()}
              View File
            </button>
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200/70 z-10 rounded-t-lg">
                <span className="text-gray-700 text-sm mb-2 animate-fade">Loading 3D model...</span>
                <div className="w-32 h-2 bg-gray-300 rounded overflow-hidden">
                  <div className="h-full bg-blue-400 animate-pulse" style={{ width: "80%" }} />
                </div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-100/70 z-10 rounded-t-lg text-red-700 text-center p-2 text-sm">
                {error}
              </div>
            )}
          </div>
          <div
            ref={thumbnailRef}
            className={`w-full h-64 bg-gray-50 rounded-t-lg relative overflow-hidden ${hasThumbnails ? "mt-0" : ""}`}
            style={{ position: "relative" }}
          >
            <style>
              {`
                .stl-thumbnail-canvas {
                  pointer-events: none;
                }
                .stl-thumbnail-btn {
                  z-index: 20;
                  pointer-events: auto;
                }
                .stl-modal-canvas {
                    width: 100%;
                    height: 100%;
                    display: block;
                }
              `}
            </style>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] h-[95vh] sm:h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-4 sm:p-8 pb-2 sm:pb-0 flex-shrink-0">
            <DialogTitle className="flex items-center justify-between text-lg sm:text-xl">
              <span className="flex items-center gap-3">
                <span className="truncate">{title}</span>
              </span>
              <div className="flex gap-2 sm:gap-3 flex-wrap">
                {fileSize && <Badge variant="secondary" className="text-xs">{fileSize}</Badge>}
                {dimensions && <Badge variant="outline" className="text-xs">{dimensions}</Badge>}
                {stlFilename && (
                  <Badge variant="outline" className="text-xs truncate max-w-[100px] sm:max-w-none">{stlFilename}</Badge>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
            {/* STL controls sidebar on the left */}
            <div className="w-full sm:w-80 lg:w-96 p-4 sm:p-8 border-r bg-gray-50/50 flex flex-col overflow-y-auto flex-shrink-0">
              <h2 className="font-bold text-lg sm:text-xl mb-4 sm:mb-6 flex items-center gap-2">
                <Rotate3d className="w-5 h-5" />
                STL Viewer
              </h2>
              <div className="mb-6 sm:mb-8">
                <h3 className="font-semibold mb-3 text-sm sm:text-base">Controls</h3>
                <div className="flex flex-col items-center gap-3">
                  {/* Arrow controls matching diamond pattern */}
                  <div className="relative flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32">
                    {/* Up arrow */}
                    <button 
                      onClick={() => moveCamera('up')}
                      className="absolute top-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full transition-colors shadow-sm"
                      aria-label="Move camera up"
                    >
                      <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                    </button>

                    {/* Left arrow */}
                    <button 
                      onClick={() => moveCamera('left')}
                      className="absolute left-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full transition-colors shadow-sm"
                      aria-label="Move camera left"
                    >
                      <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                    </button>

                    {/* Center button */}
                    <button 
                      onClick={() => moveCamera('center')}
                      className="absolute w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors shadow flex items-center justify-center"
                      aria-label="Reset camera to center"
                    >
                      <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </button>

                    {/* Right arrow */}
                    <button 
                      onClick={() => moveCamera('right')}
                      className="absolute right-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full transition-colors shadow-sm"
                      aria-label="Move camera right"
                    >
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                    </button>

                    {/* Down arrow */}
                    <button 
                      onClick={() => moveCamera('down')}
                      className="absolute bottom-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full transition-colors shadow-sm"
                      aria-label="Move camera down"
                    >
                      <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                    </button>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetView}
                    className="w-full mt-4 shadow"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset View
                  </Button>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3 text-sm sm:text-base">Display</h3>
                <div className="flex flex-col gap-3">
                  <Button 
                    size="sm" 
                    className="bg-blue-700 text-white shadow hover:bg-blue-800" 
                    onClick={addToViewer}
                    disabled={!stlUrl}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Add to Viewer
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="shadow hover:bg-red-50 hover:border-red-300 hover:text-red-700" 
                    onClick={clearDisplay}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Display
                  </Button>
                  <Button
                    size="sm"
                    variant={wireframe ? "default" : "outline"}
                    onClick={toggleWireframe}
                    className="shadow"
                  >
                    {wireframe ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                    Wireframe
                  </Button>
                  <Button
                    size="sm"
                    variant={showGrid ? "default" : "outline"}
                    onClick={toggleGrid}
                    className="shadow"
                  >
                    <Grid3X3 className="w-4 h-4 mr-2" />
                    Grid
                  </Button>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-10 h-8 rounded border-2 border-gray-300 cursor-pointer hover:border-gray-400 transition-colors"
                      style={{ backgroundColor: modelColor }}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'color';
                        input.value = modelColor;
                        input.onchange = (e) => {
                          const target = e.target as HTMLInputElement;
                          updateColor(target.value);
                        };
                        input.click();
                      }}
                    />
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="shadow flex-1"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'color';
                        input.value = modelColor;
                        input.onchange = (e) => {
                          const target = e.target as HTMLInputElement;
                          updateColor(target.value);
                        };
                        input.click();
                      }}
                    >
                      <Maximize className="w-4 h-4 mr-2" />
                      Color Picker
                    </Button>
                  </div>
                </div>
              </div>

              {/* Layout Section */}
              <div className="mt-6 sm:mt-8">
                  <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Layout</h3>
                  <div className="grid grid-cols-2 gap-1 sm:gap-2">
                    {layoutOptions.map((layout, index) => renderLayoutIcon(layout, index))}
                  </div>
                </div>
            </div>
            {/* STL viewer area */}
            <div className="flex-1 relative h-full min-h-[300px] sm:min-h-[60vh] flex flex-col overflow-hidden">
              {/* Multiple thumbnails above STL viewer in modal */}
              {hasThumbnails && (
                <div className="w-full flex gap-2 px-2 py-2 bg-white rounded-t-lg overflow-x-auto" style={{ minHeight: "80px" }}>
                  {thumbnailUrls.map((url, idx) => (
                    <div key={url} className="flex-shrink-0 rounded-lg overflow-hidden border border-gray-200" style={{ width: "80px", height: "80px" }}>
                      <img
                        src={url}
                        alt={`Attachment thumbnail ${idx + 1}`}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ))}
                </div>
              )}
              <div
                ref={modalRef}
                className="w-full flex-1 bg-gray-50"
                style={{ minHeight: "300px" }}
              ></div>
            </div>
          </div>
          
          {/* Footer */}
          <DialogFooter className="p-4 sm:p-6 border-t bg-gray-50/50 flex-shrink-0 flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600">
              {viewerModels.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {viewerModels.length} model{viewerModels.length > 1 ? 's' : ''} in viewer
                </Badge>
              )}
              <span className="text-gray-500">Use mouse to rotate, scroll to zoom, drag to pan</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="shadow"
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
