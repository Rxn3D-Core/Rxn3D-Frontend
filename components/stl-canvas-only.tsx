"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"

interface STLCanvasOnlyProps {
  src: string
  isWireframe?: boolean
  showGrid?: boolean
  modelColor?: string
  autoRotate?: boolean
  controlsRef?: React.MutableRefObject<OrbitControls | null>
  // Legacy props kept for call-site compatibility
  models?: unknown
  realistic?: boolean
  glossy?: boolean
}

export default function STLCanvasOnly({
  src,
  isWireframe = false,
  showGrid = false,
  modelColor = "#f5ecd0",
  autoRotate = false,
  controlsRef,
}: STLCanvasOnlyProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)

  // Live option refs — updated every render so the scene picks up changes without remounting
  const wireframeRef = useRef(isWireframe)
  const showGridRef = useRef(showGrid)
  const modelColorRef = useRef(modelColor)

  // Imperative handles set by mountScene so React can push updates into the live Three.js scene
  const applyRef = useRef<{
    setWireframe: (v: boolean) => void
    setGrid: (v: boolean) => void
    setColor: (v: string) => void
  } | null>(null)

  // Sync prop → ref → live scene on every render
  wireframeRef.current = isWireframe
  showGridRef.current = showGrid
  modelColorRef.current = modelColor

  useEffect(() => {
    if (!applyRef.current) return
    applyRef.current.setWireframe(isWireframe)
  }, [isWireframe])

  useEffect(() => {
    if (!applyRef.current) return
    applyRef.current.setGrid(showGrid)
  }, [showGrid])

  useEffect(() => {
    if (!applyRef.current) return
    applyRef.current.setColor(modelColor)
  }, [modelColor])

  useEffect(() => {
    const container = mountRef.current
    if (!container || !src) return

    setLoading(true)
    applyRef.current = null

    const mount = () =>
      mountScene(
        container,
        src,
        { isWireframe: wireframeRef.current, showGrid: showGridRef.current, modelColor: modelColorRef.current, autoRotate, controlsRef },
        (handles) => { applyRef.current = handles },
        () => setLoading(false),
      )

    // If container has no dimensions yet defer one frame
    if (!container.clientWidth || !container.clientHeight) {
      let rafId: number
      let teardown: (() => void) | undefined
      rafId = requestAnimationFrame(() => { teardown = mount() })
      return () => { cancelAnimationFrame(rafId); teardown?.() }
    }

    return mount()
  }, [src]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-xs">
        Select an STL file to preview
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#c8c8c8] gap-2">
          <div className="w-8 h-8 border-[3px] border-gray-400 border-t-[#1162A8] rounded-full animate-spin" />
          <span className="text-xs text-gray-500 font-medium">Loading 3D model…</span>
        </div>
      )}
      <div ref={mountRef} className="w-full h-full" />
    </div>
  )
}

interface SceneOptions {
  isWireframe: boolean
  showGrid: boolean
  modelColor: string
  autoRotate: boolean
  controlsRef?: React.MutableRefObject<OrbitControls | null>
}

interface SceneHandles {
  setWireframe: (v: boolean) => void
  setGrid: (v: boolean) => void
  setColor: (v: string) => void
}

// Module-level cache: parsed BufferGeometry keyed by src URL
// Avoids re-downloading + re-parsing the same 20MB STL on layout changes
const geoCache = new Map<string, THREE.BufferGeometry>()

