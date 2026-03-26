import { startTransition, useDeferredValue, useEffect } from 'react'
import { Box, FileType2, Type } from 'lucide-react'
import { builtinFonts } from '../core/fonts/catalog'
import { generateSignParts } from '../core/geometry/sign-generator'
import { createSvgShapeDocument } from '../core/shape/svg-parser'
import { createTextShapeDocument } from '../core/shape/text-parser'
import { PanelSection } from '../components/layout/PanelSection'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { TextInputPanel } from '../features/input-text/TextInputPanel'
import { SvgInputPanel } from '../features/input-svg/SvgInputPanel'
import { ExportPanel } from '../features/export/ExportPanel'
import { Viewport3D } from '../features/preview-3d/Viewport3D'
import { useSignStore } from '../store/sign-store'

export default function App() {
  const activeSource = useSignStore((state) => state.activeSource)
  const textSource = useSignStore((state) => state.textSource)
  const svgSource = useSignStore((state) => state.svgSource)
  const spec = useSignStore((state) => state.spec)
  const setActiveSource = useSignStore((state) => state.setActiveSource)
  const setShapeDocument = useSignStore((state) => state.setShapeDocument)
  const setGeneratedParts = useSignStore((state) => state.setGeneratedParts)
  const setBusy = useSignStore((state) => state.setBusy)
  const setError = useSignStore((state) => state.setError)
  const deferredActiveSource = useDeferredValue(activeSource)
  const deferredText = useDeferredValue(textSource)
  const deferredSvg = useDeferredValue(svgSource)
  const deferredSpec = useDeferredValue(spec)

  useEffect(() => {
    let cancelled = false

    const timer = window.setTimeout(async () => {
      setBusy(true)
      setError(null)

      try {
        const document =
          deferredActiveSource === 'text'
            ? await createTextShapeDocument({
                ...deferredText,
                fontId: deferredText.fontId ?? builtinFonts[0].id,
              })
            : createSvgShapeDocument(deferredSvg)

        if (cancelled) {
          return
        }

        const generated = generateSignParts(document, deferredSpec)
        startTransition(() => {
          setShapeDocument(document)
          setGeneratedParts(generated)
        })
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : 'Erro inesperado ao gerar o modelo'
          startTransition(() => {
            setShapeDocument(null)
            setGeneratedParts(null)
            setError(message)
          })
        }
      } finally {
        if (!cancelled) {
          setBusy(false)
        }
      }
    }, 160)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [
    deferredActiveSource,
    deferredSpec,
    deferredSvg,
    deferredText,
    setBusy,
    setError,
    setGeneratedParts,
    setShapeDocument,
  ])

  return (
    <main className="min-h-screen px-3 py-4 sm:px-4 md:px-6">
      <div className="flex w-full flex-col gap-5">
        <header className="rounded-[calc(var(--radius)+10px)] border border-[var(--border)] bg-[var(--background-panel)] px-5 py-5 shadow-[var(--shadow-lg)] backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary-2)]">
                <Box className="h-3.5 w-3.5" />
                Letreiro3D
              </div>
              <div>
                <h1 className="m-0 text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                  Letreiros 3D por texto e SVG
                </h1>
                <p className="mt-3 max-w-3xl text-sm text-[var(--muted)] md:text-base">
                  Pipeline 100% web para entrada vetorial, geração paramétrica,
                  preview com three.js e exportações STL/DXF prontas para corte ou impressão.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant={activeSource === 'text' ? 'primary' : 'secondary'}
                className="h-12"
                onClick={() => setActiveSource('text')}
              >
                <Type className="h-4 w-4" />
                Modo texto
              </Button>
              <Button
                variant={activeSource === 'svg' ? 'primary' : 'secondary'}
                className="h-12"
                onClick={() => setActiveSource('svg')}
              >
                <FileType2 className="h-4 w-4" />
                Modo SVG
              </Button>
            </div>
          </div>
        </header>

        <div className="grid min-h-[calc(100vh-11rem)] gap-5 2xl:grid-cols-[minmax(360px,24vw)_minmax(0,1fr)_minmax(400px,26vw)]">
          <Card className="h-full overflow-hidden">
            <div className="h-full overflow-y-auto px-4 py-5 sm:px-5">
              <PanelSection
                title={activeSource === 'text' ? 'Origem por texto' : 'Origem por SVG'}
                subtitle={
                  activeSource === 'text'
                    ? 'Converta glifos em contornos vetoriais reais com fontes internas ou enviadas.'
                    : 'Cole ou envie arquivos SVG físicos e mantenha a escala em milímetros.'
                }
              >
                {activeSource === 'text' ? <TextInputPanel /> : <SvgInputPanel />}
              </PanelSection>
            </div>
          </Card>

          <Card className="h-full min-h-[620px] p-2 sm:p-3">
            <Viewport3D />
          </Card>

          <Card className="h-full overflow-hidden">
            <div className="h-full overflow-y-auto px-4 py-5 sm:px-5">
              <PanelSection
                title="Parâmetros e exportação"
                subtitle="Ajuste o canal, a face e os artefatos de saída sem sair da mesma tela."
              >
                <ExportPanel />
              </PanelSection>
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}
