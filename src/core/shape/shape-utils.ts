import { Box2, Shape, ShapePath, ShapeUtils, Vector2 } from 'three'
import type { ShapeDocument, ShapeDocumentMetadata, ShapeGroup } from '../../types/sign'

const EPSILON = 1e-4
const MIN_LOOP_AREA = 0.01

export function pathToShapes(path: ShapePath) {
  let dominantLoopClockwise = false
  let dominantLoopArea = 0

  path.subPaths.forEach((subPath) => {
    const points = dedupeLoop(subPath.getPoints())
    if (points.length < 3) {
      return
    }

    const nextArea = Math.abs(ShapeUtils.area(points))
    if (nextArea <= dominantLoopArea) {
      return
    }

    dominantLoopArea = nextArea
    dominantLoopClockwise = ShapeUtils.isClockWise(points)
  })

  return path.toShapes(!dominantLoopClockwise)
}

export function getShapePoints(shape: Shape, curveSegments: number) {
  const shapePoints = shape.getPoints(curveSegments)
  const holePoints = shape.holes.map((hole) => hole.getPoints(curveSegments))
  return { shapePoints, holePoints }
}

function ensureClockwise(points: Vector2[]) {
  return ShapeUtils.isClockWise(points) ? points : [...points].reverse()
}

function ensureCounterClockwise(points: Vector2[]) {
  return ShapeUtils.isClockWise(points) ? [...points].reverse() : points
}

function dedupeLoop(points: Vector2[]) {
  const result: Vector2[] = []

  points.forEach((point) => {
    const previous = result[result.length - 1]
    if (!previous || previous.distanceTo(point) > EPSILON) {
      result.push(point.clone())
    }
  })

  if (result.length > 1 && result[0].distanceTo(result[result.length - 1]) <= EPSILON) {
    result.pop()
  }

  return result
}

function sanitizeLoop(points: Vector2[]) {
  const cleaned = dedupeLoop(points)
  if (cleaned.length < 3) {
    return null
  }

  const area = Math.abs(cleaned.reduce((sum, point, index) => {
    const next = cleaned[(index + 1) % cleaned.length]
    return sum + point.x * next.y - next.x * point.y
  }, 0) / 2)

  if (area < MIN_LOOP_AREA) {
    return null
  }

  return cleaned
}

export function getShapeBounds(shapes: Shape[], curveSegments = 18) {
  const box = new Box2()

  shapes.forEach((shape) => {
    const { shapePoints, holePoints } = getShapePoints(shape, curveSegments)
    shapePoints.forEach((point) => box.expandByPoint(point))
    holePoints.flat().forEach((point) => box.expandByPoint(point))
  })

  if (box.isEmpty()) {
    return { width: 0, height: 0, minX: 0, minY: 0 }
  }

  return {
    width: box.max.x - box.min.x,
    height: box.max.y - box.min.y,
    minX: box.min.x,
    minY: box.min.y,
  }
}

export function cloneShape(shape: Shape) {
  const next = new Shape(ensureClockwise(shape.getPoints()))
  next.holes = shape.holes.map((hole) => {
    const path = new Shape()
    const points = ensureCounterClockwise(hole.getPoints())
    if (points.length > 0) {
      path.moveTo(points[0].x, points[0].y)
      for (let index = 1; index < points.length; index += 1) {
        path.lineTo(points[index].x, points[index].y)
      }
      path.closePath()
    }
    return path
  })
  return next
}

export function transformShapes(
  shapes: Shape[],
  transform: (point: Vector2) => Vector2,
) {
  return shapes.flatMap((shape) => {
    const basePoints = sanitizeLoop(
      shape.getPoints().map((point) => transform(point.clone())),
    )

    if (!basePoints) {
      return []
    }

    const next = new Shape(ensureClockwise(basePoints))
    next.holes = shape.holes.flatMap((hole) => {
      const holePoints = sanitizeLoop(
        hole.getPoints().map((point) => transform(point.clone())),
      )
      if (!holePoints) {
        return []
      }
      const holeShape = new Shape(ensureCounterClockwise(holePoints))
      holeShape.closePath()
      return [holeShape]
    })
    next.closePath()
    return [next]
  })
}

export function countContours(groups: ShapeGroup[]) {
  return groups.reduce((sum, group) => {
    return sum + group.shapes.reduce((shapeCount, shape) => {
      return shapeCount + 1 + shape.holes.length
    }, 0)
  }, 0)
}

export function normalizeDocument(
  groups: ShapeGroup[],
  sourceType: 'text' | 'svg',
  metadata: Omit<ShapeDocumentMetadata, 'groupCount' | 'contourCount'>,
): ShapeDocument {
  const filteredGroups = groups
    .map((group) => ({
      ...group,
      shapes: transformShapes(group.shapes, (point) => point),
    }))
    .filter((group) => group.shapes.length > 0)

  const allShapes = filteredGroups.flatMap((group) => group.shapes)
  const bounds = getShapeBounds(allShapes)
  const offsetX = bounds.minX
  const offsetY = bounds.minY

  const normalizedGroups = filteredGroups.map((group) => {
    const shapes = transformShapes(group.shapes, (point) => new Vector2(point.x - offsetX, point.y - offsetY))
    return {
      ...group,
      shapes,
      boundsMm: getShapeBounds(shapes),
    }
  })

  return {
    groups: normalizedGroups,
    boundsMm: getShapeBounds(normalizedGroups.flatMap((group) => group.shapes)),
    sourceType,
    metadata: {
      ...metadata,
      groupCount: normalizedGroups.length,
      contourCount: countContours(normalizedGroups),
    },
  }
}