function mountScene(
  container: HTMLDivElement,
  src: string,
  opts: SceneOptions,
  onHandles: (handles: SceneHandles) => void,
  onLoaded?: () => void,
): () => void {
  const { isWireframe, showGrid, modelColor, autoRotate, controlsRef } = opts

  let destroyed = false

  // ── Scene ────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene()
  scene.background = new THREE.Color("#c8c8c8")

  // ── Camera ───────────────────────────────────────────────────────────────
  const w = container.clientWidth || container.parentElement?.clientWidth || Math.round(window.innerWidth * 0.6)
  const h = container.clientHeight || container.parentElement?.clientHeight || Math.round(window.innerHeight * 0.6)
  const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 2000)
  camera.position.set(0, 0, 80)

  // ── Renderer ─────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  // ── Lights ───────────────────────────────────────────────────────────────
  // Strong ambient so back/underside of dental models are never pitch-black
  scene.add(new THREE.AmbientLight(0xffffff, 1.2))

  // Hemisphere: warm sky from above, cooler ground bounce from below
  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.0)
  hemi.position.set(0, 50, 0)
  scene.add(hemi)

  // Key light — front-top-right
  const dir = new THREE.DirectionalLight(0xffffff, 1.2)
  dir.position.set(10, 20, 15)
  scene.add(dir)

  // Fill light — back-bottom-left (illuminates the back/underside)
  const fill = new THREE.DirectionalLight(0xffffff, 0.8)
  fill.position.set(-15, -10, -15)
  scene.add(fill)

  // Rim light — back-top, wraps around the arch
  const rim = new THREE.DirectionalLight(0xffffff, 0.6)
  rim.position.set(0, 10, -20)
  scene.add(rim)

  // ── Grid ─────────────────────────────────────────────────────────────────
  const grid = new THREE.GridHelper(200, 20, 0x888888, 0xcccccc)
  grid.visible = showGrid
  scene.add(grid)

  // ── Controls ─────────────────────────────────────────────────────────────
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.autoRotate = autoRotate
  controls.autoRotateSpeed = 0.5
  if (controlsRef) controlsRef.current = controls

  // ── Load STL ─────────────────────────────────────────────────────────────
  let mesh: THREE.Mesh | null = null

  const addMesh = (geo: THREE.BufferGeometry) => {
    if (destroyed) return
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(modelColor),
      roughness: 0.35,
      metalness: 0,
      wireframe: isWireframe,
      side: THREE.DoubleSide,
    })
    mesh = new THREE.Mesh(geo, mat)
    const center = new THREE.Vector3()
    geo.boundingBox!.getCenter(center)
    mesh.position.sub(center)
    scene.add(mesh)
    const size = new THREE.Vector3()
    geo.boundingBox!.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const dist = Math.abs(maxDim / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 1.5
    camera.position.set(0, 0, dist)
    camera.near = dist * 0.01
    camera.far = dist * 10
    camera.updateProjectionMatrix()
    controls.update()

    // Expose imperative handles so React prop changes can update the live scene
    onHandles({
      setWireframe: (v) => {
        if (mesh) {
          (mesh.material as THREE.MeshStandardMaterial).wireframe = v
        }
      },
      setGrid: (v) => { grid.visible = v },
      setColor: (v) => {
        if (mesh) {
          (mesh.material as THREE.MeshStandardMaterial).color.set(v)
        }
      },
    })

    onLoaded?.()
  }

  const cached = geoCache.get(src)
  if (cached) {
    addMesh(cached)
  } else {
    new STLLoader().load(
      src,
      (geo) => {
        if (destroyed) { geo.dispose(); return }
        geo.computeVertexNormals()
        geo.computeBoundingBox()
        geoCache.set(src, geo)
        addMesh(geo)
      },
      undefined,
      (err) => {
        console.error("[STLCanvasOnly] LOAD FAILED →", src, err)
        onLoaded?.()
      }
    )
  }

  // ── ResizeObserver ───────────────────────────────────────────────────────
  const resizeToContainer = () => {
    const rw = container.clientWidth
    const rh = container.clientHeight
    if (!rw || !rh) return
    camera.aspect = rw / rh
    camera.updateProjectionMatrix()
    renderer.setSize(rw, rh)
  }
  const ro = new ResizeObserver(resizeToContainer)
  ro.observe(container)
  requestAnimationFrame(resizeToContainer)

  // ── Render loop ──────────────────────────────────────────────────────────
  let animId: number
  const animate = () => {
    animId = requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()

  // ── Teardown ─────────────────────────────────────────────────────────────
  return () => {
    destroyed = true
    cancelAnimationFrame(animId)
    ro.disconnect()
    controls.dispose()
    renderer.dispose()
    if (mesh) {
      // Only dispose geometry if it's not in the cache (cache owns it)
      if (!geoCache.has(src)) mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    }
    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement)
    }
    if (controlsRef) controlsRef.current = null
  }
}
