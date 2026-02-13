"use client"

import { useEffect, useRef, useState } from "react"
import { Canvas, useThree, useLoader } from "@react-three/fiber"
import { OrbitControls, Grid, Environment } from "@react-three/drei"
import * as THREE from "three"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader"

interface STLCanvasOnlyProps {
  models: { src: string; color?: string }[]
  isWireframe?: boolean
  showGrid?: boolean
  modelColor?: string
}

function STLModel({ src, color, isWireframe }: { src: string; color: string; isWireframe: boolean }) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)

  useEffect(() => {
    const loader = new STLLoader()
    loader.load(
      src,
      (geo) => {
        geo.computeVertexNormals()
        geo.center()
        setGeometry(geo)
      },
      undefined,
      (err) => {
        console.error("Error loading STL:", err)
      }
    )
    return () => {
      if (geometry) geometry.dispose()
    }
  }, [src])

  if (!geometry) return null

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        wireframe={isWireframe}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function CameraControls() {
  const { invalidate } = useThree()
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    const controls = controlsRef.current
    if (controls) {
      controls.addEventListener("change", invalidate)
    }
    return () => {
      if (controls) {
        controls.removeEventListener("change", invalidate)
      }
    }
  }, [invalidate])

  return <OrbitControls ref={controlsRef} makeDefault />
}

export default function STLCanvasOnly({
  models,
  isWireframe = false,
  showGrid = false,
  modelColor = "#f9c74f",
}: STLCanvasOnlyProps) {
  if (models.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-xs">
        Select an STL file to preview
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 80], fov: 75 }}
        style={{ background: "#e9ecef", width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} />
        <Environment preset="studio" />
        {models.map((model, index) => (
          <STLModel
            key={model.src}
            src={model.src}
            color={model.color || modelColor}
            isWireframe={isWireframe}
          />
        ))}
        {showGrid && <Grid args={[100, 100]} />}
        <CameraControls />
      </Canvas>
    </div>
  )
}
