import Papa from 'papaparse'
import type { RawActivityRow, ApiActivityRow, ProcessedData } from '@/lib/types'

export function normalizeApiRows(rows: ApiActivityRow[]): RawActivityRow[] {
  return rows.map(r => ({
    created_at: r.date || '',
    model_permaslug: r.model_permaslug || r.model || '',
    app_name: '',
    cost_total: String(r.usage ?? 0),
    tokens_prompt: String(r.prompt_tokens ?? 0),
    tokens_completion: String(r.completion_tokens ?? 0),
    requests: String(r.requests ?? 1),
  }))
}

export function modelGroup(slug: string): string {
  if (!slug) return 'Unknown'
  if (slug.includes('deepseek')) return 'DeepSeek v3.2'
  if (slug.includes('gemini-3-flash') || slug.includes('gemini-3.0-flash')) return 'Gemini 3 Flash'
  if (slug.includes('gemini-2.5-flash-lite')) return 'Gemini 2.5 Flash Lite'
  if (slug.includes('gemini-2.5-flash')) return 'Gemini 2.5 Flash'
  if (slug.includes('gemini-3.1-flash-lite')) return 'Gemini 3.1 Flash Lite'
  if (slug.includes('claude')) return 'Claude Sonnet'
  if (slug.includes('minimax')) return 'MiniMax'
  if (slug.includes('glm')) return 'GLM'
  const parts = slug.split('/')
  return parts.length > 1 ? parts[1].split('-').slice(0, 3).join('-') : slug
}

export function appGroup(name: string): string {
  if (!name || name.trim() === '') return 'Unlabelled'
  return name
}

export function processRows(rows: RawActivityRow[]): ProcessedData {
  const days = new Set<string>()
  const models = new Set<string>()
  const apps = new Set<string>()
  const dailyCost: Record<string, Record<string, number>> = {}
  const dailyCalls: Record<string, Record<string, number>> = {}
  const modelTotals: Record<string, { cost: number; calls: number; promptTok: number; complTok: number; avgCostPerCall: number }> = {}
  const appStats: Record<string, { cost: number; calls: number; models: Record<string, number> }> = {}
  const hourly = Array.from({ length: 24 }, (_, i) => ({ hour: i, cost: 0, calls: 0 }))
  const weekly: Record<string, Record<string, number>> = {}

  for (const r of rows) {
    const day = (r.created_at || '').slice(0, 10)
    if (!day || day.length !== 10) continue

    const mg = modelGroup(r.model_permaslug)
    const ag = appGroup(r.app_name)
    const cost = parseFloat(r.cost_total) || 0
    const promptTok = parseInt(r.tokens_prompt) || 0
    const complTok = parseInt(r.tokens_completion) || 0
    const reqCount = parseInt(r.requests) || 1
    const hour = parseInt((r.created_at || '').slice(11, 13)) || 0

    days.add(day)
    models.add(mg)
    apps.add(ag)

    if (!dailyCost[mg]) dailyCost[mg] = {}
    dailyCost[mg][day] = (dailyCost[mg][day] || 0) + cost

    if (!dailyCalls[mg]) dailyCalls[mg] = {}
    dailyCalls[mg][day] = (dailyCalls[mg][day] || 0) + reqCount

    if (!modelTotals[mg]) modelTotals[mg] = { cost: 0, calls: 0, promptTok: 0, complTok: 0, avgCostPerCall: 0 }
    modelTotals[mg].cost += cost
    modelTotals[mg].calls += reqCount
    modelTotals[mg].promptTok += promptTok
    modelTotals[mg].complTok += complTok

    if (!appStats[ag]) appStats[ag] = { cost: 0, calls: 0, models: {} }
    appStats[ag].cost += cost
    appStats[ag].calls += reqCount
    appStats[ag].models[mg] = (appStats[ag].models[mg] || 0) + cost

    hourly[hour].cost += cost
    hourly[hour].calls += reqCount

    try {
      const dt = new Date(day + 'T00:00:00Z')
      const startOfYear = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))
      const dayOfYear = Math.floor((dt.getTime() - startOfYear.getTime()) / 86400000)
      const weekNum = Math.ceil((dayOfYear + startOfYear.getUTCDay() + 1) / 7)
      const wk = `W${weekNum}`
      if (!weekly[wk]) weekly[wk] = {}
      weekly[wk][mg] = (weekly[wk][mg] || 0) + cost
    } catch { /* skip */ }
  }

  const sortedDays = [...days].sort()
  const sortedModels = [...models].sort((a, b) => (modelTotals[b]?.cost || 0) - (modelTotals[a]?.cost || 0))

  for (const m of sortedModels) {
    if (modelTotals[m]) {
      modelTotals[m].avgCostPerCall = modelTotals[m].calls > 0
        ? modelTotals[m].cost / modelTotals[m].calls
        : 0
    }
  }

  const totalCost = Object.values(modelTotals).reduce((s, v) => s + v.cost, 0)
  const totalCalls = Object.values(modelTotals).reduce((s, v) => s + v.calls, 0)

  return {
    days: sortedDays,
    models: sortedModels,
    dailyCost: Object.fromEntries(sortedModels.map(m => [m, sortedDays.map(d => round(dailyCost[m]?.[d] || 0))])),
    dailyCalls: Object.fromEntries(sortedModels.map(m => [m, sortedDays.map(d => dailyCalls[m]?.[d] || 0)])),
    modelTotals: Object.fromEntries(Object.entries(modelTotals).map(([k, v]) => [k, {
      cost: round(v.cost), calls: v.calls, promptTok: v.promptTok, complTok: v.complTok,
      avgCostPerCall: round(v.avgCostPerCall, 6)
    }])),
    apps: Object.fromEntries(Object.entries(appStats).map(([k, v]) => [k, {
      cost: round(v.cost), calls: v.calls,
      models: Object.fromEntries(Object.entries(v.models).map(([m, c]) => [m, round(c)]))
    }])),
    hourly: hourly.map(h => ({ ...h, cost: round(h.cost) })),
    weekly,
    totalCost: round(totalCost),
    totalCalls,
    dateRange: sortedDays.length > 0 ? `${sortedDays[0]} to ${sortedDays[sortedDays.length - 1]}` : 'No data'
  }
}

function round(n: number, d = 4): number {
  const f = Math.pow(10, d)
  return Math.round(n * f) / f
}

export function parseCSV(text: string): RawActivityRow[] {
  const result = Papa.parse<RawActivityRow>(text, {
    header: true,
    skipEmptyLines: true,
  })
  return result.data.filter(r => r.created_at)
}
