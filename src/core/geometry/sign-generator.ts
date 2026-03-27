import { CSG } from 'three-csg-ts'
import {
  Box3,
  BoxGeometry,
  BufferGeometry,
  ExtrudeGeometry,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  Vector2,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type {
  DxfContour,
  GeneratedPart,
  GeneratedParts,
  LetterStyleId,
  NotchDistribution,
  PartRole,
  ShapeDocument,
  ShapeGroup,
  SignSpec,
} from '../../types/sign'
import { getShapePoints } from '../shape/shape-utils'
import { createShapeFromContours, offsetClosedPoints } from './offset'

interface StyleProfile {
  hasBase: boolean
  innerWallCount: number
  innerWallGapMm: number
  frontMounted: boolean
}

interface NotchPlacement {
  point: Vector2
  tangentAngle: number
  normal: Vector2
}

type LoopKind = 'outer' | 'hole'

const csgMaterial = new MeshStandardMaterial()
const WALL_JOIN = 'miter' as const

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

function getStyleProfile(styleId: LetterStyleId, spec: SignSpec): StyleProfile {
  const innerWallGapMm = Math.max(spec.innerWall.thicknessMm, spec.fitment.clearanceMm + 0.8)

  switch (styleId) {
    case 'face-acrilico-fundo-vazado':
      return {
        hasBase: false,
        innerWallCount: 1,
        innerWallGapMm,
        frontMounted: true,
      }
    case 'face-acrilico-parede-interna-dupla':
      return {
        hasBase: true,
        innerWallCount: 2,
        innerWallGapMm,
        frontMounted: true,
      }
    case 'face-acrilico-back-fit':
      return {
        hasBase: false,
        innerWallCount: 1,
        innerWallGapMm,
        frontMounted: false,
      }
    case 'face-acrilico-fundo-impresso':
    default:
      return {
        hasBase: true,
        innerWallCount: 1,
        innerWallGapMm,
        frontMounted: true,
      }
  }
}

function createExtrudeGeometry(shapes: Shape[], depth: number, curveSegments: number) {
  if (shapes.length === 0 || depth <= 0) {
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

function cloneGeometry(geometry: BufferGeometry) {
  const clone = geometry.clone()
  clone.computeVertexNormals()
  return clone
}

function toMerged(geometries: BufferGeometry[]) {
  if (geometries.length === 0) {
    return null
  }
  if (geometries.length === 1) {
    return cloneGeometry(geometries[0])
  }

  const merged = mergeGeometries(geometries.map((geometry) => geometry.clone()), false)
  if (!merged) {
    return cloneGeometry(geometries[0])
  }

  merged.computeVertexNormals()
  return merged
}

function meshFromGeometry(geometry: BufferGeometry) {
  return new Mesh(geometry, csgMaterial)
}

function subtractGeometry(base: BufferGeometry, subtractor: BufferGeometry | null) {
  if (!subtractor) {
    return base
  }

  try {
    const result = CSG.subtract(meshFromGeometry(base), meshFromGeometry(subtractor)).geometry
    result.computeVertexNormals()
    return result
  } catch {
    return base
  }
}

function unionGeometry(base: BufferGeometry, additive: BufferGeometry | null) {
  if (!additive) {
    return base
  }

  try {
    const result = CSG.union(meshFromGeometry(base), meshFromGeometry(additive)).geometry
    result.computeVertexNormals()
    return result
  } catch {
    const merged = toMerged([base, additive])
    return merged ?? base
  }
}

function applyMirror(geometry: BufferGeometry, mirrored: boolean) {
  if (!mirrored) {
    return geometry
  }

  const clone = geometry.clone()
  clone.applyMatrix4(new Matrix4().makeScale(-1, 1, 1))

  if (clone.index) {
    const index = clone.index.array
    for (let triangle = 0; triangle < index.length; triangle += 3) {
      const first = index[triangle]
      index[triangle] = index[triangle + 2]
      index[triangle + 2] = first
    }
    clone.index.needsUpdate = true
  } else {
    const attributeNames = Object.keys(clone.attributes)
    attributeNames.forEach((attributeName) => {
      const attribute = clone.getAttribute(attributeName)
      const itemSize = attribute.itemSize
      const array = attribute.array

      for (let triangle = 0; triangle < attribute.count; triangle += 3) {
        for (let component = 0; component < itemSize; component += 1) {
          const aIndex = triangle * itemSize + component
          const cIndex = (triangle + 2) * itemSize + component
          const temp = array[aIndex]
          array[aIndex] = array[cIndex]
          array[cIndex] = temp
        }
      }
      attribute.needsUpdate = true
    })
  }

  clone.computeVertexNormals()
  clone.computeBoundingBox()
  clone.computeBoundingSphere()
  return clone
}

function applyMirrorToLoops(loops: number[][][] | undefined, mirrored: boolean) {
  if (!loops) {
    return undefined
  }

  if (!mirrored) {
    return loops
  }

  return loops.map((loop) => loop.map(([x, y]) => [-x, y]))
}

function loopPerimeter(points: Vector2[]) {
  return points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]
    return sum + point.distanceTo(next)
  }, 0)
}

