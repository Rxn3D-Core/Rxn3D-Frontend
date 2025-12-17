"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  RotateCcw, Grid3X3, Maximize, Eye, EyeOff, Trash2, X, Play, Palette
} from "lucide-react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"

type LayoutStyle = "default" | "vertical-thumbs" | "horizontal-thumbs" | "grid"

export default function SimpleSTLViewer({
  stlUrls,
  thumbnailUrls,
  onRemoveThumbnail,
  onClose,
}: {
  stlUrls: string[]
  thumbnailUrls: string[]
  onRemoveThumbnail?: (url: string) => void
  onClose: () => void
}) {
  const [wireframe, setWireframe] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [materialColor, setMaterialColor] = useState<string>("#e0e0e0")
  const [layout, setLayout] = useState<LayoutStyle>("default")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<any>(null)
  const [selectedSTL, setSelectedSTL] = useState(0)

  // Helper to load STL and add to scene
  const loadSTL = useCallback(async (url: string, color: string, wire: boolean, addToScene: (mesh: THREE.Mesh) => void) => {
    return new Promise<void>((resolve, reject) => {
      const loader = new STLLoader()
      loader.load(
        url,
        (geometry) => {
          geometry.computeVertexNormals()
          geometry.computeBoundingBox()
          const mat = new THREE.MeshStandardMaterial({
            color,
            wireframe: wire,
            roughness: 0.55,
            metalness: 0.15,
            transparent: false,
          })
          const mesh = new THREE.Mesh(geometry, mat)
          mesh.castShadow = true
          mesh.receiveShadow = true
          addToScene(mesh)
          resolve()
        },
        undefined,
        (err) => {
          reject(err)
        }
      )
    })
  }, [])

  // Viewer initialization and STL loading
  useEffect(() => {
    const container = viewerRef.current
    if (!container) return
    setLoading(true)
    setError(null)

    // Clear old content
    while (container.firstChild) container.removeChild(container.firstChild)
    // Setup three.js scene
    const width = container.clientWidth || 600
    const height = container.clientHeight || 500
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#f9fafb")
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 1000)
    camera.position.set(0, 0, 90)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1)
    dirLight.position.set(40, 80, 50)
    scene.add(dirLight)

    // Grid
    const grid = new THREE.GridHelper(120, 15, 0xc0c0c0, 0xeaeaea)
    grid.visible = showGrid
    scene.add(grid)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = true

    // STL Meshes
    let meshes: THREE.Mesh[] = []
    let active = true

    async function loadMeshes() {
      try {
        meshes.forEach(m => scene.remove(m))
        meshes = []
        // Load each STL, color differently
        for (let i = 0; i < stlUrls.length; ++i) {
          const color = i === 0 ? "#b8cbb8" : "#e0ba8a"
          await loadSTL(
            stlUrls[i],
            materialColor || color,
            wireframe,
            (mesh) => {
              // Centering mesh
              mesh.geometry.computeBoundingBox()
              const box = mesh.geometry.boundingBox
              if (box) {
                const center = new THREE.Vector3()
                box.getCenter(center)
                mesh.position.sub(center)
              }
              scene.add(mesh)
              meshes.push(mesh)
            }
          )
        }
        // Camera fit
        if (meshes[0]) {
          const box = meshes[0].geometry.boundingBox
          if (box) {
            const size = new THREE.Vector3()
            box.getSize(size)
            const maxDim = Math.max(size.x, size.y, size.z)
            const fov = camera.fov * (Math.PI / 180)
            const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2.1
            camera.position.set(0, 0, cameraZ)
            camera.lookAt(0, 0, 0)
            controls.update()
          }
        }
        setLoading(false)
        animate()
      } catch (e: any) {
        setError("Failed to load STL: " + e.message)
        setLoading(false)
      }
    }

    function animate() {
      if (!active) return
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }

    loadMeshes()

    sceneRef.current = {
      renderer, scene, camera, controls, grid, meshes,
    }

    return () => {
      active = false
      controls.dispose()
      renderer.dispose()
      while (container.firstChild) container.removeChild(container.firstChild)
      sceneRef.current = null
    }
    // eslint-disable-next-line
  }, [stlUrls, wireframe, showGrid, materialColor, selectedSTL])

  // Grid and wireframe toggles update meshes/grid live
  useEffect(() => {
    if (!sceneRef.current) return
    if (sceneRef.current.meshes)
      sceneRef.current.meshes.forEach((m: any) => {
        if (m.material) {
          m.material.wireframe = wireframe
          m.material.needsUpdate = true
        }
      })
    if (sceneRef.current.grid)
      sceneRef.current.grid.visible = showGrid
  }, [wireframe, showGrid])

  // Reset camera and controls
  const resetView = () => {
    if (sceneRef.current && sceneRef.current.camera && sceneRef.current.controls) {
      sceneRef.current.camera.position.set(0, 0, 90)
      sceneRef.current.controls.target.set(0, 0, 0)
      sceneRef.current.controls.update()
    }
  }

  // Screenshot
  const handleScreenshot = () => {
    if (sceneRef.current && sceneRef.current.renderer) {
      const url = sceneRef.current.renderer.domElement.toDataURL()
      const link = document.createElement("a")
      link.download = `stl-viewer-screenshot.png`
      link.href = url
      link.click()
    }
  }

  return (
    <div className="flex flex-row w-full h-full">
      {/* Left Controls Panel */}
      <div className="w-[220px] p-5 border-r flex flex-col justify-between min-h-full bg-white">
        <div>
          <div className="font-bold text-lg mb-4">STL Viewer</div>
          <div className="font-medium mb-1 text-sm">Controls</div>
          <div className="mb-3 flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={resetView} className="w-full justify-start">
              <RotateCcw className="w-4 h-4 mr-2" /> Reset
            </Button>
          </div>
          <div className="font-medium mt-5 mb-1 text-sm">Display</div>
          <div className="mb-3 flex flex-col gap-2">
            <Button
              variant={showGrid ? "default" : "outline"}
              size="sm"
              className="w-full justify-start"
              onClick={() => setShowGrid(v => !v)}
            >
              <Grid3X3 className="w-4 h-4 mr-2" /> Grid
            </Button>
            <Button
              variant={wireframe ? "default" : "outline"}
              size="sm"
              className="w-full justify-start"
              onClick={() => setWireframe(v => !v)}
            >
              {wireframe ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />} Wireframe
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => setMaterialColor(materialColor === "#e0e0e0" ? "#b8cbb8" : "#e0e0e0")}
            >
              <Palette className="w-4 h-4 mr-2" /> Color Picker
            </Button>
          </div>
          <div className="font-medium mt-5 mb-1 text-sm">Layout</div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {([
              { key: "default", icon: <div className="w-5 h-5 bg-gray-300 rounded" /> },
              { key: "vertical-thumbs", icon: <div className="w-5 h-5 border-2 border-blue-400 rounded" /> },
              { key: "horizontal-thumbs", icon: <div className="w-5 h-2 bg-blue-200 rounded" /> },
              { key: "grid", icon: <div className="w-5 h-5 grid grid-cols-2 grid-rows-2 gap-1">
                  <div className="bg-blue-300 h-2 w-2 rounded" />
                  <div className="bg-blue-300 h-2 w-2 rounded" />
                  <div className="bg-blue-300 h-2 w-2 rounded" />
                  <div className="bg-blue-300 h-2 w-2 rounded" />
                </div> }
            ] as {key: LayoutStyle, icon: React.ReactNode}[]).map(l => (
              <Button
                key={l.key}
                variant={layout === l.key ? "default" : "outline"}
                size="icon"
                className="w-8 h-8"
                onClick={() => setLayout(l.key)}
              >{l.icon}</Button>
            ))}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onClose} className="w-full justify-start mt-8">
          <X className="w-4 h-4 mr-2" /> Close
        </Button>
      </div>
      {/* Main Viewer + Thumbnails */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Thumbnails Row */}
        <div className="flex flex-row items-center justify-center gap-4 p-5 min-h-[72px]">
          {thumbnailUrls.map((url, idx) => (
            <div
              key={url}
              className="relative group w-[80px] h-[80px] bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden shadow-sm"
            >
              <img
                src={url}
                className="object-cover w-full h-full"
                style={{ borderRadius: 12 }}
                alt=""
              />
              {idx === 2 && (
                <span className="absolute inset-0 flex items-center justify-center z-10">
                  <Play className="w-10 h-10 text-white bg-black/70 rounded-full" />
                </span>
              )}
              {onRemoveThumbnail && (
                <button
                  className="absolute top-1 right-1 bg-white/80 hover:bg-white rounded-full p-1 z-20 shadow"
                  onClick={() => onRemoveThumbnail(url)}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              )}
            </div>
          ))}
        </div>
        <Separator />
        {/* STL Viewer */}
        <div className="flex-1 flex items-center justify-center h-[calc(100%-110px)] min-h-[400px]">
          <div ref={viewerRef} className="w-full h-full min-h-[400px]" />
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
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
      </div>
    </div>
  )
}
