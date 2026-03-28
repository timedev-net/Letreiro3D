import { expect, test, type Page } from '@playwright/test'

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

const innerHoleWallSpec = {
  ...bodyRegressionSpec,
  innerWall: {
    heightMm: 3,
    thicknessMm: 1.2,
  },
} as const

const innerHoleWallDoubleSpec = {
  ...innerHoleWallSpec,
  styleId: 'face-acrilico-parede-interna-dupla',
} as const

const faceInsetMm = bodyRegressionSpec.outerWall.thicknessMm + bodyRegressionSpec.fitment.clearanceMm

async function analyzeInnerHoleWalls(
  page: Page,
  spec: typeof innerHoleWallSpec,
  expectedWallCount: number,
) {
  await page.goto('/')

  return page.evaluate(async ({ spec, expectedWallCount }) => {
    const token = Date.now()
    const root = window.location.origin
    const { createTextShapeDocument } = await import(`${root}/src/core/shape/text-parser.ts?t=${token}`)
    const { generateSignParts } = await import(`${root}/src/core/geometry/sign-generator.ts?t=${token}`)
    const { offsetClosedPoints } = await import(`${root}/src/core/geometry/offset.ts?t=${token}`)

    const document = await createTextShapeDocument({
      text: 'ABRD8',
      fontKind: 'builtin',
      fontId: 'fira-sans-condensed-bold',
      fontSizeMm: 120,
      letterSpacingMm: 6,
      alignment: 'center',
    })
    const generated = generateSignParts(document, spec)
    const stepMm = 0.75
    const innerWallGapMm = Math.max(spec.innerWall.thicknessMm, spec.fitment.clearanceMm + 0.8)
    const wallBaseZ =
      spec.styleId === 'face-acrilico-fundo-vazado' || spec.styleId === 'face-acrilico-back-fit'
        ? 0
        : spec.outerWall.baseDepthMm
    const targetZ = wallBaseZ + spec.innerWall.heightMm

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

    function getHorizontalTrianglesAtZ(
      bodyPart: { geometry: { getAttribute: (name: string) => { array: ArrayLike<number> } } },
      zTarget: number,
    ) {
      const positions = bodyPart.geometry.getAttribute('position').array
      const triangles: number[][] = []

      for (let index = 0; index < positions.length; index += 9) {
        const z1 = positions[index + 2]
        const z2 = positions[index + 5]
        const z3 = positions[index + 8]
        if (
          Math.abs(z1 - zTarget) < 1e-4
          && Math.abs(z2 - zTarget) < 1e-4
          && Math.abs(z3 - zTarget) < 1e-4
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

    function getBounds(points: Array<{ x: number; y: number }>) {
      return points.reduce(
        (bounds, point) => ({
          minX: Math.min(bounds.minX, point.x),
          maxX: Math.max(bounds.maxX, point.x),
          minY: Math.min(bounds.minY, point.y),
          maxY: Math.max(bounds.maxY, point.y),
        }),
        {
          minX: Number.POSITIVE_INFINITY,
          maxX: Number.NEGATIVE_INFINITY,
          minY: Number.POSITIVE_INFINITY,
          maxY: Number.NEGATIVE_INFINITY,
        },
      )
    }

    function isCovered(point: { x: number; y: number }, triangles: number[][]) {
      return triangles.some(([ax, ay, bx, by, cx, cy]) =>
        pointInTriangle(point.x, point.y, ax, ay, bx, by, cx, cy),
      )
    }

    function analyzePolygon(polygon: Array<{ x: number; y: number }>, triangles: number[][]) {
      const bounds = getBounds(polygon)
      let sampleCount = 0
      let coveredCount = 0

      for (let x = bounds.minX; x <= bounds.maxX; x += stepMm) {
        for (let y = bounds.minY; y <= bounds.maxY; y += stepMm) {
          const point = { x, y }
          if (!pointInPolygon(point, polygon)) {
            continue
          }

          sampleCount += 1
          if (isCovered(point, triangles)) {
            coveredCount += 1
          }
        }
      }

      return { sampleCount, coveredCount }
    }

    function analyzeBand(
      holeLoop: Array<{ x: number; y: number }>,
      startInset: number,
      endInset: number,
      triangles: number[][],
    ) {
      const innerLoop = startInset <= 1e-6 ? holeLoop : offsetClosedPoints(holeLoop, startInset, 'miter')
      const outerLoop = offsetClosedPoints(holeLoop, endInset, 'miter')

      if (innerLoop.length < 3 || outerLoop.length < 3) {
        return { sampleCount: 0, coveredCount: 0, coverageRatio: 0 }
      }

      const bounds = getBounds(outerLoop)
      let sampleCount = 0
      let coveredCount = 0

      for (let x = bounds.minX; x <= bounds.maxX; x += stepMm) {
        for (let y = bounds.minY; y <= bounds.maxY; y += stepMm) {
          const point = { x, y }
          if (!pointInPolygon(point, outerLoop) || pointInPolygon(point, innerLoop)) {
            continue
          }

          sampleCount += 1
          if (isCovered(point, triangles)) {
            coveredCount += 1
          }
        }
      }

      return {
        sampleCount,
        coveredCount,
        coverageRatio: sampleCount === 0 ? 0 : coveredCount / sampleCount,
      }
    }

    function analyzeGroup(group: (typeof document.groups)[number]) {
      const bodyPart = generated.parts.find((part) => part.role === 'body' && part.letterId === group.id)
      if (!bodyPart) {
        throw new Error(`Corpo nao encontrado para ${group.label}`)
      }

      const triangles = getHorizontalTrianglesAtZ(bodyPart, targetZ)
      const holeLoops = group.shapes.flatMap((shape) => shape.holes.map((hole) => hole.getPoints(18)))

      const bandStats = Array.from({ length: expectedWallCount }, () => ({
        sampleCount: 0,
        coveredCount: 0,
      }))

      let holeSampleCount = 0
      let holeCoveredCount = 0

      holeLoops.forEach((holeLoop) => {
        const holeCoverage = analyzePolygon(holeLoop, triangles)
        holeSampleCount += holeCoverage.sampleCount
        holeCoveredCount += holeCoverage.coveredCount

        for (let wallIndex = 0; wallIndex < expectedWallCount; wallIndex += 1) {
          const gapBefore = wallIndex === 0 ? 0 : innerWallGapMm
          const startInset =
            spec.outerWall.thicknessMm
            + wallIndex * spec.innerWall.thicknessMm
            + wallIndex * gapBefore
          const endInset = startInset + spec.innerWall.thicknessMm
          const bandCoverage = analyzeBand(holeLoop, startInset, endInset, triangles)

          bandStats[wallIndex].sampleCount += bandCoverage.sampleCount
          bandStats[wallIndex].coveredCount += bandCoverage.coveredCount
        }
      })

      return {
        label: group.label,
        holeCount: holeLoops.length,
        holeSampleCount,
        holeCoveredCount,
        bands: bandStats.map((band) => ({
          sampleCount: band.sampleCount,
          coveredCount: band.coveredCount,
          coverageRatio: band.sampleCount === 0 ? 0 : band.coveredCount / band.sampleCount,
        })),
      }
    }

    return document.groups
      .filter((group) => group.shapes.some((shape) => shape.holes.length > 0))
      .map(analyzeGroup)
  }, { spec, expectedWallCount })
}

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

test('texto com contraformas gera parede interna no lado do vazado em estilo simples', async ({ page }) => {
  const result = await analyzeInnerHoleWalls(page, innerHoleWallSpec, 1)

  for (const label of ['A', 'B', 'R', 'D', 'eight'] as const) {
    const entry = result.find((item) => item.label === label)
    expect(entry).toBeTruthy()
    expect(entry?.holeCount).toBeGreaterThan(0)
    expect(entry?.holeSampleCount).toBeGreaterThan(0)
    expect(entry?.holeCoveredCount).toBe(0)
    expect(entry?.bands[0].sampleCount).toBeGreaterThan(0)
    expect(entry?.bands[0].coverageRatio).toBeGreaterThan(0.7)
  }
})

test('texto com contraformas gera duas paredes internas no lado do vazado em estilo duplo', async ({ page }) => {
  const result = await analyzeInnerHoleWalls(page, innerHoleWallDoubleSpec, 2)

  for (const label of ['A', 'B', 'R', 'D', 'eight'] as const) {
    const entry = result.find((item) => item.label === label)
    expect(entry).toBeTruthy()
    expect(entry?.holeCount).toBeGreaterThan(0)
    expect(entry?.holeSampleCount).toBeGreaterThan(0)
    expect(entry?.holeCoveredCount).toBe(0)
    expect(entry?.bands[0].sampleCount).toBeGreaterThan(0)
    expect(entry?.bands[0].coverageRatio).toBeGreaterThan(0.7)
    expect(entry?.bands[1].sampleCount).toBeGreaterThan(0)
    expect(entry?.bands[1].coverageRatio).toBeGreaterThan(0.7)
  }
})

test('face usa inset de encaixe no STL e no DXF para svg com contraforma', async ({ page }) => {
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

    const document = createSvgShapeDocument({
      fileName: 'face-inset.svg',
      svgText: sourceSvgText,
      physicalWidthMm: 100,
      physicalHeightMm: 100,
      unitConfidence: 'high',
    })
    const generated = generateSignParts(document, spec)
    const group = document.groups[0]
    const facePart = generated.parts.find((part) => part.role === 'face' && part.letterId === group.id)
    const faceContour = generated.dxfContours.find((contour) => contour.role === 'face' && contour.label.startsWith(group.label))

    function getLoopBounds(loop: number[][]) {
      return loop.reduce(
        (bounds, [x, y]) => ({
          minX: Math.min(bounds.minX, x),
          maxX: Math.max(bounds.maxX, x),
          minY: Math.min(bounds.minY, y),
          maxY: Math.max(bounds.maxY, y),
        }),
        {
          minX: Number.POSITIVE_INFINITY,
          maxX: Number.NEGATIVE_INFINITY,
          minY: Number.POSITIVE_INFINITY,
          maxY: Number.NEGATIVE_INFINITY,
        },
      )
    }

    if (!facePart || !faceContour) {
      return {
        faceExists: false,
        faceLoopCount: 0,
      }
    }

    facePart.geometry.computeBoundingBox()
    const boundingBox = facePart.geometry.boundingBox

    return {
      faceExists: true,
      faceLoopCount: faceContour.loops.length,
      outerBounds: getLoopBounds(faceContour.loops[0]),
      holeBounds: getLoopBounds(faceContour.loops[1]),
      geometryBounds: boundingBox
        ? {
            minX: boundingBox.min.x,
            maxX: boundingBox.max.x,
            minY: boundingBox.min.y,
            maxY: boundingBox.max.y,
          }
        : null,
    }
  }, { spec: bodyRegressionSpec, svgText })

  expect(result.faceExists).toBe(true)
  expect(result.faceLoopCount).toBe(2)
  expect(result.outerBounds.minX).toBeCloseTo(faceInsetMm, 3)
  expect(result.outerBounds.maxX).toBeCloseTo(100 - faceInsetMm, 3)
  expect(result.outerBounds.minY).toBeCloseTo(faceInsetMm, 3)
  expect(result.outerBounds.maxY).toBeCloseTo(100 - faceInsetMm, 3)
  expect(result.holeBounds.minX).toBeCloseTo(25 - faceInsetMm, 3)
  expect(result.holeBounds.maxX).toBeCloseTo(75 + faceInsetMm, 3)
  expect(result.holeBounds.minY).toBeCloseTo(25 - faceInsetMm, 3)
  expect(result.holeBounds.maxY).toBeCloseTo(75 + faceInsetMm, 3)
  expect(result.geometryBounds?.minX).toBeCloseTo(result.outerBounds.minX, 3)
  expect(result.geometryBounds?.maxX).toBeCloseTo(result.outerBounds.maxX, 3)
  expect(result.geometryBounds?.minY).toBeCloseTo(result.outerBounds.minY, 3)
  expect(result.geometryBounds?.maxY).toBeCloseTo(result.outerBounds.maxY, 3)
})

test('texto com contraformas continua gerando faces após aplicar inset de encaixe', async ({ page }) => {
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

    return document.groups
      .filter((group) => group.shapes.some((shape) => shape.holes.length > 0))
      .map((group) => ({
        label: group.label,
        faceExists: generated.parts.some((part) => part.role === 'face' && part.letterId === group.id),
      }))
  }, bodyRegressionSpec)

  for (const label of ['A', 'B', 'R', 'D', 'eight'] as const) {
    const entry = result.find((item) => item.label === label)
    expect(entry).toBeTruthy()
    expect(entry?.faceExists).toBe(true)
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
