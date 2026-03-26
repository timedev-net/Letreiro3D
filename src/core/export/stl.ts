import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { Mesh, MeshStandardMaterial } from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import type { BufferGeometry } from 'three'

const material = new MeshStandardMaterial()

function geometryToBlob(geometry: BufferGeometry) {
  const exporter = new STLExporter()
  const mesh = new Mesh(geometry, material)
  const data = exporter.parse(mesh, { binary: true }) as DataView
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return new Blob([bytes], { type: 'model/stl' })
}

export function downloadStl(geometry: BufferGeometry | null, name: string) {
  if (!geometry) {
    throw new Error('Nenhuma geometria disponível para exportar')
  }
  saveAs(geometryToBlob(geometry), name)
}

export async function downloadStlZip(
  geometries: BufferGeometry[],
  baseName: string,
) {
  if (geometries.length === 0) {
    throw new Error('Nenhuma geometria de letra disponível para exportar')
  }

  const zip = new JSZip()
  geometries.forEach((geometry, index) => {
    zip.file(`${baseName}-${index + 1}.stl`, geometryToBlob(geometry))
  })

  const archive = await zip.generateAsync({ type: 'blob' })
  saveAs(archive, `${baseName}.zip`)
}
