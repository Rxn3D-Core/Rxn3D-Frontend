"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RotateCcw, Maximize2, X, Grid3X3, Palette, Eye } from "lucide-react"
import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls, Grid, Environment } from "@react-three/drei"
import * as THREE from "three"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader"

interface STLViewerProps {
  onCloseViewer: () => void // Renamed to be specific to viewer panel
  models: { src: string; color?: string }[] // Array of models to load
  onClearDisplay: () => void // Callback to clear models from parent
}

// Component to handle resetting OrbitControls
function Controls({ resetControls }: { resetControls: () => void }) {
  const { invalidate } = useThree()
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.addEventListener("change", invalidate)
    }
    return () => {
      if (controlsRef.current) {
        controlsRef.current.removeEventListener("change", invalidate)
      }
    }
  }, [invalidate])

  return <OrbitControls ref={controlsRef} makeDefault />
}

export default function STLViewer({ onCloseViewer, models, onClearDisplay }: STLViewerProps) {
  const [isWireframe, setIsWireframe] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [modelColor, setModelColor] = useState("#cccccc") // Default grey color
  const [showMaxillary, setShowMaxillary] = useState(true) // These will be controlled by models prop
  const [showMandibular, setShowMandibular] = useState(true) // These will be controlled by models prop

  const controlsRef = useRef<any>(null)
  const geometries = useRef<any[]>([]).current

  useEffect(() => {
    geometries.length = 0 // Clear previous geometries
    models.forEach((model) => {
      const geometry = new STLLoader().load(model.src)
      geometries.push(geometry)
    })
  }, [models])

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
    // Reset display options
    setShowMaxillary(true)
    setShowMandibular(true)
    setIsWireframe(false)
    setShowGrid(false)
    setModelColor("#cccccc")
  }

  // Simplified color change for demonstration
  const toggleColor = () => {
    setModelColor((prevColor) => (prevColor === "#cccccc" ? "#ff0000" : "#cccccc"))
  }

  return (
    <Card className="w-full h-full flex flex-col">
      {/* Controls Panel */}
      <div className="w-full border-b p-4 space-y-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-xs">📐</span>
            </div>
            <h3 className="font-semibold">STL Viewer</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm">
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onCloseViewer}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Controls Section */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Controls</h4>
            <div className="flex items-center justify-center">
              <div className="relative w-24 h-24 flex items-center justify-center border rounded-full">
                <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gray-300"></div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gray-300"></div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 bg-[#1162A8] hover:bg-[#0f5490] text-white"
              onClick={handleReset}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset View
            </Button>
          </div>

          {/* Display Options */}
          <div>
            <h4 className="text-sm font-medium mb-2">Display</h4>
            <div className="space-y-2">
              {/* These buttons will now control visibility of loaded models */}
              {models.map((model, index) => (
                <Button
                  key={model.src}
                  variant={true ? "default" : "ghost"} // Always default for now, can add individual toggle state
                  size="sm"
                  className="w-full justify-start"
                  // onClick={() => toggleModelVisibility(model.src)} // Future: implement individual model toggling
                >
                  <Eye className="w-3 h-3 mr-2" />
                  {model.src.split("/").pop()}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start bg-[#1162A8] hover:bg-[#0f5490] text-white"
                onClick={onClearDisplay}
              >
                Clear Display
              </Button>
              <Button
                variant={isWireframe ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setIsWireframe(!isWireframe)}
              >
                <Grid3X3 className="w-3 h-3 mr-2" />
                Wireframe
              </Button>
              <Button
                variant={showGrid ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setShowGrid(!showGrid)}
              >
                Grid
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start bg-[#1162A8] hover:bg-[#0f5490] text-white"
                onClick={toggleColor}
              >
                <Palette className="w-3 h-3 mr-2" />
                Toggle Color
              </Button>
            </div>
          </div>

          {/* Layout Options (Placeholder UI) */}
          <div>
            <h4 className="text-sm font-medium mb-2">Layout</h4>
            <div className="grid grid-cols-3 gap-2">
              {/* Example layout buttons */}
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-[#1162A8] hover:bg-[#0f5490] text-white">
                <div className="grid grid-cols-2 gap-0.5 w-full h-full p-1">
                  <div className="bg-gray-300 col-span-2"></div>
                  <div className="bg-gray-300"></div>
                  <div className="bg-gray-300"></div>
                </div>
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-[#1162A8] hover:bg-[#0f5490] text-white">
                <div className="grid grid-cols-2 gap-0.5 w-full h-full p-1">
                  <div className="bg-gray-300"></div>
                  <div className="bg-gray-300"></div>
                  <div className="bg-gray-300 col-span-2"></div>
                </div>
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-[#1162A8] hover:bg-[#0f5490] text-white">
                <div className="grid grid-cols-2 gap-0.5 w-full h-full p-1">
                  <div className="bg-gray-300"></div>
                  <div className="bg-gray-300 col-span-1 row-span-2"></div>
                  <div className="bg-gray-300"></div>
                </div>
              </Button>
              {/* More layout options as per screenshot */}
            </div>
          </div>
        </div>
      </div>

      {/* 3D Viewer Area */}
      <div className="flex-1 p-4">
        <div className="w-full h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
          <Canvas camera={{ position: [0, 0, 80], fov: 75 }} style={{ background: "#e9ecef", borderRadius: "0.5rem" }}>
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
            <pointLight position={[-10, -10, -10]} />
            <Environment preset="studio" />
            {geometries.map((geometry, index) => (
              <mesh key={models[index].src} geometry={geometry} position={[0, index % 2 === 0 ? 10 : -10, 0]}>
                <meshStandardMaterial
                  color={models[index].color || modelColor}
                  wireframe={isWireframe}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ))}
            {showGrid && <Grid args={[100, 100]} />}
            <Controls resetControls={handleReset} />
          </Canvas>
        </div>
      </div>
    </Card>
  )
}