function loopCentroid(points: Vector2[]) {
  const sum = points.reduce(
    (acc, point) => {
      acc.x += point.x
      acc.y += point.y
      return acc
    },
    { x: 0, y: 0 },
  )

  return new Vector2(sum.x / points.length, sum.y / points.length)
}

function sampleLoopAtDistance(points: Vector2[], distance: number) {
  let traversed = 0

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    const segmentLength = current.distanceTo(next)

    if (traversed + segmentLength >= distance) {
      const local = segmentLength === 0 ? 0 : (distance - traversed) / segmentLength
      const point = current.clone().lerp(next, local)
      const tangent = next.clone().sub(current)
      if (tangent.lengthSq() === 0) {
        return { point, tangent: new Vector2(1, 0) }
      }
      tangent.normalize()
      return { point, tangent }
    }

    traversed += segmentLength
  }

  const current = points[0]
  const next = points[1] ?? points[0]
  const tangent = next.clone().sub(current)
  if (tangent.lengthSq() === 0) {
    tangent.set(1, 0)
  } else {
    tangent.normalize()
  }

  return {
    point: current.clone(),
    tangent,
  }
}

function getNotchCount(
  distribution: NotchDistribution,
  requestedCount: number,
  usablePerimeter: number,
  widthMm: number,
  minSpacingMm: number,
) {
  if (usablePerimeter <= 0) {
    return 0
  }

  if (distribution === 'manual-count') {
    return requestedCount
  }

  return Math.floor(usablePerimeter / (widthMm + minSpacingMm))
}

function resolveNotchPlacements(
  loops: Vector2[][],
  spec: SignSpec,
  warnings: string[],
  groupLabel: string,
) {
  if (!spec.fitment.notch.enabled) {
    return [] as NotchPlacement[]
  }

  return loops.flatMap((points) => {
    const perimeter = loopPerimeter(points)
    const usablePerimeter = perimeter - spec.fitment.notch.edgeOffsetMm * 2
    const count = getNotchCount(
      spec.fitment.notch.distribution,
      spec.fitment.notch.count,
      usablePerimeter,
      spec.fitment.notch.widthMm,
      spec.fitment.notch.minSpacingMm,
    )

    if (
      count < 2
      || usablePerimeter / Math.max(count, 1) < spec.fitment.notch.widthMm + spec.fitment.notch.minSpacingMm
    ) {
      warnings.push(
        `Entalhes omitidos em ${groupLabel}: um dos contornos internos é pequeno demais para a distribuição selecionada.`,
      )
      return []
    }

    const centroid = loopCentroid(points)

    return Array.from({ length: count }, (_, index) => {
      const distance = spec.fitment.notch.edgeOffsetMm + ((index + 0.5) * usablePerimeter) / count
      const sample = sampleLoopAtDistance(points, distance)
      const leftNormal = new Vector2(-sample.tangent.y, sample.tangent.x)
      const rightNormal = new Vector2(sample.tangent.y, -sample.tangent.x)
      const inward = centroid.clone().sub(sample.point)

      const normal = leftNormal.dot(inward) > rightNormal.dot(inward) ? leftNormal : rightNormal

      return {
        point: sample.point,
        tangentAngle: Math.atan2(sample.tangent.y, sample.tangent.x),
        normal: normal.normalize(),
      }
    })
  })
}

function createBoxPatternGeometry(
  placements: NotchPlacement[],
  widthMm: number,
  depthMm: number,
  thicknessMm: number,
  zBase: number,
) {
  const geometries = placements.map((placement) => {
    const geometry = new BoxGeometry(widthMm, depthMm, thicknessMm)
    const center = placement.point
      .clone()
      .add(placement.normal.clone().multiplyScalar(depthMm / 2))

    geometry.applyMatrix4(new Matrix4().makeRotationZ(placement.tangentAngle))
    geometry.applyMatrix4(
      new Matrix4().makeTranslation(
        center.x,
        center.y,
        zBase + thicknessMm / 2,
      ),
    )
    return geometry
  })

  return toMerged(geometries)
}

