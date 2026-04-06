export const PALETTE: string[] = [
  '#6886c5', '#e0a370', '#6bbf8a', '#b07cc6',
  '#c47e7e', '#5ba4cf', '#d4a855', '#7ec4b0',
  '#9b8ec4', '#c7956d', '#5faa9e', '#a89b5c',
]

export function getModelColor(_model: string, index: number): string {
  return PALETTE[index % PALETTE.length]
}

export function buildColorMap(models: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  models.forEach((m, i) => { map[m] = PALETTE[i % PALETTE.length] })
  return map
}
