import * as opentype from 'opentype.js'

const fontCache = new Map<string, opentype.Font>()

export async function loadBuiltinFont(fontPath: string) {
  if (fontCache.has(fontPath)) {
    return fontCache.get(fontPath)!
  }

  const response = await fetch(fontPath)
  if (!response.ok) {
    throw new Error(`Falha ao carregar fonte: ${fontPath}`)
  }

  const buffer = await response.arrayBuffer()
  const font = opentype.parse(buffer)
  fontCache.set(fontPath, font)
  return font
}

export function loadUploadedFont(buffer: ArrayBuffer) {
  return opentype.parse(buffer)
}
