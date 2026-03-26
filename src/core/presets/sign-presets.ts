import type { SignSpec } from '../../types/sign'

export interface SignPreset {
  id: string
  label: string
  description: string
  spec: Partial<SignSpec>
}

export const signPresets: SignPreset[] = [
  {
    id: 'standard-box',
    label: 'Caixa padrão',
    description: 'Equilíbrio geral para letreiro com boa parede e encaixe seguro.',
    spec: {
      baseDepthMm: 3,
      wallHeightMm: 35,
      wallThicknessMm: 2,
      acrylicThicknessMm: 3,
      clearanceMm: 0.4,
      meshQuality: 'normal',
    },
  },
  {
    id: 'deep-sign',
    label: 'Profundo',
    description: 'Mais volume e altura para letras maiores ou visual robusto.',
    spec: {
      baseDepthMm: 4,
      wallHeightMm: 48,
      wallThicknessMm: 2.4,
      acrylicThicknessMm: 3,
      clearanceMm: 0.45,
      meshQuality: 'high',
    },
  },
  {
    id: 'lightweight',
    label: 'Leve',
    description: 'Casca mais fina para prototipagem rápida e economia de material.',
    spec: {
      baseDepthMm: 2,
      wallHeightMm: 24,
      wallThicknessMm: 1.4,
      acrylicThicknessMm: 2,
      clearanceMm: 0.25,
      meshQuality: 'draft',
    },
  },
  {
    id: 'tight-acrylic',
    label: 'Acrílico justo',
    description: 'Folga menor para testes de encaixe mais apertado.',
    spec: {
      baseDepthMm: 3,
      wallHeightMm: 32,
      wallThicknessMm: 2,
      acrylicThicknessMm: 3,
      clearanceMm: 0.15,
      meshQuality: 'normal',
    },
  },
]
