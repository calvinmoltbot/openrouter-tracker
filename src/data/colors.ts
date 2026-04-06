export const PALETTE: string[] = [
  '#ffb2bb', '#909fb4', '#f1ffd4', '#f9a0ab',
  '#c6d6ec', '#d7e5bb', '#96a9e6', '#ffc6cc',
  '#6073ad', '#ee7d77', '#d4e4fa', '#e2f1c6',
]

export function getModelColor(_model: string, index: number): string {
  return PALETTE[index % PALETTE.length]
}

export function buildColorMap(models: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  models.forEach((m, i) => { map[m] = PALETTE[i % PALETTE.length] })
  return map
}
