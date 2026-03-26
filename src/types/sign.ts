import type { BufferGeometry, Shape } from 'three'

export type SourceType = 'text' | 'svg'
export type FontKind = 'builtin' | 'uploaded'
export type Alignment = 'left' | 'center' | 'right'
export type UnitConfidence = 'high' | 'medium' | 'low'
export type MeshQuality = 'draft' | 'normal' | 'high'

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

export interface SignSpec {
  baseDepthMm: number
  wallHeightMm: number
  wallThicknessMm: number
  acrylicThicknessMm: number
  clearanceMm: number
  mirror: boolean
  splitByLetter: boolean
  meshQuality: MeshQuality
}

export interface GeneratedParts {
  bodyGeometry: BufferGeometry | null
  acrylicGeometry: BufferGeometry | null
  letterGeometries: BufferGeometry[]
  dxfContours: DxfContour[]
  metricsMm: { width: number; height: number; depth: number }
}

export interface ExportJob {
  name: string
  kind: 'stl' | 'dxf' | 'zip'
  mimeType: string
}

export interface DxfContour {
  label: string
  loops: number[][][]
}

export interface BuiltinFont {
  id: string
  label: string
  file: string
}

export interface GeneratorVisibility {
  body: boolean
  acrylic: boolean
  letters: boolean
}
