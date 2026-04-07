export const PALETTE: string[] = [
  '#c4a0a6', '#8a9baf', '#a8b88e', '#b8949a',
  '#7a8aa0', '#9aab82', '#a094b8', '#c0a080',
  '#7c9a8e', '#b08a8a', '#8896a8', '#a0a878',
]

export function getModelColor(_model: string, index: number): string {
  return PALETTE[index % PALETTE.length]
}

export function buildColorMap(models: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  models.forEach((m, i) => { map[m] = PALETTE[i % PALETTE.length] })
  return map
}
