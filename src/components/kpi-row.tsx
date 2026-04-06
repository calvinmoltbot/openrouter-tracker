'use client'

import { useCountUp } from '@/lib/hooks'
import type { ProcessedData } from '@/lib/types'
import { fmt } from '@/lib/format'

interface KpiRowProps {
  data: ProcessedData
  last7Total: number
  weekTrend: string
  topModel: string
  topPct: string
}

export function KpiRow({ data, last7Total, weekTrend, topModel, topPct }: KpiRowProps) {
  const totalCostAnimated = useCountUp(data.totalCost)
  const topModelCostAnimated = useCountUp(data.modelTotals[topModel]?.cost || 0)
  const last7Animated = useCountUp(last7Total)
  const dailyAvgAnimated = useCountUp(data.totalCost / Math.max(data.days.length, 1))

  const cards = [
    {
      label: 'Total Spend',
      value: fmt(totalCostAnimated),
      sub: `${data.totalCalls.toLocaleString()} API calls`,
      accent: '#ffb2bb',
    },
    {
      label: 'Top Model Cost',
      value: fmt(topModelCostAnimated),
      sub: `${topModel} (${topPct}%)`,
      accent: '#f9a0ab',
    },
    {
      label: 'Last 7 Days',
      value: fmt(last7Animated),
      sub: `${weekTrend}% vs prior 7d`,
      subColor: parseInt(weekTrend) < 0 ? '#f1ffd4' : '#ffb2bb',
      accent: '#909fb4',
    },
    {
      label: 'Daily Avg',
      value: fmt(dailyAvgAnimated),
      sub: `Projected: ~$${(data.totalCost / Math.max(data.days.length, 1) * 30).toFixed(0)}/mo`,
      accent: '#909fb4',
    },
    data.hasLogData && data.totalCacheSavings > 0
      ? {
          label: 'Cache Savings',
          value: fmt(data.totalCacheSavings),
          sub: `${(data.totalCachedTok / 1e6).toFixed(1)}M tokens cached`,
          accent: '#f1ffd4',
        }
      : {
          label: 'Models',
          value: String(data.models.length),
          sub: `${Object.keys(data.apps).length} apps`,
          accent: '#f1ffd4',
        },
  ]

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-4">
      {cards.map(card => (
        <div key={card.label} className="glass-card p-4" style={{ borderLeftWidth: 3, borderLeftColor: card.accent }}>
          <div className="text-[11px] text-muted-foreground uppercase tracking-[0.05em] mb-0.5">{card.label}</div>
          <div className="text-2xl font-bold font-heading">{card.value}</div>
          <div className="text-xs mt-0.5" style={{ color: card.subColor || undefined }}>
            {!card.subColor && <span className="text-muted-foreground">{card.sub}</span>}
            {card.subColor && card.sub}
          </div>
        </div>
      ))}
    </div>
  )
}
