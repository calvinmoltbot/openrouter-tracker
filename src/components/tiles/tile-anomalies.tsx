'use client'

import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { fmt } from '@/lib/format'
import type { ProcessedData } from '@/lib/types'

interface TileAnomaliesProps {
  data: ProcessedData
}

export function TileAnomalies({ data }: TileAnomaliesProps) {
  const { anomalies, avgDailyCost } = useMemo(() => {
    if (data.days.length === 0) return { anomalies: [], avgDailyCost: 0 }

    const dailyCosts = data.days.map((_, i) =>
      data.models.reduce((sum, m) => sum + (data.dailyCost[m]?.[i] || 0), 0)
    )
    const avg = dailyCosts.reduce((a, b) => a + b, 0) / dailyCosts.length

    const anom = data.days
      .map((day, i) => ({ day, cost: dailyCosts[i], multiplier: dailyCosts[i] / avg }))
      .filter(d => d.multiplier >= 2)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5)

    return { anomalies: anom, avgDailyCost: avg }
  }, [data])

  const maxCost = anomalies[0]?.cost || 1

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="size-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">Anomaly Days</h3>
        <span className="text-xs text-muted-foreground">(2x+ avg of {fmt(avgDailyCost)})</span>
      </div>
      {anomalies.length === 0 ? (
        <p className="text-xs text-muted-foreground">No spending anomalies detected — usage is consistent.</p>
      ) : (
        <div className="space-y-2">
          {anomalies.map(a => (
            <div key={a.day} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 shrink-0">{a.day.slice(5)}</span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500/80"
                  style={{ width: `${(a.cost / maxCost) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-foreground w-14 text-right">{fmt(a.cost)}</span>
              <span className="text-[10px] text-amber-500 font-medium w-8">{a.multiplier.toFixed(1)}x</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
