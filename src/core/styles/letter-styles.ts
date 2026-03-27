import type { LetterStyleId } from '../../types/sign'

export interface LetterStyleDefinition {
  id: LetterStyleId
  label: string
  description: string
  summary: string
}

export const letterStyles: LetterStyleDefinition[] = [
  {
    id: 'face-acrilico-fundo-impresso',
    label: 'Face acrílico - fundo impresso',
    description: 'Corpo com fundo fechado, parede externa e encaixe frontal da face.',
    summary: 'Estrutura tradicional com corpo fechado.',
  },
  {
    id: 'face-acrilico-fundo-vazado',
    label: 'Face acrílico - fundo vazado',
    description: 'Corpo sem fundo, com face frontal e cavidade aberta.',
    summary: 'Mais leve e aberto para montagens específicas.',
  },
  {
    id: 'face-acrilico-parede-interna-dupla',
    label: 'Face acrílico - parede interna dupla',
    description: 'Gera dupla parede interna integrada ao corpo para reforço do encaixe.',
    summary: 'Mais estrutura interna para peças largas ou delicadas.',
  },
  {
    id: 'face-acrilico-back-fit',
    label: 'Face acrílico - back fit',
    description: 'Face inserida por trás com lógica de montagem invertida.',
    summary: 'Montagem reversa com preview traseiro.',
  },
]
