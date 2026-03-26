import { z } from 'zod'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  GeneratedParts,
  GeneratorVisibility,
  ShapeDocument,
  SignSpec,
  SvgSource,
  TextSource,
} from '../types/sign'

const STORAGE_KEY = 'sign-forge-project-v1'

const signSpecSchema = z.object({
  baseDepthMm: z.number().min(0.4).max(40),
  wallHeightMm: z.number().min(5).max(120),
  wallThicknessMm: z.number().min(0.6).max(20),
  acrylicThicknessMm: z.number().min(0.5).max(15),
  clearanceMm: z.number().min(0).max(6),
  mirror: z.boolean(),
  splitByLetter: z.boolean(),
  meshQuality: z.enum(['draft', 'normal', 'high']),
})

const defaultTextSource: TextSource = {
  text: 'LETRA 3D',
  fontKind: 'builtin',
  fontId: 'fira-sans-condensed-bold',
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
  baseDepthMm: 3,
  wallHeightMm: 35,
  wallThicknessMm: 2,
  acrylicThicknessMm: 3,
  clearanceMm: 0.4,
  mirror: false,
  splitByLetter: true,
  meshQuality: 'normal',
}

const defaultVisibility: GeneratorVisibility = {
  body: true,
  acrylic: true,
  letters: true,
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
  updateSpec: (partial: Partial<SignSpec>) => void
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

  const specChanged = Object.entries(defaultSpec).some(([key, value]) => {
    return saved.spec?.[key as keyof SignSpec] !== undefined
      && saved.spec?.[key as keyof SignSpec] !== value
  })

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
          const parsed = signSpecSchema.parse({
            ...state.spec,
            ...partial,
          })
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
          spec: {
            ...current.spec,
            ...saved.spec,
          },
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
