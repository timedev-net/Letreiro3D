import { useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bounds, Grid, OrbitControls, useBounds } from '@react-three/drei'
import { Box3, BufferGeometry, Color, MeshStandardMaterial } from 'three'
import { useSignStore } from '../../store/sign-store'

const bodyMaterial = new MeshStandardMaterial({ color: new Color('#cfd6df') })
const acrylicMaterial = new MeshStandardMaterial({
  color: new Color('#66c1ff'),
  opacity: 0.55,
  transparent: true,
})
const lettersMaterial = new MeshStandardMaterial({ color: new Color('#f19a35') })

function GeometryMesh({
  geometry,
  material,
}: {
  geometry: BufferGeometry
  material: MeshStandardMaterial
}) {
  return <mesh geometry={geometry} material={material} />
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
  const generatedParts = useSignStore((state) => state.generatedParts)
  const visibility = useSignStore((state) => state.visibility)
  const isBusy = useSignStore((state) => state.isBusy)
  const error = useSignStore((state) => state.error)
  const shapeDocument = useSignStore((state) => state.shapeDocument)
  const activeSource = useSignStore((state) => state.activeSource)
  const textSource = useSignStore((state) => state.textSource)
  const svgSource = useSignStore((state) => state.svgSource)
  const spec = useSignStore((state) => state.spec)

  const bounds = useMemo(() => {
    const box = new Box3()
    ;[
      generatedParts?.bodyGeometry,
      generatedParts?.acrylicGeometry,
      ...(generatedParts?.letterGeometries ?? []),
    ]
      .filter(Boolean)
      .forEach((geometry) => {
        const casted = geometry as BufferGeometry
        casted.computeBoundingBox()
        if (casted.boundingBox) {
          box.union(casted.boundingBox)
        }
      })
    return box
  }, [generatedParts])

  const hasGeometry = Boolean(
    generatedParts?.bodyGeometry
      || generatedParts?.acrylicGeometry
      || generatedParts?.letterGeometries.length,
  )

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

    const centerX =
      shapeDocument.boundsMm.minX + shapeDocument.boundsMm.width / 2
    const centerY =
      shapeDocument.boundsMm.minY + shapeDocument.boundsMm.height / 2

    return [
      spec.mirror ? centerX : -centerX,
      0,
      centerY,
    ] as const
  }, [shapeDocument, spec.mirror])

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
          args={[1400, 1400]}
          cellColor="#111d36"
          sectionColor="#27457e"
          cellSize={8}
          sectionSize={72}
          cellThickness={0.38}
          sectionThickness={1.25}
          fadeDistance={1800}
          fadeStrength={1.1}
          infiniteGrid
          position={[0, 0, 0]}
        />
        <Bounds margin={1.25}>
          <AutoFitOnSourceChange sourceKey={sourceKey} hasGeometry={hasGeometry} />
          <group position={previewPosition} rotation={[-Math.PI / 2, 0, 0]}>
            {visibility.body && generatedParts?.bodyGeometry ? (
              <GeometryMesh
                geometry={generatedParts.bodyGeometry}
                material={bodyMaterial}
              />
            ) : null}
            {visibility.acrylic && generatedParts?.acrylicGeometry ? (
              <GeometryMesh
                geometry={generatedParts.acrylicGeometry}
                material={acrylicMaterial}
              />
            ) : null}
            {visibility.letters && generatedParts?.letterGeometries.length
              ? generatedParts.letterGeometries.map((geometry, index) => (
                  <GeometryMesh
                    key={`letter-${index}`}
                    geometry={geometry}
                    material={lettersMaterial}
                  />
                ))
              : null}
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
          </div>
        ) : (
          <div className="text-[var(--muted)]">
            Carregue um texto ou um SVG para iniciar.
          </div>
        )}
      </div>

      {!bounds.isEmpty() ? (
        <div className="absolute bottom-4 right-4 rounded-2xl border border-[var(--border)] bg-[var(--background-panel)] px-4 py-3 text-xs text-[var(--muted)] backdrop-blur">
          Caixa 3D centralizada automaticamente
        </div>
      ) : null}
    </div>
  )
}
