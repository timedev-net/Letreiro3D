import { Download, Layers3, PackageOpen } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { FieldLabel, NumberInput, Select } from '../../components/ui/field'
import { round } from '../../lib/utils'
import { downloadDxf } from '../../core/export/dxf'
import { downloadStl, downloadStlZip } from '../../core/export/stl'
import { PresetPanel } from './PresetPanel'
import { ProjectStatusPanel } from './ProjectStatusPanel'
import { useSignStore } from '../../store/sign-store'

export function ExportPanel() {
  const spec = useSignStore((state) => state.spec)
  const visibility = useSignStore((state) => state.visibility)
  const generatedParts = useSignStore((state) => state.generatedParts)
  const updateSpec = useSignStore((state) => state.updateSpec)
  const updateVisibility = useSignStore((state) => state.updateVisibility)
  const setSelectedPresetId = useSignStore((state) => state.setSelectedPresetId)

  const metrics = generatedParts?.metricsMm ?? { width: 0, height: 0, depth: 0 }
  const hasGeometry = Boolean(generatedParts?.bodyGeometry)
  const updateCustomSpec = (partial: Partial<typeof spec>) => {
    setSelectedPresetId(null)
    updateSpec(partial)
  }

  return (
    <div className="space-y-5">
      <PresetPanel />

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <div className="space-y-2">
          <FieldLabel>Base / fundo (mm)</FieldLabel>
          <NumberInput
            min={0.4}
            step={0.1}
            value={spec.baseDepthMm}
            onValueChange={(value) => {
              if (value !== undefined) {
                updateCustomSpec({ baseDepthMm: value })
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <FieldLabel>Altura da parede (mm)</FieldLabel>
          <NumberInput
            min={5}
            step={0.5}
            value={spec.wallHeightMm}
            onValueChange={(value) => {
              if (value !== undefined) {
                updateCustomSpec({ wallHeightMm: value })
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <FieldLabel>Espessura da parede (mm)</FieldLabel>
          <NumberInput
            min={0.6}
            step={0.1}
            value={spec.wallThicknessMm}
            onValueChange={(value) => {
              if (value !== undefined) {
                updateCustomSpec({ wallThicknessMm: value })
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <FieldLabel>Espessura do acrílico (mm)</FieldLabel>
          <NumberInput
            min={0.5}
            step={0.1}
            value={spec.acrylicThicknessMm}
            onValueChange={(value) => {
              if (value !== undefined) {
                updateCustomSpec({ acrylicThicknessMm: value })
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <FieldLabel>Folga de encaixe (mm)</FieldLabel>
          <NumberInput
            min={0}
            step={0.05}
            value={spec.clearanceMm}
            onValueChange={(value) => {
              if (value !== undefined) {
                updateCustomSpec({ clearanceMm: value })
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <FieldLabel>Qualidade da malha</FieldLabel>
          <Select
            value={spec.meshQuality}
            onChange={(event) =>
              updateCustomSpec({
                meshQuality: event.target.value as 'draft' | 'normal' | 'high',
              })
            }
          >
            <option value="draft">Draft</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <button
          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
            spec.mirror
              ? 'border-[var(--border-strong)] bg-[var(--accent-soft)] text-white'
              : 'border-[var(--border)] bg-black/20 text-[var(--muted)]'
          }`}
          onClick={() => updateCustomSpec({ mirror: !spec.mirror })}
        >
          Espelhar modelo
        </button>
        <button
          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
            spec.splitByLetter
              ? 'border-[var(--border-strong)] bg-[var(--accent-soft)] text-white'
              : 'border-[var(--border)] bg-black/20 text-[var(--muted)]'
          }`}
          onClick={() => updateCustomSpec({ splitByLetter: !spec.splitByLetter })}
        >
          Separar por letra
        </button>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))]">
        <button
          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
            visibility.body
              ? 'border-[var(--border-strong)] bg-white/8 text-white'
              : 'border-[var(--border)] bg-black/20 text-[var(--muted)]'
          }`}
          onClick={() => updateVisibility({ body: !visibility.body })}
        >
          Corpo
        </button>
        <button
          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
            visibility.acrylic
              ? 'border-[var(--border-strong)] bg-white/8 text-white'
              : 'border-[var(--border)] bg-black/20 text-[var(--muted)]'
          }`}
          onClick={() => updateVisibility({ acrylic: !visibility.acrylic })}
        >
          Acrílico
        </button>
        <button
          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
            visibility.letters
              ? 'border-[var(--border-strong)] bg-white/8 text-white'
              : 'border-[var(--border)] bg-black/20 text-[var(--muted)]'
          }`}
          onClick={() => updateVisibility({ letters: !visibility.letters })}
        >
          Letras
        </button>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-black/20 p-4">
        <div className="mb-4 flex items-center gap-2 text-white">
          <Layers3 className="h-4 w-4 text-[var(--primary)]" />
          <strong>Dimensões do modelo 3D</strong>
        </div>
        <div className="space-y-2 text-sm text-[var(--muted)]">
          <div className="flex justify-between">
            <span>Largura (X)</span>
            <span className="mono text-white">{round(metrics.width)} mm</span>
          </div>
          <div className="flex justify-between">
            <span>Altura (Y)</span>
            <span className="mono text-white">{round(metrics.height)} mm</span>
          </div>
          <div className="flex justify-between">
            <span>Profundidade (Z)</span>
            <span className="mono text-white">{round(metrics.depth)} mm</span>
          </div>
        </div>
      </div>

      <ProjectStatusPanel />

      <div className="grid gap-3">
        <Button
          variant="primary"
          disabled={!hasGeometry}
          onClick={() => downloadStl(generatedParts?.bodyGeometry ?? null, 'letreiro-corpo.stl')}
        >
          <Download className="h-4 w-4" />
          Exportar STL do corpo
        </Button>
        <Button
          disabled={!generatedParts?.acrylicGeometry}
          onClick={() => downloadStl(generatedParts?.acrylicGeometry ?? null, 'letreiro-acrilico.stl')}
        >
          <PackageOpen className="h-4 w-4" />
          Exportar STL do acrílico
        </Button>
        <Button
          disabled={!generatedParts?.letterGeometries.length}
          onClick={() =>
            void downloadStlZip(generatedParts?.letterGeometries ?? [], 'letras-individuais')
          }
        >
          <Layers3 className="h-4 w-4" />
          Exportar STL por letra
        </Button>
        <Button
          disabled={!generatedParts?.dxfContours.length}
          onClick={() => downloadDxf(generatedParts?.dxfContours ?? [], 'letreiro-contornos.dxf')}
        >
          <Download className="h-4 w-4" />
          Exportar DXF
        </Button>
      </div>
    </div>
  )
}
