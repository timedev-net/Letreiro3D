import { expect, test } from '@playwright/test'

const bodyRegressionSpec = {
  styleId: 'face-acrilico-fundo-impresso',
  outerWall: {
    baseDepthMm: 3,
    heightMm: 5,
    thicknessMm: 2,
  },
  innerWall: {
    heightMm: 0,
    thicknessMm: 0,
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
} as const

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
  })
})

test('texto preserva fundo no traco e vazado nas contraformas', async ({ page }) => {
  await page.goto('/')

  const result = await page.evaluate(async (spec) => {
    const token = Date.now()
    const root = window.location.origin
    const { createTextShapeDocument } = await import(`${root}/src/core/shape/text-parser.ts?t=${token}`)
    const { generateSignParts } = await import(`${root}/src/core/geometry/sign-generator.ts?t=${token}`)

    const document = await createTextShapeDocument({
      text: 'EABRD8',
      fontKind: 'builtin',
      fontId: 'fira-sans-condensed-bold',
      fontSizeMm: 120,
      letterSpacingMm: 6,
      alignment: 'center',
    })
    const generated = generateSignParts(document, spec)

    function pointInPolygon(
      point: { x: number; y: number },
      polygon: Array<{ x: number; y: number }>,
    ) {
      let inside = false

      for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
        const currentPoint = polygon[index]
        const previousPoint = polygon[previous]
        const intersects =
          (currentPoint.y > point.y) !== (previousPoint.y > point.y)
          && point.x
            < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y))
              / ((previousPoint.y - currentPoint.y) || 1e-9)
              + currentPoint.x

        if (intersects) {
          inside = !inside
        }
      }

      return inside
    }

    function pointInTriangle(
      px: number,
      py: number,
      ax: number,
      ay: number,
      bx: number,
      by: number,
      cx: number,
      cy: number,
    ) {
      const v0x = cx - ax
      const v0y = cy - ay
      const v1x = bx - ax
      const v1y = by - ay
      const v2x = px - ax
      const v2y = py - ay
      const dot00 = v0x * v0x + v0y * v0y
      const dot01 = v0x * v1x + v0y * v1y
      const dot02 = v0x * v2x + v0y * v2y
      const dot11 = v1x * v1x + v1y * v1y
      const dot12 = v1x * v2x + v1y * v2y
      const inverse = 1 / (dot00 * dot11 - dot01 * dot01)
      const u = (dot11 * dot02 - dot01 * dot12) * inverse
      const v = (dot00 * dot12 - dot01 * dot02) * inverse

      return u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6
    }

    function getTopTriangles(bodyPart: { geometry: { getAttribute: (name: string) => { array: ArrayLike<number> } } }) {
      const positions = bodyPart.geometry.getAttribute('position').array
      const triangles: number[][] = []

      for (let index = 0; index < positions.length; index += 9) {
        const z1 = positions[index + 2]
        const z2 = positions[index + 5]
        const z3 = positions[index + 8]
        if (
          Math.abs(z1 - spec.outerWall.baseDepthMm) < 1e-4
          && Math.abs(z2 - spec.outerWall.baseDepthMm) < 1e-4
          && Math.abs(z3 - spec.outerWall.baseDepthMm) < 1e-4
        ) {
          triangles.push([
            positions[index],
            positions[index + 1],
            positions[index + 3],
            positions[index + 4],
            positions[index + 6],
            positions[index + 7],
          ])
        }
      }

      return triangles
    }

    function analyzeGroup(group: (typeof document.groups)[number]) {
      const bodyPart = generated.parts.find((part) => part.role === 'body' && part.letterId === group.id)
      if (!bodyPart) {
        throw new Error(`Corpo nao encontrado para ${group.label}`)
      }

      const shapes = group.shapes.map((shape) => ({
        outer: shape.getPoints(18).map((point) => ({ x: point.x, y: point.y })),
        holes: shape.holes.map((hole) => hole.getPoints(18).map((point) => ({ x: point.x, y: point.y }))),
      }))
      const triangles = getTopTriangles(bodyPart)

      let strokeCovered = 0
      let strokeCount = 0
      let holeCovered = 0
      let holeCount = 0

      for (let x = group.boundsMm.minX; x <= group.boundsMm.minX + group.boundsMm.width; x += 2.5) {
        for (let y = group.boundsMm.minY; y <= group.boundsMm.minY + group.boundsMm.height; y += 2.5) {
          const point = { x, y }
          const inHole = shapes.some((shape) => shape.holes.some((hole) => pointInPolygon(point, hole)))
          const inSolid = shapes.some(
            (shape) => pointInPolygon(point, shape.outer) && !shape.holes.some((hole) => pointInPolygon(point, hole)),
          )
          const covered = triangles.some(([ax, ay, bx, by, cx, cy]) =>
            pointInTriangle(x, y, ax, ay, bx, by, cx, cy),
          )

          if (inSolid) {
            strokeCount += 1
            if (covered) {
              strokeCovered += 1
            }
          }

          if (inHole) {
            holeCount += 1
            if (covered) {
              holeCovered += 1
            }
          }
        }
      }

      return {
        label: group.label,
        strokeCovered,
        strokeCount,
        holeCovered,
        holeCount,
        strokeRatio: strokeCount === 0 ? 0 : strokeCovered / strokeCount,
      }
    }

    return document.groups.map(analyzeGroup)
  }, bodyRegressionSpec)

  const byLabel = Object.fromEntries(result.map((entry) => [entry.label, entry]))

  expect(byLabel.E.strokeRatio).toBeGreaterThan(0.97)
  expect(byLabel.E.holeCount).toBe(0)

  for (const label of ['A', 'B', 'R', 'D', 'eight'] as const) {
    expect(byLabel[label].strokeRatio).toBeGreaterThan(0.97)
    expect(byLabel[label].holeCount).toBeGreaterThan(0)
    expect(byLabel[label].holeCovered).toBe(0)
  }
})

