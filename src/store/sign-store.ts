import { z } from 'zod'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  DeepPartial,
  GeneratedParts,
  GeneratorVisibility,
  ShapeDocument,
  SignSpec,
  SvgSource,
  TextSource,
} from '../types/sign'

const STORAGE_KEY = 'sign-forge-project-v1'

const notchSchema = z.object({
  enabled: z.boolean(),
  widthMm: z.number().min(2).max(80),
  depthMm: z.number().min(0.4).max(20),
  clearanceMm: z.number().min(0).max(3),
  edgeOffsetMm: z.number().min(0).max(80),
  distribution: z.enum(['auto', 'manual-count']),
  count: z.number().int().min(2).max(24),
  minSpacingMm: z.number().min(2).max(120),
})

const signSpecSchema = z.object({
  styleId: z.enum([
    'face-acrilico-fundo-impresso',
    'face-acrilico-fundo-vazado',
    'face-acrilico-parede-interna-dupla',
    'face-acrilico-back-fit',
  ]),
  outerWall: z.object({
    baseDepthMm: z.number().min(0.4).max(40),
    heightMm: z.number().min(5).max(120),
    thicknessMm: z.number().min(0.6).max(20),
  }),
  innerWall: z.object({
    heightMm: z.number().min(0).max(120),
    thicknessMm: z.number().min(0).max(20),
  }),
  face: z.object({
    thicknessMm: z.number().min(0.5).max(15),
  }),
  fitment: z.object({
    clearanceMm: z.number().min(0).max(6),
    notch: notchSchema,
  }),
  assembly: z.object({
    explodeDistanceMm: z.number().min(0).max(120),
  }),
  mirror: z.boolean(),
  splitByLetter: z.boolean(),
  meshQuality: z.enum(['draft', 'normal', 'high']),
})

const defaultTextSource: TextSource = {
  text: 'LETRA 3D',
  fontKind: 'builtin',
  fontId: 'altone-trial-regular',
  fontSizeMm: 120,
  letterSpacingMm: 6,
  alignment: 'center',
}

const defaultSvgSource: SvgSource = {
  fileName: '',
  svgText: '',
  unitConfidence: 'low',
}

const defaultSpec: SignSpec = {
  styleId: 'face-acrilico-fundo-impresso',
  outerWall: {
    baseDepthMm: 3,
    heightMm: 35,
    thicknessMm: 2,
  },
  innerWall: {
    heightMm: 30,
    thicknessMm: 1.2,
  },
  face: {
    thicknessMm: 3,
  },
  fitment: {
    clearanceMm: 0.4,
    notch: {
      enabled: false,
      widthMm: 12,
      depthMm: 2,
      clearanceMm: 0.25,
      edgeOffsetMm: 10,
      distribution: 'auto',
      count: 2,
      minSpacingMm: 16,
    },
  },
  assembly: {
    explodeDistanceMm: 0,
  },
  mirror: false,
  splitByLetter: true,
  meshQuality: 'normal',
}

const defaultVisibility: GeneratorVisibility = {
  body: true,
  face: true,
  insert: true,
}

interface SignStore {
  activeSource: 'text' | 'svg'
  textSource: TextSource
  svgSource: SvgSource
  spec: SignSpec
  visibility: GeneratorVisibility
  selectedPresetId: string | null
  shapeDocument: ShapeDocument | null
  generatedParts: GeneratedParts | null
  isBusy: boolean
  error: string | null
  hasRestoredSession: boolean
  setActiveSource: (source: 'text' | 'svg') => void
  updateTextSource: (partial: Partial<TextSource>) => void
  updateSvgSource: (partial: Partial<SvgSource>) => void
  updateSpec: (partial: DeepPartial<SignSpec>) => void
  updateVisibility: (partial: Partial<GeneratorVisibility>) => void
  setSelectedPresetId: (presetId: string | null) => void
  setShapeDocument: (document: ShapeDocument | null) => void
  setGeneratedParts: (parts: GeneratedParts | null) => void
  setBusy: (busy: boolean) => void
  setError: (error: string | null) => void
  loadExampleSvg: (svgText: string) => void
  resetProject: () => void
}

function getDefaultState() {
  return {
    activeSource: 'text' as const,
    textSource: defaultTextSource,
    svgSource: defaultSvgSource,
    spec: defaultSpec,
    visibility: defaultVisibility,
    selectedPresetId: 'standard-box' as string | null,
    shapeDocument: null,
    generatedParts: null,
    isBusy: false,
    error: null,
    hasRestoredSession: false,
  }
}

function mergeSignSpec(base: SignSpec, partial?: DeepPartial<SignSpec>): SignSpec {
  if (!partial) {
    return base
  }

  return {
    ...base,
    ...partial,
    outerWall: {
      ...base.outerWall,
      ...partial.outerWall,
    },
    innerWall: {
      ...base.innerWall,
      ...partial.innerWall,
    },
    face: {
      ...base.face,
      ...partial.face,
    },
    fitment: {
      ...base.fitment,
      ...partial.fitment,
      notch: {
        ...base.fitment.notch,
        ...partial.fitment?.notch,
      },
    },
    assembly: {
      ...base.assembly,
      ...partial.assembly,
    },
  }
}