function toLoop(points: Vector2[]) {
  return points.map((point) => [point.x, point.y])
}

function createRingShape(outer: Vector2[], inner: Vector2[]) {
  if (outer.length < 3 || inner.length < 3) {
    return null
  }

  return createShapeFromContours(outer, [inner])
}

function getOffsetLoop(points: Vector2[], offsetMm: number) {
  if (Math.abs(offsetMm) <= 1e-6) {
    return points
  }
  return offsetClosedPoints(points, offsetMm, WALL_JOIN)
}

function buildInnerWallShapesForLoop(
  sourceLoop: Vector2[],
  kind: LoopKind,
  spec: SignSpec,
  style: StyleProfile,
  warnings: string[],
  groupLabel: string,
  startWallIndex = 0,
  includeNotchLoop = true,
) {
  const shapes: Shape[] = []
  const notchLoops: Vector2[][] = []
  const hasInnerWall = spec.innerWall.thicknessMm > 0 && spec.innerWall.heightMm > 0

  if (!hasInnerWall) {
    return { shapes, notchLoops }
  }

  for (let wallIndex = startWallIndex; wallIndex < style.innerWallCount; wallIndex += 1) {
    const gapBefore = wallIndex === 0 ? 0 : style.innerWallGapMm
    const startInset =
      spec.outerWall.thicknessMm
      + wallIndex * spec.innerWall.thicknessMm
      + wallIndex * gapBefore
    const endInset = startInset + spec.innerWall.thicknessMm
    const direction = kind === 'outer' ? -1 : 1

    const outer = getOffsetLoop(sourceLoop, direction * startInset)
    const inner = getOffsetLoop(sourceLoop, direction * endInset)

    if (outer.length < 3 || inner.length < 3) {
      warnings.push(
        `Parede interna omitida em ${groupLabel}: um contorno interno ficou pequeno demais para a espessura configurada.`,
      )
      continue
    }

    const shape = createRingShape(outer, inner)
    if (!shape) {
      warnings.push(
        `Parede interna omitida em ${groupLabel}: não foi possível gerar a seção interna com quinas vivas.`,
      )
      continue
    }

    shapes.push(shape)
    if (includeNotchLoop && wallIndex === startWallIndex) {
      notchLoops.push(kind === 'outer' ? outer : inner)
    }
  }

  return { shapes, notchLoops }
}

