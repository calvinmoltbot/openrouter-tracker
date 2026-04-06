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
  const modelTotals: Record<string, { cost: number; calls: number; promptTok: number; complTok: number; avgCostPerCall: number; reasoningTok: number; cachedTok: number; cacheSavings: number; avgLatencyMs: number; avgTtftMs: number; latencyCount: number; _latencySum: number; _ttftSum: number }> = {}
  const appStats: Record<string, { cost: number; calls: number; models: Record<string, number>; keys: Record<string, number> }> = {}
  const providerStats: Record<string, { cost: number; calls: number }> = {}
  const keyStats: Record<string, { cost: number; calls: number; apps: Record<string, number>; models: Record<string, number> }> = {}
  const dailyAppCost: Record<string, Record<string, number>> = {}
  const dailyKeyCost: Record<string, Record<string, number>> = {}
  const hourly = Array.from({ length: 24 }, (_, i) => ({ hour: i, cost: 0, calls: 0 }))
  const weekly: Record<string, Record<string, number>> = {}
  let hasLogData = false

  for (const r of rows) {
    const day = (r.created_at || '').slice(0, 10)
    if (!day || day.length !== 10) continue

    const mg = modelGroup(r.model_permaslug)
    const ag = appGroup(r.app_name)
    const cost = parseFloat(r.cost_total) || 0
    const promptTok = parseInt(r.tokens_prompt) || 0
    const complTok = parseInt(r.tokens_completion) || 0
    const reqCount = parseInt(r.requests) || 1
    const reasoningTok = parseInt(r.tokens_reasoning || '') || 0
    const cachedTok = parseInt(r.tokens_cached || '') || 0
    const cacheSavings = Math.abs(parseFloat(r.cost_cache || '') || 0)
    const latencyMs = parseFloat(r.generation_time_ms || '') || 0
    const ttftMs = parseFloat(r.time_to_first_token_ms || '') || 0
    const provider = r.provider_name || ''
    const hour = parseInt((r.created_at || '').slice(11, 13)) || 0

    if (r.tokens_reasoning !== undefined || r.generation_time_ms !== undefined) hasLogData = true

    days.add(day)
    models.add(mg)
    apps.add(ag)

    if (!dailyCost[mg]) dailyCost[mg] = {}
    dailyCost[mg][day] = (dailyCost[mg][day] || 0) + cost

    if (!dailyCalls[mg]) dailyCalls[mg] = {}
    dailyCalls[mg][day] = (dailyCalls[mg][day] || 0) + reqCount

    if (!modelTotals[mg]) modelTotals[mg] = { cost: 0, calls: 0, promptTok: 0, complTok: 0, avgCostPerCall: 0, reasoningTok: 0, cachedTok: 0, cacheSavings: 0, avgLatencyMs: 0, avgTtftMs: 0, latencyCount: 0, _latencySum: 0, _ttftSum: 0 }
    modelTotals[mg].cost += cost
    modelTotals[mg].calls += reqCount
    modelTotals[mg].promptTok += promptTok
    modelTotals[mg].complTok += complTok
    modelTotals[mg].reasoningTok += reasoningTok
    modelTotals[mg].cachedTok += cachedTok
    modelTotals[mg].cacheSavings += cacheSavings
    if (latencyMs > 0) {
      modelTotals[mg]._latencySum += latencyMs
      modelTotals[mg]._ttftSum += ttftMs
      modelTotals[mg].latencyCount += 1
    }

    if (provider) {
      if (!providerStats[provider]) providerStats[provider] = { cost: 0, calls: 0 }
      providerStats[provider].cost += cost
      providerStats[provider].calls += reqCount
    }

    if (!appStats[ag]) appStats[ag] = { cost: 0, calls: 0, models: {}, keys: {} }
    appStats[ag].cost += cost
    appStats[ag].calls += reqCount
    appStats[ag].models[mg] = (appStats[ag].models[mg] || 0) + cost

    if (!dailyAppCost[ag]) dailyAppCost[ag] = {}
    dailyAppCost[ag][day] = (dailyAppCost[ag][day] || 0) + cost

    const keyName = r.api_key_name || ''
    if (keyName) {
      appStats[ag].keys[keyName] = (appStats[ag].keys[keyName] || 0) + cost
      if (!keyStats[keyName]) keyStats[keyName] = { cost: 0, calls: 0, apps: {}, models: {} }
      keyStats[keyName].cost += cost
      keyStats[keyName].calls += reqCount
      keyStats[keyName].apps[ag] = (keyStats[keyName].apps[ag] || 0) + cost
      keyStats[keyName].models[mg] = (keyStats[keyName].models[mg] || 0) + cost

      if (!dailyKeyCost[keyName]) dailyKeyCost[keyName] = {}
      dailyKeyCost[keyName][day] = (dailyKeyCost[keyName][day] || 0) + cost
    }

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
      modelTotals[m].avgLatencyMs = modelTotals[m].latencyCount > 0
        ? modelTotals[m]._latencySum / modelTotals[m].latencyCount
        : 0
      modelTotals[m].avgTtftMs = modelTotals[m].latencyCount > 0
        ? modelTotals[m]._ttftSum / modelTotals[m].latencyCount
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
      avgCostPerCall: round(v.avgCostPerCall, 6),
      reasoningTok: v.reasoningTok, cachedTok: v.cachedTok, cacheSavings: round(v.cacheSavings),
      avgLatencyMs: round(v.avgLatencyMs, 0), avgTtftMs: round(v.avgTtftMs, 0), latencyCount: v.latencyCount,
    }])),
    apps: Object.fromEntries(Object.entries(appStats).map(([k, v]) => [k, {
      cost: round(v.cost), calls: v.calls,
      models: Object.fromEntries(Object.entries(v.models).map(([m, c]) => [m, round(c)])),
      keys: Object.fromEntries(Object.entries(v.keys).map(([kn, c]) => [kn, round(c)])),
    }])),
    providers: Object.fromEntries(Object.entries(providerStats).map(([k, v]) => [k, {
      cost: round(v.cost), calls: v.calls,
    }])),
    keyStats: Object.fromEntries(Object.entries(keyStats).map(([k, v]) => [k, {
      cost: round(v.cost), calls: v.calls,
      apps: Object.fromEntries(Object.entries(v.apps).map(([a, c]) => [a, round(c)])),
      models: Object.fromEntries(Object.entries(v.models).map(([m, c]) => [m, round(c)])),
    }])),
    dailyAppCost: Object.fromEntries(
      Object.keys(appStats).map(a => [a, sortedDays.map(d => round(dailyAppCost[a]?.[d] || 0))])
    ),
    dailyKeyCost: Object.fromEntries(
      Object.keys(keyStats).map(k => [k, sortedDays.map(d => round(dailyKeyCost[k]?.[d] || 0))])
    ),
    hourly: hourly.map(h => ({ ...h, cost: round(h.cost) })),
    weekly,
    totalCost: round(totalCost),
    totalCalls,
    totalCacheSavings: round(Object.values(modelTotals).reduce((s, v) => s + v.cacheSavings, 0)),
    totalReasoningTok: Object.values(modelTotals).reduce((s, v) => s + v.reasoningTok, 0),
    totalCachedTok: Object.values(modelTotals).reduce((s, v) => s + v.cachedTok, 0),
    hasLogData,
    dateRange: sortedDays.length > 0 ? `${sortedDays[0]} to ${sortedDays[sortedDays.length - 1]}` : 'No data'
  }
}

