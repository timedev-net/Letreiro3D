import { Upload } from 'lucide-react'
import { builtinFonts } from '../../core/fonts/catalog'
import { Button } from '../../components/ui/button'
import { FieldLabel, NumberInput, Select, Textarea } from '../../components/ui/field'
import { setClarityTag, trackClarityEvent } from '../../lib/clarity'
import { useSignStore } from '../../store/sign-store'

export function TextInputPanel() {
  const textSource = useSignStore((state) => state.textSource)
  const updateTextSource = useSignStore((state) => state.updateTextSource)

  async function onFontUpload(file: File | null) {
    if (!file) {
      return
    }

    const buffer = await file.arrayBuffer()
    updateTextSource({
      fontKind: 'uploaded',
      uploadedFont: buffer,
      uploadedFontName: file.name,
    })
    trackClarityEvent('text_font_uploaded')
    setClarityTag('font_source', 'uploaded')
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <FieldLabel hint="Use uma ou mais linhas. Cada glifo pode virar um STL individual.">
          Texto
        </FieldLabel>
        <Textarea
          value={textSource.text}
          onChange={(event) => updateTextSource({ text: event.target.value })}
          placeholder="Ex.: LETRA 3D"
        />
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <div className="space-y-2">
          <FieldLabel>Fonte interna</FieldLabel>
          <Select
            value={textSource.fontId}
            onChange={(event) =>
              updateTextSource({
                fontKind: 'builtin',
                fontId: event.target.value,
              })
            }
          >
            {builtinFonts.map((font) => (
              <option key={font.id} value={font.id}>
                {font.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <FieldLabel hint={textSource.uploadedFontName || 'TTF e OTF são suportados.'}>
            Fonte enviada
          </FieldLabel>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-black/15 px-4 py-3 text-sm text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-white">
            <span className="min-w-0 flex-1 truncate">
              {textSource.uploadedFontName ?? 'Enviar arquivo de fonte'}
            </span>
            <Upload className="h-4 w-4 shrink-0" />
            <input
              className="hidden"
              type="file"
              accept=".ttf,.otf,font/ttf,font/otf"
              onChange={(event) => void onFontUpload(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <div className="space-y-2">
          <FieldLabel>Tamanho da fonte (mm)</FieldLabel>
          <NumberInput
            min={10}
            max={500}
            step={1}
            value={textSource.fontSizeMm}
            onValueChange={(value) => {
              if (value !== undefined) {
                updateTextSource({ fontSizeMm: value })
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <FieldLabel>Espaçamento (mm)</FieldLabel>
          <NumberInput
            min={0}
            max={100}
            step={0.5}
            value={textSource.letterSpacingMm}
            onValueChange={(value) => {
              if (value !== undefined) {
                updateTextSource({ letterSpacingMm: value })
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <FieldLabel>Alinhamento</FieldLabel>
          <Select
            value={textSource.alignment}
            onChange={(event) =>
              updateTextSource({
                alignment: event.target.value as 'left' | 'center' | 'right',
              })
            }
          >
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
          </Select>
        </div>
      </div>

      {textSource.fontKind === 'uploaded' ? (
        <Button
          className="w-full"
          variant="ghost"
          onClick={() => {
            updateTextSource({ fontKind: 'builtin', uploadedFont: undefined, uploadedFontName: undefined })
            trackClarityEvent('text_font_reset_to_builtin')
            setClarityTag('font_source', 'builtin')
          }}
        >
          Voltar para fonte interna
        </Button>
      ) : null}
    </div>
  )
}
