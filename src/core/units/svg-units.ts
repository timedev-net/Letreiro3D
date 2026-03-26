import type { UnitConfidence } from '../../types/sign'

const PX_TO_MM = 25.4 / 96

function parseMeasureToMm(value?: string | null) {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  const match = trimmed.match(/^([+-]?\d*\.?\d+)(mm|cm|in|pt|pc|px)?$/i)
  if (!match) {
    return null
  }

  const numeric = Number.parseFloat(match[1])
  const unit = (match[2] ?? 'px').toLowerCase()

  switch (unit) {
    case 'mm':
      return numeric
    case 'cm':
      return numeric * 10
    case 'in':
      return numeric * 25.4
    case 'pt':
      return (numeric * 25.4) / 72
    case 'pc':
      return (numeric * 25.4) / 6
    case 'px':
    default:
      return numeric * PX_TO_MM
  }
}

export interface SvgPhysicalInfo {
  widthMm?: number
  heightMm?: number
  unitConfidence: UnitConfidence
  source: 'width-height' | 'viewBox' | 'fallback'
}

export function extractSvgPhysicalInfo(svgText: string): SvgPhysicalInfo {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgText, 'image/svg+xml')
  const svg = doc.querySelector('svg')

  if (!svg) {
    throw new Error('SVG inválido: elemento <svg> não encontrado')
  }

  const widthAttr = svg.getAttribute('width')
  const heightAttr = svg.getAttribute('height')
  const widthMm = parseMeasureToMm(widthAttr)
  const heightMm = parseMeasureToMm(heightAttr)

  if (widthMm && heightMm) {
    const pxLike = [widthAttr, heightAttr].some(
      (item) => item?.trim().toLowerCase().endsWith('px') || /^\d*\.?\d+$/.test(item ?? '')
    )

    return {
      widthMm,
      heightMm,
      unitConfidence: pxLike ? 'medium' : 'high',
      source: 'width-height',
    }
  }

  const viewBox = svg.getAttribute('viewBox')
  if (viewBox) {
    const parts = viewBox.split(/[ ,]+/).map((part) => Number.parseFloat(part))
    if (parts.length === 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3])) {
      return {
        widthMm: parts[2],
        heightMm: parts[3],
        unitConfidence: 'low',
        source: 'viewBox',
      }
    }
  }

  return {
    widthMm: 100,
    heightMm: 100,
    unitConfidence: 'low',
    source: 'fallback',
  }
}
