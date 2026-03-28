import { useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bounds, Grid, OrbitControls, useBounds } from '@react-three/drei'
import {
  Box3,
  BufferGeometry,
  Color,
  MeshStandardMaterial,
  Vector3,
  type Mesh,
} from 'three'
import type { GeneratedPart } from '../../types/sign'
import { useSignStore } from '../../store/sign-store'

const bodyMaterial = new MeshStandardMaterial({ color: new Color('#cfd6df') })
const faceMaterial = new MeshStandardMaterial({
  color: new Color('#ecf3ff'),
  opacity: 0.9,
  transparent: true,
})
const insertMaterial = new MeshStandardMaterial({ color: new Color('#f19a35') })
const EMPTY_PARTS: GeneratedPart[] = []

function GeometryMesh({
  geometry,
  material,
  position,
}: {
  geometry: BufferGeometry
  material: MeshStandardMaterial
  position?: [number, number, number]
}) {
  return <mesh geometry={geometry} material={material} position={position} />
}

function getMaterialForPart(part: GeneratedPart) {
  switch (part.role) {
    case 'face':
      return faceMaterial
    case 'insert':
      return insertMaterial
    case 'body':
    default:
      return bodyMaterial
  }
}

function AutoFitOnSourceChange({
  sourceKey,
  hasGeometry,
}: {
  sourceKey: string
  hasGeometry: boolean
}) {
  const bounds = useBounds()
  const lastFittedKey = useRef<string | null>(null)

  useEffect(() => {
    if (!hasGeometry || lastFittedKey.current === sourceKey) {
      return
    }

    lastFittedKey.current = sourceKey
    const frame = window.requestAnimationFrame(() => {
      bounds.refresh().clip().fit()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [bounds, hasGeometry, sourceKey])

  return null
}

export function Viewport3D() {
  const gridRef = useRef<Mesh>(null)
  const generatedParts = useSignStore((state) => state.generatedParts)
  const visibility = useSignStore((state) => state.visibility)
  const isBusy = useSignStore((state) => state.isBusy)
  const error = useSignStore((state) => state.error)
  const shapeDocument = useSignStore((state) => state.shapeDocument)
  const activeSource = useSignStore((state) => state.activeSource)
  const textSource = useSignStore((state) => state.textSource)
  const svgSource = useSignStore((state) => state.svgSource)
  const spec = useSignStore((state) => state.spec)

  const parts = generatedParts?.parts ?? EMPTY_PARTS

  const visibleParts = useMemo(() => {
    return parts.filter((part) => visibility[part.role])
  }, [parts, visibility])

  const bounds = useMemo(() => {
    const box = new Box3()
    visibleParts.forEach((part) => {
      part.geometry.computeBoundingBox()
      if (part.geometry.boundingBox) {
        const translated = part.geometry.boundingBox.clone().translate(
          new Vector3(
            part.assemblyOffset[0] * spec.assembly.explodeDistanceMm,
            part.assemblyOffset[1] * spec.assembly.explodeDistanceMm,
            part.assemblyOffset[2] * spec.assembly.explodeDistanceMm,
          ),
        )
        box.union(translated)
      }
    })
    return box
  }, [spec.assembly.explodeDistanceMm, visibleParts])

  const hasGeometry = parts.length > 0

  const gridHeight = useMemo(() => {
    if (!hasGeometry || bounds.isEmpty()) {
      return -0.8
    }

    const clearance = Math.max((bounds.max.z - bounds.min.z) * 0.02, 0.8)
    return bounds.min.z - clearance
  }, [bounds, hasGeometry])

  const sourceKey = useMemo(() => {
    if (activeSource === 'text') {
      return [
        activeSource,
        textSource.text,
        textSource.fontKind,
        textSource.fontId ?? '',
        textSource.uploadedFontName ?? '',
        textSource.fontSizeMm,
        textSource.letterSpacingMm,
        textSource.alignment,
      ].join('|')
    }

    return [
      activeSource,
      svgSource.fileName,
      svgSource.svgText,
      svgSource.physicalWidthMm ?? '',
      svgSource.physicalHeightMm ?? '',
      svgSource.unitConfidence,
    ].join('|')
  }, [activeSource, svgSource, textSource])

  const previewPosition = useMemo(() => {
    if (!shapeDocument) {
      return [0, 0, 0] as const
    }

    const centerX = shapeDocument.boundsMm.minX + shapeDocument.boundsMm.width / 2
    const centerY = shapeDocument.boundsMm.minY + shapeDocument.boundsMm.height / 2

    return [
      spec.mirror ? centerX : -centerX,
      0,
      centerY,
    ] as const
  }, [shapeDocument, spec.mirror])

  useEffect(() => {
    const material = gridRef.current?.material
    if (!material || Array.isArray(material)) {
      return
    }

    material.depthTest = true
    material.depthWrite = false
    material.needsUpdate = true
  }, [])

  return (
    <div className="relative h-full overflow-hidden rounded-[calc(var(--radius)+6px)] border border-[var(--border)] bg-[#050913]">
      <Canvas
        camera={{ position: [180, 180, 180], fov: 34 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#060914']} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[160, 220, 140]} intensity={2.4} />
        <directionalLight position={[-120, 80, -60]} intensity={0.9} color="#9bc0ff" />
        <Grid
          ref={gridRef}
          args={[1400, 1400]}
          cellColor="#111d36"
          sectionColor="#27457e"
          cellSize={6.5}
          sectionSize={56}
          cellThickness={0.34}
          sectionThickness={1.15}
          fadeDistance={1800}
          fadeStrength={1.1}
          infiniteGrid
          position={[0, gridHeight, 0]}
          renderOrder={10}
        />
        <Bounds margin={1.25}>
          <AutoFitOnSourceChange sourceKey={sourceKey} hasGeometry={hasGeometry} />
          <group position={previewPosition} rotation={[-Math.PI / 2, 0, 0]}>
            {visibleParts.map((part) => (
              <GeometryMesh
                key={part.id}
                geometry={part.geometry}
                material={getMaterialForPart(part)}
                position={[
                  part.assemblyOffset[0] * spec.assembly.explodeDistanceMm,
                  part.assemblyOffset[1] * spec.assembly.explodeDistanceMm,
                  part.assemblyOffset[2] * spec.assembly.explodeDistanceMm,
                ]}
              />
            ))}
          </group>
        </Bounds>
        <OrbitControls makeDefault enableDamping />
      </Canvas>

      <div className="absolute left-4 top-4 rounded-2xl border border-[var(--border)] bg-[var(--background-panel)] px-4 py-3 text-sm shadow-[var(--shadow-lg)] backdrop-blur">
        {error ? (
          <div className="text-[var(--danger)]">{error}</div>
        ) : isBusy ? (
          <div className="text-[var(--primary-2)]">Gerando preview 3D...</div>
        ) : generatedParts ? (
          <div className="space-y-1 text-[var(--muted)]">
            <div className="text-white">Preview pronto</div>
            <div>
              X {generatedParts.metricsMm.width.toFixed(1)} mm | Y{' '}
              {generatedParts.metricsMm.height.toFixed(1)} mm | Z{' '}
              {generatedParts.metricsMm.depth.toFixed(1)} mm
            </div>
            <div>{generatedParts.parts.length} peça(s) ativas no projeto</div>
          </div>
        ) : (
          <div className="text-[var(--muted)]">
            Carregue um texto ou um SVG para iniciar.
          </div>
        )}
      </div>

      {!bounds.isEmpty() ? (
        <div className="absolute bottom-4 right-4 rounded-2xl border border-[var(--border)] bg-[var(--background-panel)] px-4 py-3 text-xs text-[var(--muted)] backdrop-blur">
          Preview montado com slider de montagem
        </div>
      ) : null}
    </div>
  )
}