test('svg com contraforma mantém loops corretos e gera peças sem quebrar', async ({ page }) => {
  await page.goto('/')

  const svgText = `
    <svg width="100mm" height="100mm" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path fill="#111827" fill-rule="evenodd" d="M0 0H100V100H0Z M25 25H75V75H25Z" />
    </svg>
  `

  const result = await page.evaluate(async ({ spec, svgText: sourceSvgText }) => {
    const token = Date.now()
    const root = window.location.origin
    const { createSvgShapeDocument } = await import(`${root}/src/core/shape/svg-parser.ts?t=${token}`)
    const { generateSignParts } = await import(`${root}/src/core/geometry/sign-generator.ts?t=${token}`)
    const { ShapeUtils } = await import('/node_modules/.vite/deps/three.js')

    const document = createSvgShapeDocument({
      fileName: 'contraforma.svg',
      svgText: sourceSvgText,
      physicalWidthMm: 100,
      physicalHeightMm: 100,
      unitConfidence: 'high',
    })
    const generated = generateSignParts(document, spec)
    const group = document.groups[0]
    const shape = group.shapes[0]

    return {
      bodyExists: generated.parts.some((part) => part.role === 'body' && part.letterId === group.id),
      faceExists: generated.parts.some((part) => part.role === 'face' && part.letterId === group.id),
      partCount: generated.parts.length,
      bounds: document.boundsMm,
      holeCount: shape.holes.length,
      outerClockwise: ShapeUtils.isClockWise(shape.getPoints(18)),
      holeClockwise: shape.holes.map((hole) => ShapeUtils.isClockWise(hole.getPoints(18))),
    }
  }, { spec: bodyRegressionSpec, svgText })

  expect(result.bodyExists).toBe(true)
  expect(result.faceExists).toBe(true)
  expect(result.partCount).toBeGreaterThan(0)
  expect(result.bounds.width).toBeCloseTo(100, 4)
  expect(result.bounds.height).toBeCloseTo(100, 4)
  expect(result.holeCount).toBe(1)
  expect(result.outerClockwise).toBe(true)
  expect(result.holeClockwise).toEqual([false])
})

test('ui mantém preview estável ao espelhar e sem erros de execução', async ({ page }) => {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  await page.goto('/')
  await page.getByRole('textbox', { name: 'Ex.: LETRA 3D' }).fill('ABRD8')
  await expect(page.getByText('Preview pronto')).toBeVisible()

  await page.getByRole('button', { name: 'Face', exact: true }).click()

  const before = await page.evaluate(async () => {
    const { useSignStore } = await import('/src/store/sign-store.ts')
    const state = useSignStore.getState()
    return {
      metrics: state.generatedParts?.metricsMm ?? null,
      visibility: state.visibility,
      partCount: state.generatedParts?.parts.length ?? 0,
      error: state.error,
    }
  })

  await page.getByRole('button', { name: 'Espelhar modelo' }).click()

  await expect
    .poll(async () => {
      return page.evaluate(async () => {
        const { useSignStore } = await import('/src/store/sign-store.ts')
        return useSignStore.getState().generatedParts?.metricsMm ?? null
      })
    })
    .toEqual(before.metrics)

  const after = await page.evaluate(async () => {
    const { useSignStore } = await import('/src/store/sign-store.ts')
    const state = useSignStore.getState()
    return {
      metrics: state.generatedParts?.metricsMm ?? null,
      visibility: state.visibility,
      partCount: state.generatedParts?.parts.length ?? 0,
      error: state.error,
    }
  })

  expect(before.partCount).toBeGreaterThan(0)
  expect(before.visibility.face).toBe(false)
  expect(after.metrics).toEqual(before.metrics)
  expect(after.partCount).toBe(before.partCount)
  expect(after.error).toBeNull()
  expect(consoleErrors).toEqual([])
  expect(pageErrors).toEqual([])
})