function createBodyGeometry(
  group: ShapeGroup,
  spec: SignSpec,
  style: StyleProfile,
  curveSegments: number,
  warnings: string[],
) {
  const baseShapes: Shape[] = []
  const outerWallShapes: Shape[] = []
  const innerWallShapes: Shape[] = []
  const dxfLoops: number[][][] = []
  const notchLoops: Vector2[][] = []
  const wallBaseZ = style.hasBase ? spec.outerWall.baseDepthMm : 0

  group.shapes.forEach((shape) => {
    const { shapePoints, holePoints } = getShapePoints(shape, curveSegments)
    dxfLoops.push(toLoop(shapePoints), ...holePoints.map((hole) => toLoop(hole)))

    if (style.hasBase) {
      baseShapes.push(shape.clone())
    }

    const outerInner = getOffsetLoop(shapePoints, -spec.outerWall.thicknessMm)
    if (outerInner.length >= 3) {
      const outerWall = createRingShape(shapePoints, outerInner)
      if (outerWall) {
        outerWallShapes.push(outerWall)
      }

      const innerOuter = buildInnerWallShapesForLoop(
        shapePoints,
        'outer',
        spec,
        style,
        warnings,
        group.label,
      )
      innerWallShapes.push(...innerOuter.shapes)
      notchLoops.push(...innerOuter.notchLoops)
    } else {
      warnings.push(
        `Parede externa reduzida em ${group.label}: a espessura configurada excede uma região do contorno externo.`,
      )
    }

    holePoints.forEach((hole) => {
      const expandedHole = getOffsetLoop(hole, spec.outerWall.thicknessMm)
      if (expandedHole.length >= 3) {
        const holeWall = createRingShape(expandedHole, hole)
        if (holeWall) {
          outerWallShapes.push(holeWall)
          notchLoops.push(expandedHole)
        }

        if (style.innerWallCount > 1) {
          const innerHole = buildInnerWallShapesForLoop(
            hole,
            'hole',
            spec,
            style,
            warnings,
            group.label,
            1,
            false,
          )
          innerWallShapes.push(...innerHole.shapes)
        }
      } else {
        warnings.push(
          `Parede externa interna reduzida em ${group.label}: um vazado ficou pequeno demais para a espessura configurada.`,
        )
      }
    })
  })

  const geometries: BufferGeometry[] = []

  if (style.hasBase) {
    const base = createExtrudeGeometry(baseShapes, spec.outerWall.baseDepthMm, curveSegments)
    if (base) {
      geometries.push(base)
    }
  }

  const outerWallGeometry = createExtrudeGeometry(outerWallShapes, spec.outerWall.heightMm, curveSegments)
  if (outerWallGeometry) {
    outerWallGeometry.applyMatrix4(new Matrix4().makeTranslation(0, 0, wallBaseZ))
    geometries.push(outerWallGeometry)
  }

  const hasInnerWall = spec.innerWall.thicknessMm > 0 && spec.innerWall.heightMm > 0
  if (hasInnerWall) {
    const innerWallGeometry = createExtrudeGeometry(innerWallShapes, spec.innerWall.heightMm, curveSegments)
    if (innerWallGeometry) {
      innerWallGeometry.applyMatrix4(new Matrix4().makeTranslation(0, 0, wallBaseZ))
      geometries.push(innerWallGeometry)
    }
  }

  let geometry = toMerged(geometries)
  if (!geometry) {
    return null
  }

  if (spec.fitment.notch.enabled) {
    if (!hasInnerWall) {
      warnings.push('Entalhes ignorados: a parede interna está desativada ou com espessura/altura zerada.')
    } else {
      const placements = resolveNotchPlacements(notchLoops, spec, warnings, group.label)
      const notchDepth = Math.min(
        spec.innerWall.thicknessMm,
        spec.fitment.notch.depthMm + spec.fitment.notch.clearanceMm,
      )

      if (placements.length && notchDepth > 0) {
        const pocketGeometry = createBoxPatternGeometry(
          placements,
          spec.fitment.notch.widthMm + spec.fitment.notch.clearanceMm,
          notchDepth,
          spec.innerWall.heightMm + 0.4,
          wallBaseZ - 0.2,
        )

        geometry = subtractGeometry(geometry, pocketGeometry)
      }
    }
  }

  return { geometry, dxfLoops, notchLoops }
}

function getFaceZ(spec: SignSpec, style: StyleProfile) {
  const wallBaseZ = style.hasBase ? spec.outerWall.baseDepthMm : 0
  const wallTopZ = wallBaseZ + spec.outerWall.heightMm

  if (style.frontMounted) {
    return wallTopZ - spec.face.thicknessMm
  }

  return 0
}

function createFaceGeometry(
  group: ShapeGroup,
  spec: SignSpec,
  style: StyleProfile,
  curveSegments: number,
  warnings: string[],
  notchLoops: Vector2[][],
) {
  const faceGeometry = createExtrudeGeometry(group.shapes, spec.face.thicknessMm, curveSegments)
  if (!faceGeometry) {
    return null
  }

  const zBase = getFaceZ(spec, style)
  faceGeometry.applyMatrix4(new Matrix4().makeTranslation(0, 0, zBase))

  const hasInnerWall = spec.innerWall.thicknessMm > 0 && spec.innerWall.heightMm > 0
  if (!spec.fitment.notch.enabled || !hasInnerWall) {
    return faceGeometry
  }

  const placements = resolveNotchPlacements(notchLoops, spec, warnings, group.label)
  if (!placements.length) {
    return faceGeometry
  }

  const tabGeometry = createBoxPatternGeometry(
    placements,
    spec.fitment.notch.widthMm,
    Math.min(spec.innerWall.thicknessMm, spec.fitment.notch.depthMm),
    spec.face.thicknessMm,
    zBase,
  )

  return unionGeometry(faceGeometry, tabGeometry)
}

function getAssemblyOffsetForRole(role: PartRole, style: StyleProfile, groupIndex: number) {
  const direction = style.frontMounted ? 1 : -1

  switch (role) {
    case 'face':
      return [0, 0, direction * (1.4 + groupIndex * 0.08)] as [number, number, number]
    case 'insert':
      return [0, 0, direction * (1.9 + groupIndex * 0.08)] as [number, number, number]
    case 'body':
    default:
      return [0, 0, 0] as [number, number, number]
  }
}

