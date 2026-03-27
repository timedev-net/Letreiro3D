import type { BufferGeometry, Shape } from 'three'

export type SourceType = 'text' | 'svg'
export type FontKind = 'builtin' | 'uploaded'
export type Alignment = 'left' | 'center' | 'right'
export type UnitConfidence = 'high' | 'medium' | 'low'
export type MeshQuality = 'draft' | 'normal' | 'high'
export type PartRole = 'body' | 'face' | 'insert'
export type NotchDistribution = 'auto' | 'manual-count'
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

export type LetterStyleId =
  | 'face-acrilico-fundo-impresso'
  | 'face-acrilico-fundo-vazado'
  | 'face-acrilico-parede-interna-dupla'
  | 'face-acrilico-back-fit'

export interface TextSource {
  text: string
  fontKind: FontKind
  fontId?: string
  uploadedFont?: ArrayBuffer
  uploadedFontName?: string
  fontSizeMm: number
  letterSpacingMm: number
  alignment: Alignment
}

export interface SvgSource {
  fileName: string
  svgText: string
  physicalWidthMm?: number
  physicalHeightMm?: number
  unitConfidence: UnitConfidence
}

export interface ShapeGroup {
  id: string
  label: string
  shapes: Shape[]
  boundsMm: { width: number; height: number; minX: number; minY: number }
}

export interface ShapeDocument {
  groups: ShapeGroup[]
  boundsMm: { width: number; height: number; minX: number; minY: number }
  sourceType: SourceType
  metadata: ShapeDocumentMetadata
}

export interface ShapeDocumentMetadata {
  sourceLabel: string
  unitConfidence?: UnitConfidence
  unitSource?: 'width-height' | 'viewBox' | 'fallback'
  inferredWidthMm?: number
  inferredHeightMm?: number
  groupCount: number
  contourCount: number
  warnings: string[]
}

export interface OuterWallSpec {
  baseDepthMm: number
  heightMm: number
  thicknessMm: number
}

export interface InnerWallSpec {
  heightMm: number
  thicknessMm: number
}

export interface FaceSpec {
  thicknessMm: number
}

export interface NotchSpec {
  enabled: boolean
  widthMm: number
  depthMm: number
  clearanceMm: number
  edgeOffsetMm: number
  distribution: NotchDistribution
  count: number
  minSpacingMm: number
}

export interface FitmentSpec {
  clearanceMm: number
  notch: NotchSpec
}

export interface AssemblySpec {
  explodeDistanceMm: number
}

export interface SignSpec {
  styleId: LetterStyleId
  outerWall: OuterWallSpec
  innerWall: InnerWallSpec
  face: FaceSpec
  fitment: FitmentSpec
  assembly: AssemblySpec
  mirror: boolean
  splitByLetter: boolean
  meshQuality: MeshQuality
}

export interface GeneratedPart {
  id: string
  role: PartRole
  label: string
  geometry: BufferGeometry
  exportName: string
  visibleByDefault: boolean
  assemblyOffset: [number, number, number]
  letterId?: string
  dxfLoops?: number[][][]
}

export interface GeneratedParts {
  parts: GeneratedPart[]
  dxfContours: DxfContour[]
  metricsMm: { width: number; height: number; depth: number }
  warnings: string[]
}

export interface ExportJob {
  name: string
  kind: 'stl' | 'dxf' | 'zip'
  mimeType: string
}

export interface DxfContour {
  label: string
  role: PartRole
  loops: number[][][]
}

export interface BuiltinFont {
  id: string
  label: string
  file: string
}

export interface GeneratorVisibility {
  body: boolean
  face: boolean
  insert: boolean
}