function round(n: number, d = 4): number {
  const f = Math.pow(10, d)
  return Math.round(n * f) / f
}

export function filterRowsByRange(rows: RawActivityRow[], range: string): RawActivityRow[] {
  if (range === 'all') return rows

  // Custom date range: "custom:YYYY-MM-DD:YYYY-MM-DD"
  if (range.startsWith('custom:')) {
    const [, startStr, endStr] = range.split(':')
    return rows.filter(r => {
      const day = (r.created_at || '').slice(0, 10)
      return day >= startStr && day <= endStr
    })
  }

  const now = new Date()
  let startDate: Date

  switch (range) {
    case '1d':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case '7d':
      startDate = new Date(now.getTime() - 7 * 86400000)
      break
    case '14d':
      startDate = new Date(now.getTime() - 14 * 86400000)
      break
    case '30d':
      startDate = new Date(now.getTime() - 30 * 86400000)
      break
    case 'month': {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    }
    case '90d':
      startDate = new Date(now.getTime() - 90 * 86400000)
      break
    default:
      return rows
  }

  const startStr = startDate.toISOString().slice(0, 10)
  return rows.filter(r => (r.created_at || '').slice(0, 10) >= startStr)
}

export function filterRowsByPreviousRange(rows: RawActivityRow[], range: string): RawActivityRow[] {
  if (range === 'all') return []
  if (range.startsWith('custom:')) return [] // No comparison for custom ranges

  const now = new Date()
  let startDate: Date
  let endDate: Date

  switch (range) {
    case '1d': {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      endDate = today
      startDate = new Date(today.getTime() - 86400000)
      break
    }
    case '7d':
      endDate = new Date(now.getTime() - 7 * 86400000)
      startDate = new Date(now.getTime() - 14 * 86400000)
      break
    case '14d':
      endDate = new Date(now.getTime() - 14 * 86400000)
      startDate = new Date(now.getTime() - 28 * 86400000)
      break
    case '30d':
      endDate = new Date(now.getTime() - 30 * 86400000)
      startDate = new Date(now.getTime() - 60 * 86400000)
      break
    case 'month': {
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      startDate = prevMonthStart
      endDate = thisMonthStart
      break
    }
    case '90d':
      endDate = new Date(now.getTime() - 90 * 86400000)
      startDate = new Date(now.getTime() - 180 * 86400000)
      break
    default:
      return []
  }

  const startStr = startDate.toISOString().slice(0, 10)
  const endStr = endDate.toISOString().slice(0, 10)
  return rows.filter(r => {
    const day = (r.created_at || '').slice(0, 10)
    return day >= startStr && day < endStr
  })
}

export function parseCSV(text: string): RawActivityRow[] {
  const result = Papa.parse<RawActivityRow>(text, {
    header: true,
    skipEmptyLines: true,
  })
  return result.data.filter(r => r.created_at)
}
