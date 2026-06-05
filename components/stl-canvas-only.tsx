"use client"

import { useEffect, useRef, useState } from "react"
import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls, Grid, Environment } from "@react-three/drei"
import * as THREE from "three"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader"

interface STLCanvasOnlyProps {
  models: { src: string; color?: string }[]
  isWireframe?: boolean
  showGrid?: boolean
  modelColor?: string
  realistic?: boolean
  /** Glossy ceramic/enamel look — white, shiny clearcoat highlights, non-metallic. Takes precedence over `realistic`. */
  glossy?: boolean
  /** Continuously auto-rotate the model (matches the card-thumbnail animation). */
  autoRotate?: boolean
}

function STLModel({
  src,
  color,
  isWireframe,
  realistic,
  glossy,
}: {
  src: string
  color: string
  isWireframe: boolean
  realistic: boolean
  glossy: boolean
}) {
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

  if (glossy && !isWireframe) {
    // Mirror the card-thumbnail look (SimpleSTLViewer): MeshStandardMaterial,
    // roughness 0.18, no clearcoat, no env map.
    return (
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={color}
          metalness={0}
          roughness={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>
    )
  }

  if (realistic && !isWireframe) {
    return (
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={color}
          metalness={0.85}
          roughness={0.15}
          clearcoat={0.3}
          clearcoatRoughness={0.1}
          envMapIntensity={1.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    )
  }

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

function SceneSetup({ realistic, glossy }: { realistic: boolean; glossy: boolean }) {
  const { gl, scene } = useThree()

  useEffect(() => {
    if (glossy) {
      gl.toneMapping = THREE.NoToneMapping
      gl.toneMappingExposure = 1
      scene.background = new THREE.Color("#e0e0e0")
    } else if (realistic) {
      gl.toneMapping = THREE.ACESFilmicToneMapping
      gl.toneMappingExposure = 1.2
      scene.background = new THREE.Color("#1a3a5c")
    } else {
      gl.toneMapping = THREE.NoToneMapping
      gl.toneMappingExposure = 1
      scene.background = new THREE.Color("#e9ecef")
    }
  }, [realistic, glossy, gl, scene])

  return null
}

function CameraControls({ autoRotate = false }: { autoRotate?: boolean }) {
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

  // Drive the auto-rotation every frame (matches the thumbnail's OrbitControls.autoRotate)
  useFrame(() => {
    if (autoRotate && controlsRef.current) {
      controlsRef.current.update()
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      autoRotate={autoRotate}
      autoRotateSpeed={0.5}
    />
  )
}

export default function STLCanvasOnly({
  models,
  isWireframe = false,
  showGrid = false,
  modelColor = "#f9c74f",
  realistic = true,
  glossy = false,
  autoRotate = false,
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
        shadows={realistic || glossy}
        frameloop={autoRotate ? "always" : "demand"}
        camera={{ position: [0, 0, 80], fov: 75 }}
        style={{ width: "100%", height: "100%" }}
      >
        <SceneSetup realistic={realistic} glossy={glossy} />
        {glossy ? (
          <>
            {/* Match SimpleSTLViewer thumbnail lighting exactly */}
            <hemisphereLight args={[0xffffff, 0x444444, 0.8]} position={[0, 50, 0]} />
            <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
            <spotLight position={[-15, 25, 15]} intensity={0.5} castShadow />
            <ambientLight intensity={0.2} />
          </>
        ) : realistic ? (
          <>
            <ambientLight intensity={0.3} />
            <directionalLight
              position={[10, 15, 10]}
              intensity={1.5}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
            <directionalLight position={[-8, 10, -5]} intensity={0.6} />
            <spotLight
              position={[0, 20, 15]}
              angle={0.3}
              penumbra={0.8}
              intensity={1}
              castShadow
            />
            <pointLight position={[-10, -5, 10]} intensity={0.3} color="#6699cc" />
            <Environment preset="city" />
          </>
        ) : (
          <>
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
            <pointLight position={[-10, -10, -10]} />
            <Environment preset="studio" />
          </>
        )}
        {models.map((model) => (
          <STLModel
            key={model.src}
            src={model.src}
            color={model.color || modelColor}
            isWireframe={isWireframe}
            realistic={realistic}
            glossy={glossy}
          />
        ))}
        {showGrid && <Grid args={[100, 100]} />}
        <CameraControls autoRotate={autoRotate} />
      </Canvas>
    </div>
  )
}
