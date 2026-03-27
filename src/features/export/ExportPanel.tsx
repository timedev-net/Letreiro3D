import { Download, Layers3, PackageOpen, Settings2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { FieldLabel, NumberInput, Select } from '../../components/ui/field'
import { downloadDxf, getContoursByRole } from '../../core/export/dxf'
import { downloadPartRoleStl, downloadPartsZip } from '../../core/export/stl'
import { round } from '../../lib/utils'
import { useSignStore } from '../../store/sign-store'
import type { DeepPartial, SignSpec } from '../../types/sign'
import { PresetPanel } from './PresetPanel'
import { ProjectStatusPanel } from './ProjectStatusPanel'
import { StyleSelectorPanel } from './StyleSelectorPanel'

export function ExportPanel() {
  const spec = useSignStore((state) => state.spec)
  const visibility = useSignStore((state) => state.visibility)
  const generatedParts = useSignStore((state) => state.generatedParts)
  const updateSpec = useSignStore((state) => state.updateSpec)
  const updateVisibility = useSignStore((state) => state.updateVisibility)
  const setSelectedPresetId = useSignStore((state) => state.setSelectedPresetId)

  const metrics = generatedParts?.metricsMm ?? { width: 0, height: 0, depth: 0 }
  const parts = generatedParts?.parts ?? []
  const hasGeometry = parts.length > 0
  const hasRole = (role: 'body' | 'face' | 'insert') => parts.some((part) => part.role === role)
  const styleHasBase = spec.styleId === 'face-acrilico-fundo-impresso'
    || spec.styleId === 'face-acrilico-parede-interna-dupla'

  const updateCustomSpec = (partial: DeepPartial<SignSpec>) => {
    setSelectedPresetId(null)
    updateSpec(partial)
  }

  return (
    <div className="space-y-5">
      <StyleSelectorPanel />
      <PresetPanel />

      <div className="space-y-4 rounded-3xl border border-[var(--border)] bg-black/20 p-4">
        <div className="flex items-center gap-2 text-white">
          <Settings2 className="h-4 w-4 text-[var(--primary)]" />
          <strong>Parede externa</strong>
        </div>

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          {styleHasBase ? (
            <div className="space-y-2">
              <FieldLabel>Base / fundo (mm)</FieldLabel>
              <NumberInput
                min={0.4}
                step={0.1}
                value={spec.outerWall.baseDepthMm}
                onValueChange={(value) => {
                  if (value !== undefined) {
                    updateCustomSpec({
                      outerWall: {
                        baseDepthMm: value,
                      },
                    })
                  }
                }}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <FieldLabel>Altura da parede externa (mm)</FieldLabel>
            <NumberInput
              min={5}
              step={0.5}
              value={spec.outerWall.heightMm}
              onValueChange={(value) => {
                if (value !== undefined) {
                  updateCustomSpec({
                    outerWall: {
                      heightMm: value,
                    },
                  })
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Espessura da parede externa (mm)</FieldLabel>
            <NumberInput
              min={0.6}
              step={0.1}
              value={spec.outerWall.thicknessMm}
              onValueChange={(value) => {
                if (value !== undefined) {
                  updateCustomSpec({
                    outerWall: {
                      thicknessMm: value,
                    },
                  })
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-[var(--border)] bg-black/20 p-4">
        <div className="flex items-center gap-2 text-white">
          <Layers3 className="h-4 w-4 text-[var(--primary)]" />
          <strong>Parede interna</strong>
        </div>

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          <div className="space-y-2">
            <FieldLabel>Altura da parede interna (mm)</FieldLabel>
            <NumberInput
              min={0}
              step={0.5}
              value={spec.innerWall.heightMm}
              onValueChange={(value) => {
                if (value !== undefined) {
                  updateCustomSpec({
                    innerWall: {
                      heightMm: value,
                    },
                  })
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel hint="Valor 0 desativa a parede interna.">
              Espessura da parede interna (mm)
            </FieldLabel>
            <NumberInput
              min={0}
              step={0.1}
              value={spec.innerWall.thicknessMm}
              onValueChange={(value) => {
                if (value !== undefined) {
                  updateCustomSpec({
                    innerWall: {
                      thicknessMm: value,
                    },
                  })
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Espessura da face (mm)</FieldLabel>
            <NumberInput
              min={0.5}
              step={0.1}
              value={spec.face.thicknessMm}
              onValueChange={(value) => {
                if (value !== undefined) {
                  updateCustomSpec({
                    face: {
                      thicknessMm: value,
                    },
                  })
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Folga global (mm)</FieldLabel>
            <NumberInput
              min={0}
              step={0.05}
              value={spec.fitment.clearanceMm}
              onValueChange={(value) => {
                if (value !== undefined) {
                  updateCustomSpec({
                    fitment: {
                      clearanceMm: value,
                    },
                  })
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
      </div>

      <div className="space-y-4 rounded-3xl border border-[var(--border)] bg-black/20 p-4">
        <div className="flex items-center gap-2 text-white">
          <PackageOpen className="h-4 w-4 text-[var(--primary)]" />
          <strong>Encaixe e entalhe</strong>
        </div>

        <button
          className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
            spec.fitment.notch.enabled
              ? 'border-[var(--border-strong)] bg-[rgba(241,154,53,0.1)] text-white'
              : 'border-[var(--border)] bg-black/20 text-[var(--muted)]'
          }`}
          onClick={() =>
            updateCustomSpec({
              fitment: {
                notch: {
                  enabled: !spec.fitment.notch.enabled,
                },
              },
            })
          }
        >
          {spec.fitment.notch.enabled ? 'Entalhe ativado na parede interna' : 'Entalhe desativado'}
        </button>

        {spec.fitment.notch.enabled ? (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
            <div className="space-y-2">
              <FieldLabel>Largura do entalhe (mm)</FieldLabel>
              <NumberInput
                min={2}
                step={0.5}
                value={spec.fitment.notch.widthMm}
                onValueChange={(value) => {
                  if (value !== undefined) {
                    updateCustomSpec({
                      fitment: {
                        notch: {
                          widthMm: value,
                        },
                      },
                    })
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Profundidade do entalhe (mm)</FieldLabel>
              <NumberInput
                min={0.4}
                step={0.1}
                value={spec.fitment.notch.depthMm}
                onValueChange={(value) => {
                  if (value !== undefined) {
                    updateCustomSpec({
                      fitment: {
                        notch: {
                          depthMm: value,
                        },
                      },
                    })
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Folga do entalhe (mm)</FieldLabel>
              <NumberInput
                min={0}
                step={0.05}
                value={spec.fitment.notch.clearanceMm}
                onValueChange={(value) => {
                  if (value !== undefined) {
                    updateCustomSpec({
                      fitment: {
                        notch: {
                          clearanceMm: value,
                        },
                      },
                    })
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Offset da borda (mm)</FieldLabel>
              <NumberInput
                min={0}
                step={0.5}
                value={spec.fitment.notch.edgeOffsetMm}
                onValueChange={(value) => {
                  if (value !== undefined) {
                    updateCustomSpec({
                      fitment: {
                        notch: {
                          edgeOffsetMm: value,
                        },
                      },
                    })
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Distribuição</FieldLabel>
              <Select
                value={spec.fitment.notch.distribution}
                onChange={(event) =>
                  updateCustomSpec({
                    fitment: {
                      notch: {
                        distribution: event.target.value as 'auto' | 'manual-count',
                      },
                    },
                  })
                }
              >
                <option value="auto">Automática</option>
                <option value="manual-count">Manual por quantidade</option>
              </Select>
            </div>
            {spec.fitment.notch.distribution === 'manual-count' ? (
              <div className="space-y-2">
                <FieldLabel>Quantidade</FieldLabel>
                <NumberInput
                  min={2}
                  step={1}
                  value={spec.fitment.notch.count}
                  onValueChange={(value) => {
                    if (value !== undefined) {
                      updateCustomSpec({
                        fitment: {
                          notch: {
                            count: Math.round(value),
                          },
                        },
                      })
                    }
                  }}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <FieldLabel>Espaçamento mínimo (mm)</FieldLabel>
                <NumberInput
                  min={2}
                  step={0.5}
                  value={spec.fitment.notch.minSpacingMm}
                  onValueChange={(value) => {
                    if (value !== undefined) {
                      updateCustomSpec({
                        fitment: {
                          notch: {
                            minSpacingMm: value,
                          },
                        },
                      })
                    }
                  }}
                />
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="space-y-4 rounded-3xl border border-[var(--border)] bg-black/20 p-4">
        <div className="flex items-center gap-2 text-white">
          <Layers3 className="h-4 w-4 text-[var(--primary)]" />
          <strong>Montagem e preview</strong>
        </div>

        <div className="space-y-2">
          <FieldLabel hint="Afasta apenas as peças destacáveis no preview. O corpo permanece fixo.">
            Distância de montagem (mm)
          </FieldLabel>
          <input
            className="w-full accent-[var(--primary)]"
            type="range"
            min={0}
            max={40}
            step={0.5}
            value={spec.assembly.explodeDistanceMm}
            onChange={(event) =>
              updateCustomSpec({
                assembly: {
                  explodeDistanceMm: Number(event.target.value),
                },
              })
            }
          />
          <div className="text-right text-sm text-[var(--muted)]">
            {round(spec.assembly.explodeDistanceMm)} mm
          </div>
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
              visibility.face
                ? 'border-[var(--border-strong)] bg-white/8 text-white'
                : 'border-[var(--border)] bg-black/20 text-[var(--muted)]'
            }`}
            onClick={() => updateVisibility({ face: !visibility.face })}
          >
            Face
          </button>
          <button
            className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
              visibility.insert
                ? 'border-[var(--border-strong)] bg-white/8 text-white'
                : 'border-[var(--border)] bg-black/20 text-[var(--muted)]'
            }`}
            onClick={() => updateVisibility({ insert: !visibility.insert })}
          >
            Encaixes
          </button>
        </div>
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
          onClick={() => void downloadPartsZip(parts, 'letreiro3d-pecas')}
        >
          <PackageOpen className="h-4 w-4" />
          Exportar ZIP das peças
        </Button>
        <Button
          disabled={!hasRole('body')}
          onClick={() => downloadPartRoleStl(parts, 'body', 'letreiro-corpo.stl')}
        >
          <Download className="h-4 w-4" />
          Exportar STL do corpo
        </Button>
        <Button
          disabled={!hasRole('face')}
          onClick={() => downloadPartRoleStl(parts, 'face', 'letreiro-face.stl')}
        >
          <PackageOpen className="h-4 w-4" />
          Exportar STL da face
        </Button>
        <Button
          disabled={!getContoursByRole(generatedParts?.dxfContours ?? [], 'body').length}
          onClick={() => downloadDxf(getContoursByRole(generatedParts?.dxfContours ?? [], 'body'), 'letreiro-corpo.dxf')}
        >
          <Download className="h-4 w-4" />
          Exportar DXF do corpo
        </Button>
        <Button
          disabled={!getContoursByRole(generatedParts?.dxfContours ?? [], 'face').length}
          onClick={() => downloadDxf(getContoursByRole(generatedParts?.dxfContours ?? [], 'face'), 'letreiro-face.dxf')}
        >
          <Download className="h-4 w-4" />
          Exportar DXF da face
        </Button>
      </div>
    </div>
  )
}
