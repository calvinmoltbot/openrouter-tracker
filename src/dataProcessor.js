// Process raw CSV rows into dashboard-ready aggregated data

export function modelGroup(slug) {
  if (!slug) return 'Unknown'
  if (slug.includes('deepseek')) return 'DeepSeek v3.2'
  if (slug.includes('gemini-3-flash') || slug.includes('gemini-3.0-flash')) return 'Gemini 3 Flash'
  if (slug.includes('gemini-2.5-flash-lite')) return 'Gemini 2.5 Flash Lite'
  if (slug.includes('gemini-2.5-flash')) return 'Gemini 2.5 Flash'
  if (slug.includes('gemini-3.1-flash-lite')) return 'Gemini 3.1 Flash Lite'
  if (slug.includes('claude')) return 'Claude Sonnet'
  if (slug.includes('minimax')) return 'MiniMax'
  if (slug.includes('glm')) return 'GLM'
  // Generic fallback: take the model name portion
  const parts = slug.split('/')
  return parts.length > 1 ? parts[1].split('-').slice(0, 3).join('-') : slug
}

export function appGroup(name) {
  if (!name || name.trim() === '') return 'Unlabelled'
  return name
}

export function processRows(rows) {
  const days = new Set()
  const models = new Set()
  const apps = new Set()
  const dailyCost = {}
  const dailyCalls = {}
  const modelTotals = {}
  const appStats = {}
  const hourly = Array.from({ length: 24 }, (_, i) => ({ hour: i, cost: 0, calls: 0 }))
  const weekly = {}

  for (const r of rows) {
    const day = (r.created_at || '').slice(0, 10)
    if (!day || day.length !== 10) continue

    const mg = modelGroup(r.model_permaslug)
    const ag = appGroup(r.app_name)
    const cost = parseFloat(r.cost_total) || 0
    const promptTok = parseInt(r.tokens_prompt) || 0
    const complTok = parseInt(r.tokens_completion) || 0
    const hour = parseInt((r.created_at || '').slice(11, 13)) || 0

    days.add(day)
    models.add(mg)
    apps.add(ag)

    // Daily cost
    if (!dailyCost[mg]) dailyCost[mg] = {}
    dailyCost[mg][day] = (dailyCost[mg][day] || 0) + cost

    // Daily calls
    if (!dailyCalls[mg]) dailyCalls[mg] = {}
    dailyCalls[mg][day] = (dailyCalls[mg][day] || 0) + 1

    // Model totals
    if (!modelTotals[mg]) modelTotals[mg] = { cost: 0, calls: 0, promptTok: 0, complTok: 0 }
    modelTotals[mg].cost += cost
    modelTotals[mg].calls += 1
    modelTotals[mg].promptTok += promptTok
    modelTotals[mg].complTok += complTok

    // App stats
    if (!appStats[ag]) appStats[ag] = { cost: 0, calls: 0, models: {} }
    appStats[ag].cost += cost
    appStats[ag].calls += 1
    appStats[ag].models[mg] = (appStats[ag].models[mg] || 0) + cost

    // Hourly
    hourly[hour].cost += cost
    hourly[hour].calls += 1

    // Weekly
    try {
      const dt = new Date(day + 'T00:00:00Z')
      const startOfYear = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))
      const dayOfYear = Math.floor((dt - startOfYear) / 86400000)
      const weekNum = Math.ceil((dayOfYear + startOfYear.getUTCDay() + 1) / 7)
      const wk = `W${weekNum}`
      if (!weekly[wk]) weekly[wk] = {}
      weekly[wk][mg] = (weekly[wk][mg] || 0) + cost
    } catch (e) { /* skip */ }
  }

  const sortedDays = [...days].sort()
  const sortedModels = [...models].sort((a, b) => (modelTotals[b]?.cost || 0) - (modelTotals[a]?.cost || 0))

  // Compute avgCostPerCall
  for (const m of sortedModels) {
    if (modelTotals[m]) {
      modelTotals[m].avgCostPerCall = modelTotals[m].calls > 0
        ? modelTotals[m].cost / modelTotals[m].calls
        : 0
    }
  }

  const totalCost = Object.values(modelTotals).reduce((s, v) => s + v.cost, 0)
  const totalCalls = rows.length

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

function round(n, d = 4) {
  const f = Math.pow(10, d)
  return Math.round(n * f) / f
}

export function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0])
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    const row = {}
    headers.forEach((h, i) => row[h] = values[i] || '')
    return row
  }).filter(r => r.created_at)
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { current += '"'; i++ }
      else if (c === '"') inQuotes = false
      else current += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { result.push(current); current = '' }
      else current += c
    }
  }
  result.push(current)
  return result
}
