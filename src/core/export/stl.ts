import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { Mesh, MeshStandardMaterial } from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { BufferGeometry } from 'three'
import type { GeneratedPart, PartRole } from '../../types/sign'

const material = new MeshStandardMaterial()

function geometryToBlob(geometry: BufferGeometry) {
  const exporter = new STLExporter()
  const mesh = new Mesh(geometry, material)
  const data = exporter.parse(mesh, { binary: true }) as DataView
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return new Blob([bytes], { type: 'model/stl' })
}

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function getMergedGeometryFromParts(parts: GeneratedPart[], role?: PartRole) {
  const target = role ? parts.filter((part) => part.role === role) : parts
  if (target.length === 0) {
    return null
  }

  if (target.length === 1) {
    return target[0].geometry
  }

  const merged = mergeGeometries(target.map((part) => part.geometry.clone()), false)
  if (!merged) {
    return target[0].geometry
  }
  merged.computeVertexNormals()
  return merged
}

export function downloadStl(geometry: BufferGeometry | null, name: string) {
  if (!geometry) {
    throw new Error('Nenhuma geometria disponível para exportar')
  }
  saveAs(geometryToBlob(geometry), name)
}

export function downloadPartRoleStl(parts: GeneratedPart[], role: PartRole, name: string) {
  const geometry = getMergedGeometryFromParts(parts, role)
  if (!geometry) {
    throw new Error('Nenhuma geometria disponível para a peça selecionada')
  }
  downloadStl(geometry, name)
}

export async function downloadPartsZip(parts: GeneratedPart[], baseName: string) {
  if (parts.length === 0) {
    throw new Error('Nenhuma peça disponível para exportar')
  }

  const zip = new JSZip()

  parts.forEach((part, index) => {
    const folder = part.role === 'body'
      ? 'corpo'
      : part.role === 'face'
        ? 'face'
        : 'encaixes'

    const exportName = sanitizeSegment(part.exportName) || `${part.role}-${index + 1}`
    const letterName = part.letterId ? `${sanitizeSegment(part.letterId)}-` : ''
    zip.file(`${folder}/${letterName}${exportName}.stl`, geometryToBlob(part.geometry))
  })

  const archive = await zip.generateAsync({ type: 'blob' })
  saveAs(archive, `${baseName}.zip`)
}
