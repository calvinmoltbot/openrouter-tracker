'use client'

import { useMemo } from 'react'
import { HeatmapGrid, type HeatmapRow } from '@/components/heatmap-grid'
import type { ProcessedData } from '@/lib/types'

interface CostHeatmapProps {
  data: ProcessedData
  darkMode: boolean
  colors?: Record<string, string>
}

export function CostHeatmap({ data, darkMode }: CostHeatmapProps) {
  const rows: HeatmapRow[] = useMemo(() => [{
    label: 'Total',
    values: data.days.map((_, di) =>
      data.models.reduce((s, m) => s + (data.dailyCost[m]?.[di] || 0), 0)
    ),
  }], [data])

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">Spend Heatmap</h3>
        <p className="text-xs text-muted-foreground">Daily spend intensity across the date range</p>
      </div>
      <HeatmapGrid days={data.days} rows={rows} darkMode={darkMode} mode="single" />
    </div>
  )
}
