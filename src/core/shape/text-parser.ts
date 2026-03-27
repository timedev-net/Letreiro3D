import * as opentype from 'opentype.js'
import { ShapePath } from 'three'
import type { ShapeDocument, ShapeGroup, TextSource } from '../../types/sign'
import { builtinFonts } from '../fonts/catalog'
import { loadBuiltinFont, loadUploadedFont } from '../fonts/load-font'
import {
  getShapeBounds,
  normalizeDocument,
  transformShapes,
} from './shape-utils'

interface OpenTypeCommand {
  type: string
  x?: number
  y?: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}

async function resolveFont(source: TextSource) {
  if (source.fontKind === 'uploaded' && source.uploadedFont) {
    return loadUploadedFont(source.uploadedFont)
  }

  const selectedFont =
    builtinFonts.find((font) => font.id === source.fontId) ?? builtinFonts[0]

  return loadBuiltinFont(selectedFont.file)
}

function commandsToShapePath(commands: OpenTypeCommand[]) {
  const path = new ShapePath()

  commands.forEach((command) => {
    switch (command.type) {
      case 'M':
        path.moveTo(command.x ?? 0, command.y ?? 0)
        break
      case 'L':
        path.lineTo(command.x ?? 0, command.y ?? 0)
        break
      case 'Q':
        path.quadraticCurveTo(
          command.x1 ?? 0,
          command.y1 ?? 0,
          command.x ?? 0,
          command.y ?? 0,
        )
        break
      case 'C':
        path.bezierCurveTo(
          command.x1 ?? 0,
          command.y1 ?? 0,
          command.x2 ?? 0,
          command.y2 ?? 0,
          command.x ?? 0,
          command.y ?? 0,
        )
        break
      case 'Z':
        if (path.currentPath) {
          path.currentPath.closePath()
        }
        break
      default:
        break
    }
  })

  return path
}

function getLineAdvance(font: opentype.Font, text: string, letterSpacingUnits: number) {
  const glyphs = font.stringToGlyphs(text)
  let width = 0

  glyphs.forEach((glyph, index) => {
    width += glyph.advanceWidth || font.unitsPerEm * 0.5

    if (index < glyphs.length - 1) {
      width += font.getKerningValue(glyph, glyphs[index + 1])
      width += letterSpacingUnits
    }
  })

  return width
}

export async function createTextShapeDocument(source: TextSource): Promise<ShapeDocument> {
  if (!source.text.trim()) {
    throw new Error('Digite um texto para gerar o letreiro')
  }

  const font = await resolveFont(source)
  const warnings: string[] = []
  const unitsPerEm = font.unitsPerEm || 1000
  const scale = source.fontSizeMm / unitsPerEm
  const letterSpacingUnits = source.letterSpacingMm / scale
  const lineHeightUnits = unitsPerEm * 1.2
  const lines = source.text.split(/\r?\n/)
  const groups: ShapeGroup[] = []
  let cursorY = 0

  lines.forEach((line, lineIndex) => {
    const glyphs = font.stringToGlyphs(line)
    const lineWidth = getLineAdvance(font, line, letterSpacingUnits)
    let cursorX = 0

    if (source.alignment === 'center') {
      cursorX = -lineWidth / 2
    } else if (source.alignment === 'right') {
      cursorX = -lineWidth
    }

    glyphs.forEach((glyph, glyphIndex) => {
      const glyphPath = glyph.getPath(cursorX, cursorY, unitsPerEm)
      const shapePath = commandsToShapePath(glyphPath.commands as OpenTypeCommand[])
      const shapes = shapePath.toShapes(false)

      if (shapes.length > 0) {
        groups.push({
          id: `glyph-${lineIndex}-${glyphIndex}`,
          label: glyph.name || line[glyphIndex] || `Glyph ${glyphIndex + 1}`,
          shapes,
          boundsMm: getShapeBounds(shapes),
        })
      }

      const nextGlyph = glyphs[glyphIndex + 1]
      cursorX += glyph.advanceWidth || unitsPerEm * 0.5
      if (nextGlyph) {
        cursorX += font.getKerningValue(glyph, nextGlyph)
        cursorX += letterSpacingUnits
      }
    })

    cursorY -= lineHeightUnits
  })

  if (groups.length === 0) {
    throw new Error('Nenhum glifo compatível foi gerado a partir do texto informado')
  }

  const scaled = groups.map((group) => ({
    ...group,
    shapes: transformShapes(group.shapes, (point) => point.multiplyScalar(scale)),
  }))

  if (source.fontKind === 'uploaded') {
    warnings.push('Fonte enviada localmente: a sessão salva volta para uma fonte interna ao recarregar.')
  }

  return normalizeDocument(scaled, 'text', {
    sourceLabel:
      source.fontKind === 'uploaded'
        ? source.uploadedFontName || 'Fonte enviada'
        : builtinFonts.find((fontItem) => fontItem.id === source.fontId)?.label || 'Fonte interna',
    inferredWidthMm: undefined,
    inferredHeightMm: undefined,
    warnings,
  })
}