function makePart(
  role: PartRole,
  group: ShapeGroup,
  geometry: BufferGeometry,
  exportName: string,
  assemblyOffset: [number, number, number],
  dxfLoops?: number[][][],
): GeneratedPart {
  return {
    id: `${role}-${group.id}-${exportName}`,
    role,
    label: `${group.label} · ${exportName}`,
    geometry,
    exportName,
    visibleByDefault: true,
    assemblyOffset,
    letterId: group.id,
    dxfLoops,
  }
}

function mergePartsForProject(parts: GeneratedPart[], splitByLetter: boolean) {
  if (splitByLetter) {
    return parts
  }

  const grouped = new Map<string, GeneratedPart[]>()
  parts.forEach((part) => {
    const key = `${part.role}:${part.assemblyOffset.join(',')}`
    grouped.set(key, [...(grouped.get(key) ?? []), part])
  })

  return [...grouped.entries()].flatMap(([key, groupedParts]) => {
    const geometry = toMerged(groupedParts.map((part) => part.geometry))
    if (!geometry) {
      return []
    }

    const [role] = key.split(':') as [PartRole]
    return [
      {
        id: `merged-${key}`,
        role,
        label: groupedParts[0].label.split('·')[1]?.trim() || groupedParts[0].label,
        geometry,
        exportName: role,
        visibleByDefault: true,
        assemblyOffset: groupedParts[0].assemblyOffset,
        dxfLoops: groupedParts.flatMap((part) => part.dxfLoops ?? []),
      },
    ]
  })
}

function buildMetrics(parts: GeneratedPart[]) {
  if (parts.length === 0) {
    return { width: 0, height: 0, depth: 0 }
  }

  const box = new Box3()
  parts.forEach((part) => {
    part.geometry.computeBoundingBox()
    if (part.geometry.boundingBox) {
      box.union(part.geometry.boundingBox)
    }
  })

  return {
    width: box.max.x - box.min.x,
    height: box.max.y - box.min.y,
    depth: box.max.z - box.min.z,
  }
}

function buildDxfContours(parts: GeneratedPart[]): DxfContour[] {
  return parts.flatMap((part) => {
    if (!part.dxfLoops?.length) {
      return []
    }

    return [
      {
        label: part.label,
        role: part.role,
        loops: part.dxfLoops,
      },
    ]
  })
}

export function generateSignParts(document: ShapeDocument, spec: SignSpec): GeneratedParts {
  const curveSegments = getCurveSegments(spec.meshQuality)
  const style = getStyleProfile(spec.styleId, spec)
  const warnings = [...document.metadata.warnings]

  const rawParts = document.groups.flatMap((group, groupIndex) => {
    const nextParts: GeneratedPart[] = []
    const body = createBodyGeometry(group, spec, style, curveSegments, warnings)

    if (body?.geometry) {
      nextParts.push(
        makePart(
          'body',
          group,
          body.geometry,
          'corpo',
          getAssemblyOffsetForRole('body', style, groupIndex),
          body.dxfLoops,
        ),
      )
    }

    const faceGeometry = createFaceGeometry(
      group,
      spec,
      style,
      curveSegments,
      warnings,
      body?.notchLoops ?? [],
    )

    if (faceGeometry) {
      const faceLoops = group.shapes.flatMap((shape) => {
        const { shapePoints, holePoints } = getShapePoints(shape, curveSegments)
        return [
          toLoop(shapePoints),
          ...holePoints.map((hole) => toLoop(hole)),
        ]
      })

      nextParts.push(
        makePart(
          'face',
          group,
          faceGeometry,
          'face',
          getAssemblyOffsetForRole('face', style, groupIndex),
          faceLoops,
        ),
      )
    }

    return nextParts.map((part) => ({
      ...part,
      geometry: applyMirror(part.geometry, spec.mirror),
      dxfLoops: applyMirrorToLoops(part.dxfLoops, spec.mirror),
    }))
  })

  const parts = mergePartsForProject(rawParts, spec.splitByLetter)

  return {
    parts,
    dxfContours: buildDxfContours(parts),
    metricsMm: buildMetrics(parts),
    warnings: [...new Set(warnings)],
  }
}

export function createPreviewFaceGeometry(document: ShapeDocument) {
  const geometry = new ShapeGeometry(
    document.groups.flatMap((group) => group.shapes),
  )
  geometry.computeVertexNormals()
  return geometry
}
