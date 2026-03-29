import type { ProcessedData } from '@/lib/types'

export interface Recommendation {
  id: string
  type: 'cheaper-model' | 'cron-pattern' | 'caching' | 'disproportionate' | 'idle-key' | 'budget-trajectory'
  title: string
  description: string
  savings: number | null
  severity: 'info' | 'warning' | 'critical'
  icon: string
}

/** Simple hash of a string for generating stable IDs */
function hash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

export function generateRecommendations(data: ProcessedData, budget: number): Recommendation[] {
  const recs: Recommendation[] = []

  // 1. Disproportionate spend
  if (data.totalCost > 0 && data.totalCalls > 0) {
    for (const model of data.models) {
      const t = data.modelTotals[model]
      if (!t) continue
      const costPct = t.cost / data.totalCost
      const callPct = t.calls / data.totalCalls
      if (costPct > 0.5 && callPct < 0.25) {
        // Find cheapest model for savings estimate
        let cheapest = Infinity
        for (const m of data.models) {
          const mt = data.modelTotals[m]
          if (mt && mt.avgCostPerCall > 0 && mt.avgCostPerCall < cheapest) {
            cheapest = mt.avgCostPerCall
          }
        }
        const switchableCalls = Math.floor(t.calls * 0.5)
        const savings = cheapest < Infinity
          ? switchableCalls * (t.avgCostPerCall - cheapest)
          : null

        const desc = `${model} accounts for ${(costPct * 100).toFixed(0)}% of spend but only ${(callPct * 100).toFixed(0)}% of calls. The per-call cost is $${t.avgCostPerCall.toFixed(4)}. Review whether a cheaper model could handle some of these.`
        recs.push({
          id: hash(`disproportionate-${model}-${(costPct * 100).toFixed(0)}`),
          type: 'disproportionate',
          title: 'Disproportionate model spend',
          description: desc,
          savings: savings && savings > 0 ? savings : null,
          severity: 'warning',
          icon: 'PieChart',
        })
      }
    }
  }

  // 2. Suspicious cron patterns
  for (const bucket of data.hourly) {
    if (bucket.calls > 100 && bucket.cost > 1) {
      const hourStr = String(bucket.hour).padStart(2, '0')
      const desc = `${bucket.calls.toLocaleString()} calls between ${hourStr}:00-${hourStr}:59 UTC cost $${bucket.cost.toFixed(2)}. If automated, review whether all calls are necessary.`
      recs.push({
        id: hash(`cron-${bucket.hour}-${bucket.calls}`),
        type: 'cron-pattern',
        title: 'Suspicious cron pattern detected',
        description: desc,
        savings: null,
        severity: 'info',
        icon: 'Clock',
      })
    }
  }

  // 3. Caching opportunities
  if (data.hasLogData && data.totalCachedTok === 0 && data.totalCost > 5) {
    const estSavings = data.totalCost * 0.1
    const desc = `No prompt caching detected. Enabling caching could save ~$${estSavings.toFixed(2)} based on your prompt patterns.`
    recs.push({
      id: hash(`caching-${data.totalCost.toFixed(0)}`),
      type: 'caching',
      title: 'Enable prompt caching',
      description: desc,
      savings: estSavings,
      severity: 'warning',
      icon: 'Database',
    })
  }

  // 4. Budget trajectory
  if (budget > 0 && data.days.length > 1) {
    const daysElapsed = data.days.length
    const dailyAvg = data.totalCost / daysElapsed
    // Assume a 30-day month for projection
    const projected = dailyAvg * 30
    if (projected > budget) {
      const ratio = projected / budget
      const exceedDay = Math.ceil(budget / dailyAvg)
      const severity = ratio > 1.2 ? 'critical' as const : 'warning' as const
      const desc = `On track to exceed your $${budget.toFixed(0)} monthly budget by day ${exceedDay}. Projected spend: $${projected.toFixed(2)}.`
      recs.push({
        id: hash(`budget-${budget}-${projected.toFixed(0)}`),
        type: 'budget-trajectory',
        title: 'Budget overspend projected',
        description: desc,
        savings: null,
        severity,
        icon: 'TrendingUp',
      })
    }
  }

  // 5. Model cost comparison
  if (data.models.length >= 2) {
    let mostExpensive = { model: '', cost: 0 }
    let cheapestModel = { model: '', cost: Infinity }
    for (const model of data.models) {
      const t = data.modelTotals[model]
      if (!t || t.avgCostPerCall <= 0) continue
      if (t.avgCostPerCall > mostExpensive.cost) {
        mostExpensive = { model, cost: t.avgCostPerCall }
      }
      if (t.avgCostPerCall < cheapestModel.cost) {
        cheapestModel = { model, cost: t.avgCostPerCall }
      }
    }
    if (mostExpensive.cost > 0 && cheapestModel.cost > 0 && cheapestModel.cost < Infinity) {
      const ratio = mostExpensive.cost / cheapestModel.cost
      if (ratio > 10) {
        const desc = `${mostExpensive.model} costs $${mostExpensive.cost.toFixed(4)}/call. ${cheapestModel.model} costs $${cheapestModel.cost.toFixed(4)}/call (${ratio.toFixed(0)}x cheaper).`
        recs.push({
          id: hash(`cheaper-${mostExpensive.model}-${cheapestModel.model}`),
          type: 'cheaper-model',
          title: 'Large cost gap between models',
          description: desc,
          savings: null,
          severity: 'info',
          icon: 'ArrowDownUp',
        })
      }
    }
  }

  // 6. Idle key detection
  for (const [keyName, stats] of Object.entries(data.keyStats)) {
    if (stats.cost === 0) {
      const desc = `API key "${keyName}" has $0.00 spend this period but is still active.`
      recs.push({
        id: hash(`idle-key-${keyName}`),
        type: 'idle-key',
        title: 'Idle API key detected',
        description: desc,
        savings: null,
        severity: 'info',
        icon: 'KeyRound',
      })
    }
  }

  // Sort: critical first, then by savings (highest first), then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 }
  recs.sort((a, b) => {
    const sev = severityOrder[a.severity] - severityOrder[b.severity]
    if (sev !== 0) return sev
    const sa = a.savings ?? -1
    const sb = b.savings ?? -1
    return sb - sa
  })

  return recs
}
