import { Layers3 } from 'lucide-react'
import { letterStyles } from '../../core/styles/letter-styles'
import { setClarityTag, trackClarityEvent } from '../../lib/clarity'
import { useSignStore } from '../../store/sign-store'

export function StyleSelectorPanel() {
  const styleId = useSignStore((state) => state.spec.styleId)
  const updateSpec = useSignStore((state) => state.updateSpec)
  const setSelectedPresetId = useSignStore((state) => state.setSelectedPresetId)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-white">
        <Layers3 className="h-4 w-4 text-[var(--primary)]" />
        <strong>Estilos de letreiro</strong>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {letterStyles.map((style) => {
          const isActive = style.id === styleId
          return (
            <button
              key={style.id}
              className={`rounded-3xl border p-4 text-left transition ${
                isActive
                  ? 'border-[var(--primary)] bg-[rgba(241,154,53,0.1)]'
                  : 'border-[var(--border)] bg-black/20 hover:border-[var(--border-strong)] hover:bg-white/6'
              }`}
              onClick={() => {
                setSelectedPresetId(null)
                updateSpec({ styleId: style.id })
                trackClarityEvent('style_selected')
                setClarityTag('style_id', style.id)
                setClarityTag('selected_preset', 'custom')
              }}
            >
              <div className="text-sm font-semibold text-white">{style.label}</div>
              <div className="mt-2 text-sm text-[var(--muted)]">{style.description}</div>
              <div className="mt-3 text-xs uppercase tracking-[0.12em] text-[var(--muted-2)]">
                {style.summary}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
