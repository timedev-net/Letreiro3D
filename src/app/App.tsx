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
    <main className="min-h-screen overflow-x-hidden overflow-y-auto px-3 py-3 sm:px-4 md:px-5">
      <div className="flex w-full flex-col gap-3">
        <header className="relative shrink-0 overflow-hidden rounded-[calc(var(--radius)+8px)] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(135deg,rgba(10,17,31,0.98)_0%,rgba(19,31,53,0.96)_48%,rgba(74,37,14,0.94)_100%)] px-4 py-2 shadow-[var(--shadow-lg)] backdrop-blur sm:px-5 sm:py-4">
          <div className="pointer-events-none absolute inset-0">
            <img
              src="/images/header-neon-theater.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-[0.14] mix-blend-screen"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,10,20,0.92)_0%,rgba(6,10,20,0.68)_24%,rgba(6,10,20,0.52)_50%,rgba(6,10,20,0.72)_78%,rgba(6,10,20,0.94)_100%)]" />
            <div className="absolute -left-12 top-0 h-28 w-28 rounded-full bg-[rgba(92,125,255,0.2)] blur-3xl" />
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[rgba(241,154,53,0.2)] blur-3xl" />
          </div>

          <div className="relative flex flex-col items-center justify-center">
            
                <div className="flex items-center gap-2 px-3 text-[var(--primary-2)]">
                  <Box className="h-14 w-14" />
                  <span className='text-3xl font-semibold uppercase'>Letreiros 3D</span> 
                </div>
                
                <span className="text-center mt-2 text-xs leading-6 text-[rgba(238,244,255,0.78)] md:text-base">
                  Crie letreiros personalizados a partir de texto ou SVG, ajuste medidas,
                  visualize o resultado e exporte o projeto pronto para produção.
                </span>
              
      
          </div>
        </header>

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(320px,23vw)_minmax(0,1fr)_minmax(360px,25vw)]">
          
          <Card className="overflow-hidden xl:h-[min(90vh,calc(100vh-8.5rem))]">
            <div className="grid mt-8 gap-3 sm:grid-cols-2 sm:px-10 xl:px-16">
                <Button
                  variant={activeSource === 'text' ? 'primary' : 'secondary'}
                  className="h-11 border-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.2)]"
                  onClick={() => setActiveSource('text')}
                >
                  <Type className="h-4 w-4" />
                  Modo texto
                </Button>
                <Button
                  variant={activeSource === 'svg' ? 'primary' : 'secondary'}
                  className="h-11 border-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.2)]"
                  onClick={() => setActiveSource('svg')}
                >
                  <FileType2 className="h-4 w-4" />
                  Modo SVG
                </Button>
              </div>
            <div className="panel-scroll max-h-[74vh] overflow-y-auto px-4 py-5 sm:px-5 xl:h-full xl:max-h-none">
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

          <div className="xl:h-[min(90vh,calc(100vh-8.5rem))]">
            <Card className="h-[90vh] min-h-[620px] p-2 sm:p-3 xl:h-full">
              <Viewport3D />
            </Card>
          </div>

          <Card className="overflow-hidden xl:h-[min(90vh,calc(100vh-8.5rem))]">
            <div className="panel-scroll max-h-[74vh] overflow-y-auto px-4 py-5 sm:px-5 xl:h-full xl:max-h-none">
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
