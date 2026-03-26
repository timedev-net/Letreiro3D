import { FileUp, Sparkles } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { FieldLabel, NumberInput, Textarea } from '../../components/ui/field'
import { useSignStore } from '../../store/sign-store'

export function SvgInputPanel() {
  const svgSource = useSignStore((state) => state.svgSource)
  const updateSvgSource = useSignStore((state) => state.updateSvgSource)
  const loadExampleSvg = useSignStore((state) => state.loadExampleSvg)

  async function onSvgUpload(file: File | null) {
    if (!file) {
      return
    }

    const text = await file.text()
    updateSvgSource({
      fileName: file.name,
      svgText: text,
    })
  }

  async function onExampleLoad() {
    const response = await fetch('/examples/example-sign.svg')
    const text = await response.text()
    loadExampleSvg(text)
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <FieldLabel hint="Cole o SVG ou faça upload. O parser preserva escala quando encontrar unidades físicas.">
          SVG
        </FieldLabel>
        <Textarea
          value={svgSource.svgText}
          onChange={(event) =>
            updateSvgSource({
              svgText: event.target.value,
              fileName: svgSource.fileName || 'pasted.svg',
            })
          }
          placeholder="<svg viewBox='0 0 200 100'>...</svg>"
        />
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-black/15 px-4 py-3 text-sm text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-white">
          <span className="min-w-0 flex-1 truncate">
            {svgSource.fileName || 'Enviar SVG'}
          </span>
          <FileUp className="h-4 w-4 shrink-0" />
          <input
            className="hidden"
            type="file"
            accept=".svg,image/svg+xml"
            onChange={(event) => void onSvgUpload(event.target.files?.[0] ?? null)}
          />
        </label>
        <Button className="h-11" variant="secondary" onClick={() => void onExampleLoad()}>
          <Sparkles className="h-4 w-4" />
          Carregar exemplo
        </Button>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <div className="space-y-2">
          <FieldLabel hint="Opcional. Sobrescreve a largura inferida do SVG.">
            Largura física (mm)
          </FieldLabel>
          <NumberInput
            allowEmpty
            min={1}
            step={0.1}
            value={svgSource.physicalWidthMm}
            onValueChange={(value) => updateSvgSource({ physicalWidthMm: value })}
          />
        </div>
        <div className="space-y-2">
          <FieldLabel hint="Opcional. Sobrescreve a altura inferida do SVG.">
            Altura física (mm)
          </FieldLabel>
          <NumberInput
            allowEmpty
            min={1}
            step={0.1}
            value={svgSource.physicalHeightMm}
            onValueChange={(value) => updateSvgSource({ physicalHeightMm: value })}
          />
        </div>
      </div>
    </div>
  )
}
