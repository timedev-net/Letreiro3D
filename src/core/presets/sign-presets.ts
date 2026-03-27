import type { DeepPartial, SignSpec } from '../../types/sign'

export interface SignPreset {
  id: string
  label: string
  description: string
  spec: DeepPartial<SignSpec>
}

export const signPresets: SignPreset[] = [
  {
    id: 'standard-box',
    label: 'Caixa padrão',
    description: 'Equilíbrio geral para corpo fechado com parede interna simples.',
    spec: {
      styleId: 'face-acrilico-fundo-impresso',
      outerWall: {
        baseDepthMm: 3,
        heightMm: 35,
        thicknessMm: 2,
      },
      innerWall: {
        heightMm: 30,
        thicknessMm: 1.2,
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
      meshQuality: 'normal',
    },
  },
  {
    id: 'deep-sign',
    label: 'Profundo',
    description: 'Mais volume e altura, com parede interna dupla integrada ao corpo.',
    spec: {
      styleId: 'face-acrilico-parede-interna-dupla',
      outerWall: {
        baseDepthMm: 4,
        heightMm: 48,
        thicknessMm: 2.4,
      },
      innerWall: {
        heightMm: 42,
        thicknessMm: 1.2,
      },
      face: {
        thicknessMm: 3,
      },
      fitment: {
        clearanceMm: 0.45,
        notch: {
          enabled: true,
          widthMm: 14,
          depthMm: 2.4,
          clearanceMm: 0.25,
          edgeOffsetMm: 12,
          distribution: 'auto',
          count: 3,
          minSpacingMm: 18,
        },
      },
      assembly: {
        explodeDistanceMm: 8,
      },
      meshQuality: 'high',
    },
  },
  {
    id: 'lightweight',
    label: 'Leve',
    description: 'Estrutura aberta com fundo vazado e parede interna mínima.',
    spec: {
      styleId: 'face-acrilico-fundo-vazado',
      outerWall: {
        baseDepthMm: 2,
        heightMm: 24,
        thicknessMm: 1.4,
      },
      innerWall: {
        heightMm: 18,
        thicknessMm: 0.8,
      },
      face: {
        thicknessMm: 2,
      },
      fitment: {
        clearanceMm: 0.25,
        notch: {
          enabled: false,
          widthMm: 10,
          depthMm: 1.6,
          clearanceMm: 0.2,
          edgeOffsetMm: 8,
          distribution: 'auto',
          count: 2,
          minSpacingMm: 14,
        },
      },
      assembly: {
        explodeDistanceMm: 0,
      },
      meshQuality: 'draft',
    },
  },
  {
    id: 'tight-acrylic',
    label: 'Back fit',
    description: 'Face invertida por trás com parede interna integrada ao corpo.',
    spec: {
      styleId: 'face-acrilico-back-fit',
      outerWall: {
        baseDepthMm: 3,
        heightMm: 32,
        thicknessMm: 2,
      },
      innerWall: {
        heightMm: 26,
        thicknessMm: 1,
      },
      face: {
        thicknessMm: 3,
      },
      fitment: {
        clearanceMm: 0.15,
        notch: {
          enabled: true,
          widthMm: 12,
          depthMm: 2,
          clearanceMm: 0.2,
          edgeOffsetMm: 10,
          distribution: 'manual-count',
          count: 2,
          minSpacingMm: 16,
        },
      },
      assembly: {
        explodeDistanceMm: 6,
      },
      meshQuality: 'normal',
    },
  },
]
