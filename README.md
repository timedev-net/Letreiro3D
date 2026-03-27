# Letreiro3D

Aplicação web para gerar letreiros 3D a partir de texto ou arquivos SVG, com preview em tempo real e exportação para fabricação.

## O que o projeto faz

- Gera letreiros 3D a partir de texto com fontes internas ou fontes enviadas em `TTF/OTF`
- Importa arquivos `SVG` preservando escala física quando disponível
- Exibe preview 3D interativo no navegador com `three.js`
- Permite ajustar base, altura de parede, espessura, folga e espessura do acrílico
- Exporta `STL` do corpo, `STL` do acrílico, `STL` por letra e `DXF` dos contornos

## Tecnologias principais

- `React`
- `Vite`
- `TypeScript`
- `Tailwind CSS`
- `three.js`
- `@react-three/fiber`
- `@react-three/drei`
- `zustand`
- `opentype.js`
- `clipper-lib`
- `jszip`
- `zod`

## Requisitos

- `Node.js` 20+ recomendado
- `pnpm` como gerenciador de pacotes

## Como rodar

```bash
pnpm install
pnpm dev
```

Para gerar a versão de produção:

```bash
pnpm build
pnpm preview
```

## Scripts disponíveis

- `pnpm dev`: inicia o ambiente de desenvolvimento
- `pnpm build`: gera o build de produção
- `pnpm lint`: executa a checagem de lint
- `pnpm preview`: abre o build localmente para conferência
- `pnpm test:e2e`: roda a suíte Playwright de regressão geométrica e de preview

## Testes de regressão

- A suíte `Playwright` cobre as letras com contraformas, para evitar regressões em `A`, `B`, `R`, `D` e `8`
- Há validação equivalente para um `SVG` com vazado interno
- O fluxo de UI também valida preview gerado, toggle de face e estabilidade do espelhamento

Para rodar os testes:

```bash
pnpm test:e2e
```

## Estrutura principal

```text
src/
  app/
  components/
  core/
  features/
  store/
  types/
public/
  examples/
  fonts/
```

## Fluxo do app

1. O usuário escolhe a origem: texto ou SVG.
2. A entrada é convertida para um documento vetorial normalizado em milímetros.
3. O gerador cria corpo, paredes e face acrílica.
4. O preview 3D é atualizado no navegador.
5. O projeto pode ser exportado em `STL` e `DXF`.

## Observações

- O projeto funciona totalmente no navegador para o MVP atual.
- O estado do projeto é salvo localmente no navegador.
- Fontes enviadas pelo usuário não são persistidas após recarregar a página.
