"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
      color: meshColor,
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
      modalSceneRef.current.controls.reset(); // Resets camera to initial position and orientation
      // If you want a specific position, you'd set it directly:
      // modalSceneRef.current.camera.position.set(5, 5, 5);
      // modalSceneRef.current.camera.lookAt(0, 0, 0);
      // modalSceneRef.current.controls.update();
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
          className={`w-15 h-20 p-1 border rounded ${
            isSelected ? 'bg-blue-600 border-blue-600' : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
          } transition-colors`}
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
  }, [isModalOpen, stlUrl, animate, initializeViewer, cleanupViewer, wireframe, showGrid]);


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
        <DialogContent className="max-w-[90vw] h-[90vh] p-0">
          <DialogHeader className="p-8 pb-0">
            <DialogTitle className="flex items-center justify-between text-xl">
              <span className="flex items-center gap-3">
              </span>
              <div className="flex gap-3">
                {fileSize && <Badge variant="secondary">{fileSize}</Badge>}
                {dimensions && <Badge variant="outline">{dimensions}</Badge>}
                {stlFilename && (
                  <Badge variant="outline" className="text-xs">{stlFilename}</Badge>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-1 min-h-0 h-[calc(90vh-5rem)]">
            {/* STL controls sidebar on the left */}
            <div className="w-100 p-8 border-r bg-gray-50/50 flex flex-col">
              <h2 className="font-bold text-xl mb-6 flex items-center gap-2">
                <Rotate3d className="w-5 h-5" />
                STL Viewer
              </h2>
              <div className="mb-8">
                <h3 className="font-semibold mb-3">Controls</h3>
                <div className="flex flex-col items-center gap-3">
                  {/* Arrow controls matching diamond pattern */}
                  <div className="relative flex items-center justify-center w-32 h-32">
                    {/* Up arrow */}
                    <button className="absolute top-0 w-0 h-0 border-l-[20px] border-r-[20px] border-b-[30px] border-l-transparent border-r-transparent border-b-gray-300 hover:border-b-gray-400 transition-colors">
                      <span className="sr-only">Up</span>
                    </button>

                    {/* Left arrow */}
                    <button className="absolute left-0 w-0 h-0 border-t-[20px] border-b-[20px] border-r-[30px] border-t-transparent border-b-transparent border-r-gray-300 hover:border-r-gray-400 transition-colors">
                      <span className="sr-only">Left</span>
                    </button>

                    {/* Center button */}
                    <button className="absolute w-6 h-6 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors shadow">
                      <span className="sr-only">Center</span>
                    </button>

                    {/* Right arrow */}
                    <button className="absolute right-0 w-0 h-0 border-t-[20px] border-b-[20px] border-l-[30px] border-t-transparent border-b-transparent border-l-gray-300 hover:border-l-gray-400 transition-colors">
                      <span className="sr-only">Right</span>
                    </button>

                    {/* Down arrow */}
                    <button className="absolute bottom-0 w-0 h-0 border-l-[20px] border-r-[20px] border-t-[30px] border-l-transparent border-r-transparent border-t-gray-300 hover:border-t-gray-400 transition-colors">
                      <span className="sr-only">Down</span>
                    </button>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetView}
                    className="w-full mt-4 shadow"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Display</h3>
                <div className="flex flex-col gap-3">
                  <Button size="sm" className="bg-blue-700 text-white shadow" disabled>
                    Add to Viewer
                  </Button>
                  <Button size="sm" variant="outline" className="shadow" disabled>
                    Clear Display
                  </Button>
                  <Button
                    size="sm"
                    variant={wireframe ? "default" : "outline"}
                    onClick={toggleWireframe}
                    className="shadow"
                  >
                    Wireframe
                  </Button>
                  <Button
                    size="sm"
                    variant={showGrid ? "default" : "outline"}
                    onClick={toggleGrid}
                    className="shadow"
                  >
                    Grid
                  </Button>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-6 bg-gray-400 rounded"></div>
                    <Button size="sm" variant="outline" className="shadow" disabled>
                      Color Picker
                    </Button>
                  </div>
                </div>
              </div>

              {/* Layout Section */}
              <div>
                  <h3 className="font-semibold mb-1 text-lg">Layout</h3>
                  <div className="grid grid-cols-2 gap-1">
                    {layoutOptions.map((layout, index) => renderLayoutIcon(layout, index))}
                  </div>
                </div>
            </div>
            {/* STL viewer area */}
            <div className="flex-1 relative h-full min-h-[60vh] flex flex-col">
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
                style={{ minHeight: "60vh" }}
              ></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
