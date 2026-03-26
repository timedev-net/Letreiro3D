import { saveAs } from 'file-saver'
import type { DxfContour } from '../../types/sign'

function formatPoint(point: number[]) {
  const [x, y] = point
  return `10\n${x.toFixed(4)}\n20\n${y.toFixed(4)}`
}

function loopToDxf(loop: number[][]) {
  const lines = [
    '0',
    'LWPOLYLINE',
    '8',
    'SIGN',
    '90',
    String(loop.length),
    '70',
    '1',
  ]

  loop.forEach((point) => {
    lines.push(...formatPoint(point).split('\n'))
  })

  return lines.join('\n')
}

export function createDxfText(contours: DxfContour[]) {
  const entities = contours
    .flatMap((contour) => contour.loops.map((loop) => loopToDxf(loop)))
    .join('\n')

  return [
    '0',
    'SECTION',
    '2',
    'HEADER',
    '0',
    'ENDSEC',
    '0',
    'SECTION',
    '2',
    'ENTITIES',
    entities,
    '0',
    'ENDSEC',
    '0',
    'EOF',
  ].join('\n')
}

export function downloadDxf(contours: DxfContour[], name: string) {
  const blob = new Blob([createDxfText(contours)], {
    type: 'application/dxf',
  })
  saveAs(blob, name)
}
