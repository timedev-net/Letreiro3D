import { AlertTriangle, DatabaseBackup, RefreshCcw, Ruler, ShieldAlert } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { useSignStore } from '../../store/sign-store'

export function ProjectStatusPanel() {
  const shapeDocument = useSignStore((state) => state.shapeDocument)
  const generatedParts = useSignStore((state) => state.generatedParts)
  const activeSource = useSignStore((state) => state.activeSource)
  const hasRestoredSession = useSignStore((state) => state.hasRestoredSession)
  const resetProject = useSignStore((state) => state.resetProject)

  if (!shapeDocument) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-black/20 p-4 text-sm text-[var(--muted)]">
        Nenhum documento vetorial normalizado ainda. Assim que o parser fechar a entrada, os detalhes aparecem aqui.
      </div>
    )
  }

  const { metadata, boundsMm } = shapeDocument

  return (
    <div className="space-y-4 rounded-3xl border border-[var(--border)] bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-white">
            <Ruler className="h-4 w-4 text-[var(--primary)]" />
            <strong>Documento normalizado</strong>
          </div>
          <p className="text-sm text-[var(--muted)]">
            {metadata.sourceLabel} · {activeSource === 'svg' ? 'SVG' : 'Texto'}
          </p>
        </div>
        <Button variant="ghost" className="px-3 py-2" onClick={() => resetProject()}>
          <RefreshCcw className="h-4 w-4" />
          Resetar
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-white/4 p-3">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted-2)]">Bounds 2D</div>
          <div className="mt-2 text-sm text-white">
            {boundsMm.width.toFixed(1)} x {boundsMm.height.toFixed(1)} mm
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white/4 p-3">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted-2)]">Contornos</div>
          <div className="mt-2 text-sm text-white">
            {metadata.groupCount} grupos · {metadata.contourCount} loops
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white/4 p-3">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted-2)]">Peças 3D</div>
          <div className="mt-2 text-sm text-white">
            {generatedParts?.parts.length ?? 0} peças geradas
          </div>
        </div>
      </div>

      {activeSource === 'svg' ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white/4 p-3 text-sm text-[var(--muted)]">
          <div className="mb-2 flex items-center gap-2 text-white">
            <ShieldAlert className="h-4 w-4 text-[var(--primary)]" />
            Confiança de unidade
          </div>
          <div>
            {metadata.unitConfidence ?? 'low'} · origem {metadata.unitSource ?? 'fallback'}
          </div>
          {metadata.inferredWidthMm && metadata.inferredHeightMm ? (
            <div className="mt-1">
              Base física inferida: {metadata.inferredWidthMm.toFixed(1)} x {metadata.inferredHeightMm.toFixed(1)} mm
            </div>
          ) : null}
        </div>
      ) : null}

      {[...metadata.warnings, ...(generatedParts?.warnings ?? [])].length ? (
        <div className="space-y-2">
          {[...new Set([...metadata.warnings, ...(generatedParts?.warnings ?? [])])].map((warning) => (
            <div
              key={warning}
              className="flex gap-2 rounded-2xl border border-[rgba(241,154,53,0.35)] bg-[rgba(241,154,53,0.08)] p-3 text-sm text-[var(--primary-2)]"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
        <DatabaseBackup className="h-4 w-4 text-[var(--accent)]" />
        {hasRestoredSession
          ? 'Sessão local restaurada automaticamente.'
          : 'Alterações são salvas localmente no navegador.'}
      </div>
    </div>
  )
}
