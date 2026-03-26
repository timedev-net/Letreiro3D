import { Vector2 } from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import type { ShapeDocument, ShapeGroup, SvgSource } from '../../types/sign'
import { extractSvgPhysicalInfo } from '../units/svg-units'
import { getShapeBounds, normalizeDocument, transformShapes } from './shape-utils'

export function createSvgShapeDocument(source: SvgSource): ShapeDocument {
  if (!source.svgText.trim()) {
    throw new Error('Nenhum SVG carregado')
  }

  const loader = new SVGLoader()
  const parsed = loader.parse(source.svgText)
  const groups: ShapeGroup[] = []
  const warnings: string[] = []

  parsed.paths.forEach((path, index) => {
    const shapes = SVGLoader.createShapes(path)
    if (shapes.length === 0) {
      return
    }

    const flipped = transformShapes(
      shapes,
      (point) => new Vector2(point.x, -point.y),
    )

    groups.push({
      id: `svg-${index}`,
      label: `SVG ${index + 1}`,
      shapes: flipped,
      boundsMm: getShapeBounds(flipped),
    })
  })

  if (groups.length === 0) {
    throw new Error('O SVG não possui paths compatíveis com a geração 3D')
  }

  const physicalInfo = extractSvgPhysicalInfo(source.svgText)
  if (physicalInfo.unitConfidence === 'medium') {
    warnings.push('O SVG parece usar pixels ou valores sem unidade explícita. A escala foi inferida.')
  }
  if (physicalInfo.unitConfidence === 'low') {
    warnings.push('A escala física foi inferida a partir do viewBox ou fallback. Revise largura/altura antes de exportar.')
  }

  const document = normalizeDocument(groups, 'svg', {
    sourceLabel: source.fileName || 'SVG colado',
    unitConfidence: source.unitConfidence === 'low' ? physicalInfo.unitConfidence : source.unitConfidence,
    unitSource: physicalInfo.source,
    inferredWidthMm: physicalInfo.widthMm,
    inferredHeightMm: physicalInfo.heightMm,
    warnings,
  })
  const scaleX = (source.physicalWidthMm ?? physicalInfo.widthMm ?? document.boundsMm.width) / Math.max(document.boundsMm.width, 1)
  const scaleY = (source.physicalHeightMm ?? physicalInfo.heightMm ?? document.boundsMm.height) / Math.max(document.boundsMm.height, 1)

  const scaledGroups = document.groups.map((group) => ({
    ...group,
    shapes: transformShapes(
      group.shapes,
      (point) => new Vector2(point.x * scaleX, point.y * scaleY),
    ),
  }))

  return normalizeDocument(scaledGroups, 'svg', {
    sourceLabel: source.fileName || 'SVG colado',
    unitConfidence: source.unitConfidence === 'low' ? physicalInfo.unitConfidence : source.unitConfidence,
    unitSource: physicalInfo.source,
    inferredWidthMm: source.physicalWidthMm ?? physicalInfo.widthMm,
    inferredHeightMm: source.physicalHeightMm ?? physicalInfo.heightMm,
    warnings,
  })
}
