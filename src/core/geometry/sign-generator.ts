import {
  Box3,
  BufferGeometry,
  ExtrudeGeometry,
  Matrix4,
  Shape,
  ShapeGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { GeneratedParts, ShapeDocument, ShapeGroup, SignSpec } from '../../types/sign'
import { getShapePoints } from '../shape/shape-utils'
import { createShapeFromContours, offsetClosedPoints } from './offset'

function getCurveSegments(quality: SignSpec['meshQuality']) {
  switch (quality) {
    case 'draft':
      return 10
    case 'high':
      return 28
    case 'normal':
    default:
      return 18
  }
}

function createExtrudeGeometry(shapes: Shape[], depth: number, curveSegments: number) {
  if (shapes.length === 0) {
    return null
  }

  const geometry = new ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: false,
    curveSegments,
  })
  geometry.computeVertexNormals()
  return geometry
}

function createBodyForGroup(group: ShapeGroup, spec: SignSpec): BufferGeometry | null {
  const curveSegments = getCurveSegments(spec.meshQuality)
  const basePlateShapes: Shape[] = []
  const wallShellShapes: Shape[] = []

  group.shapes.forEach((shape) => {
    const { shapePoints, holePoints } = getShapePoints(shape, curveSegments)
    const outerOffset = spec.wallThicknessMm + spec.clearanceMm
    const expandedOuter = offsetClosedPoints(shapePoints, outerOffset)
    const expandedHoles = holePoints
      .map((hole) => offsetClosedPoints(hole, -outerOffset))
      .filter((hole) => hole.length >= 3)

    const cavityOuter = offsetClosedPoints(shapePoints, spec.clearanceMm)
    const cavityHoles = holePoints
      .map((hole) => offsetClosedPoints(hole, -spec.clearanceMm))
      .filter((hole) => hole.length >= 3)

    basePlateShapes.push(createShapeFromContours(expandedOuter, expandedHoles))

    if (cavityOuter.length >= 3) {
      wallShellShapes.push(createShapeFromContours(expandedOuter, [cavityOuter]))
    } else {
      wallShellShapes.push(createShapeFromContours(expandedOuter, expandedHoles))
    }

    holePoints.forEach((_, index) => {
      const expandedHole = expandedHoles[index]
      const cavityHole = cavityHoles[index]

      if (expandedHole?.length >= 3 && cavityHole?.length >= 3) {
        wallShellShapes.push(createShapeFromContours(cavityHole, [expandedHole]))
      }
    })
  })

  const basePlate = createExtrudeGeometry(basePlateShapes, spec.baseDepthMm, curveSegments)
  const wallGeometry = createExtrudeGeometry(wallShellShapes, spec.wallHeightMm, curveSegments)

  if (!basePlate || !wallGeometry) {
    return null
  }

  wallGeometry.applyMatrix4(new Matrix4().makeTranslation(0, 0, spec.baseDepthMm))

  const merged = mergeGeometries([basePlate, wallGeometry], false)
  if (!merged) {
    return basePlate
  }

  merged.computeVertexNormals()
  return merged
}

function createAcrylicForGroup(group: ShapeGroup, spec: SignSpec): BufferGeometry | null {
  const curveSegments = getCurveSegments(spec.meshQuality)
  const geometry = createExtrudeGeometry(group.shapes, spec.acrylicThicknessMm, curveSegments)
  if (!geometry) {
    return null
  }

  geometry.applyMatrix4(
    new Matrix4().makeTranslation(
      0,
      0,
      spec.baseDepthMm + spec.wallHeightMm - spec.acrylicThicknessMm,
    ),
  )

  return geometry
}

function toMerged(geometries: BufferGeometry[]) {
  if (geometries.length === 0) {
    return null
  }
  if (geometries.length === 1) {
    return geometries[0]
  }
  const merged = mergeGeometries(geometries, false)
  if (!merged) {
    return geometries[0]
  }
  merged.computeVertexNormals()
  return merged
}

function applyMirror(geometry: BufferGeometry, mirrored: boolean) {
  if (!mirrored) {
    return geometry
  }

  const clone = geometry.clone()
  clone.applyMatrix4(new Matrix4().makeScale(-1, 1, 1))
  clone.computeVertexNormals()
  return clone
}

function buildDxfContours(document: ShapeDocument) {
  return document.groups.map((group) => ({
    label: group.label,
    loops: group.shapes.flatMap((shape) => {
      const { shapePoints, holePoints } = getShapePoints(shape, 24)
      return [
        shapePoints.map((point) => [point.x, point.y]),
        ...holePoints.map((hole) => hole.map((point) => [point.x, point.y])),
      ]
    }),
  }))
}

function getMetrics(
  bodyGeometry: BufferGeometry | null,
  acrylicGeometry: BufferGeometry | null,
) {
  const geometries = [bodyGeometry, acrylicGeometry].filter(Boolean) as BufferGeometry[]
  if (geometries.length === 0) {
    return { width: 0, height: 0, depth: 0 }
  }

  const box = new Box3()
  geometries.forEach((geometry) => {
    geometry.computeBoundingBox()
    if (geometry.boundingBox) {
      box.union(geometry.boundingBox)
    }
  })

  return {
    width: box.max.x - box.min.x,
    height: box.max.y - box.min.y,
    depth: box.max.z - box.min.z,
  }
}

export function generateSignParts(document: ShapeDocument, spec: SignSpec): GeneratedParts {
  const bodyParts = document.groups
    .map((group) => createBodyForGroup(group, spec))
    .filter((geometry): geometry is BufferGeometry => geometry !== null)
    .map((geometry) => applyMirror(geometry, spec.mirror))

  const acrylicParts = document.groups
    .map((group) => createAcrylicForGroup(group, spec))
    .filter((geometry): geometry is BufferGeometry => geometry !== null)
    .map((geometry) => applyMirror(geometry, spec.mirror))

  const bodyGeometry = toMerged(bodyParts)
  const acrylicGeometry = toMerged(acrylicParts)

  return {
    bodyGeometry,
    acrylicGeometry,
    letterGeometries: spec.splitByLetter ? bodyParts : [],
    dxfContours: buildDxfContours(document),
    metricsMm: getMetrics(bodyGeometry, acrylicGeometry),
  }
}

export function createPreviewFaceGeometry(document: ShapeDocument) {
  const geometry = new ShapeGeometry(
    document.groups.flatMap((group) => group.shapes),
  )
  geometry.computeVertexNormals()
  return geometry
}
