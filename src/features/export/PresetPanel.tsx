import { WandSparkles } from 'lucide-react'
import { signPresets } from '../../core/presets/sign-presets'
import { useSignStore } from '../../store/sign-store'

export function PresetPanel() {
  const selectedPresetId = useSignStore((state) => state.selectedPresetId)
  const updateSpec = useSignStore((state) => state.updateSpec)
  const setSelectedPresetId = useSignStore((state) => state.setSelectedPresetId)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-white">
        <WandSparkles className="h-4 w-4 text-[var(--primary)]" />
        <strong>Presets rápidos</strong>
      </div>

      <div className="grid gap-3">
        {signPresets.map((preset) => {
          const isActive = preset.id === selectedPresetId
          return (
            <button
              key={preset.id}
              className={`rounded-3xl border p-4 text-left transition ${
                isActive
                  ? 'border-[var(--border-strong)] bg-[var(--accent-soft)]'
                  : 'border-[var(--border)] bg-black/20 hover:border-[var(--border-strong)] hover:bg-white/6'
              }`}
              onClick={() => {
                setSelectedPresetId(preset.id)
                updateSpec(preset.spec)
              }}
            >
              <div className="text-sm font-semibold text-white">{preset.label}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">{preset.description}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