function hasMeaningfulPersistedState(saved: Partial<SignStore>) {
  const defaultState = getDefaultState()
  const textSourceChanged =
    (saved.textSource?.text ?? defaultTextSource.text) !== defaultTextSource.text ||
    (saved.textSource?.fontId ?? defaultTextSource.fontId) !== defaultTextSource.fontId ||
    (saved.textSource?.fontSizeMm ?? defaultTextSource.fontSizeMm) !== defaultTextSource.fontSizeMm ||
    (saved.textSource?.letterSpacingMm ?? defaultTextSource.letterSpacingMm) !== defaultTextSource.letterSpacingMm ||
    (saved.textSource?.alignment ?? defaultTextSource.alignment) !== defaultTextSource.alignment

  const svgSourceChanged =
    Boolean(saved.svgSource?.svgText) ||
    Boolean(saved.svgSource?.fileName) ||
    saved.svgSource?.physicalWidthMm !== undefined ||
    saved.svgSource?.physicalHeightMm !== undefined

  const mergedSavedSpec = mergeSignSpec(defaultSpec, saved.spec)
  const specChanged = JSON.stringify(mergedSavedSpec) !== JSON.stringify(defaultSpec)

  const visibilityChanged = Object.entries(defaultVisibility).some(([key, value]) => {
    return saved.visibility?.[key as keyof GeneratorVisibility] !== undefined
      && saved.visibility?.[key as keyof GeneratorVisibility] !== value
  })

  return (
    (saved.activeSource !== undefined && saved.activeSource !== defaultState.activeSource) ||
    textSourceChanged ||
    svgSourceChanged ||
    specChanged ||
    visibilityChanged ||
    (saved.selectedPresetId !== undefined && saved.selectedPresetId !== defaultState.selectedPresetId)
  )
}

export const useSignStore = create<SignStore>()(
  persist(
    (set) => ({
      ...getDefaultState(),
      setActiveSource: (activeSource) => set({ activeSource }),
      updateTextSource: (partial) =>
        set((state) => ({
          textSource: {
            ...state.textSource,
            ...partial,
          },
        })),
      updateSvgSource: (partial) =>
        set((state) => ({
          svgSource: {
            ...state.svgSource,
            ...partial,
          },
        })),
      updateSpec: (partial) =>
        set((state) => {
          const parsed = signSpecSchema.parse(mergeSignSpec(state.spec, partial))
          return { spec: parsed }
        }),
      updateVisibility: (partial) =>
        set((state) => ({
          visibility: {
            ...state.visibility,
            ...partial,
          },
        })),
      setSelectedPresetId: (selectedPresetId) => set({ selectedPresetId }),
      setShapeDocument: (shapeDocument) => set({ shapeDocument }),
      setGeneratedParts: (generatedParts) => set({ generatedParts }),
      setBusy: (isBusy) => set({ isBusy }),
      setError: (error) => set({ error }),
      loadExampleSvg: (svgText) =>
        set({
          activeSource: 'svg',
          svgSource: {
            fileName: 'example-sign.svg',
            svgText,
            unitConfidence: 'high',
          },
        }),
      resetProject: () =>
        set({
          ...getDefaultState(),
        }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        activeSource: state.activeSource,
        textSource: state.textSource.uploadedFont
          ? {
              ...state.textSource,
              fontKind: 'builtin' as const,
              uploadedFont: undefined,
              uploadedFontName: undefined,
            }
          : state.textSource,
        svgSource: state.svgSource,
        spec: state.spec,
        visibility: state.visibility,
        selectedPresetId: state.selectedPresetId,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<SignStore>
        return {
          ...current,
          activeSource: saved.activeSource ?? current.activeSource,
          textSource: {
            ...current.textSource,
            ...saved.textSource,
            fontKind:
              saved.textSource?.fontKind === 'uploaded'
                ? 'builtin'
                : (saved.textSource?.fontKind ?? current.textSource.fontKind),
            uploadedFont: undefined,
            uploadedFontName:
              saved.textSource?.fontKind === 'uploaded'
                ? undefined
                : saved.textSource?.uploadedFontName,
          },
          svgSource: {
            ...current.svgSource,
            ...saved.svgSource,
          },
          spec: signSpecSchema.parse(mergeSignSpec(current.spec, saved.spec)),
          visibility: {
            ...current.visibility,
            ...saved.visibility,
          },
          selectedPresetId: saved.selectedPresetId ?? current.selectedPresetId,
          hasRestoredSession: hasMeaningfulPersistedState(saved),
        }
      },
    },
  ),
)
