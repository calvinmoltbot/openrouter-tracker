export const PALETTE = [
  '#ef4444', '#3b82f6', '#10b981', '#8b5cf6',
  '#f59e0b', '#6366f1', '#ec4899', '#14b8a6',
  '#f97316', '#a855f7', '#06b6d4', '#84cc16'
]

export function getModelColor(model, index) {
  return PALETTE[index % PALETTE.length]
}

export function buildColorMap(models) {
  const map = {}
  models.forEach((m, i) => { map[m] = PALETTE[i % PALETTE.length] })
  return map
}
