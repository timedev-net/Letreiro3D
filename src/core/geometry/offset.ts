import ClipperLib from 'clipper-lib'
import { Shape, ShapeUtils, Vector2 } from 'three'

const SCALE = 1000

function toClipperPath(points: Vector2[]) {
  return points.map((point) => ({
    X: Math.round(point.x * SCALE),
    Y: Math.round(point.y * SCALE),
  }))
}

function fromClipperPath(path: { X: number; Y: number }[]) {
  return path.map((point) => new Vector2(point.X / SCALE, point.Y / SCALE))
}

function area(points: Vector2[]) {
  return Math.abs(ShapeUtils.area(points))
}

export function offsetClosedPoints(points: Vector2[], deltaMm: number) {
  if (points.length < 3 || Math.abs(deltaMm) < 1e-6) {
    return points
  }

  const run = (delta: number) => {
    const offset = new ClipperLib.ClipperOffset(2, 0.25 * SCALE)
    const solution = new ClipperLib.Paths()
    offset.AddPath(
      toClipperPath(points),
      ClipperLib.JoinType.jtRound,
      ClipperLib.EndType.etClosedPolygon,
    )
    offset.Execute(solution, delta * SCALE)
    if (solution.length === 0) {
      return null
    }
    return fromClipperPath(solution[0] as { X: number; Y: number }[])
  }

  const direct = run(deltaMm)
  if (!direct) {
    return points
  }

  const originalArea = area(points)
  const directArea = area(direct)
  const shouldGrow = deltaMm > 0
  const grew = directArea > originalArea

  if (shouldGrow === grew) {
    return direct
  }

  const inverted = run(-deltaMm)
  return inverted ?? direct
}

export function createShapeFromContours(outer: Vector2[], holes: Vector2[][]) {
  const shape = new Shape(outer)
  shape.closePath()
  shape.holes = holes
    .filter((hole) => hole.length >= 3)
    .map((holePoints) => {
      const hole = new Shape(holePoints)
      hole.closePath()
      return hole
    })
  return shape
}
