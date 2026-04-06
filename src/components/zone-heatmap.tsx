'use client'

import { useState, useMemo } from 'react'
import { HeatmapGrid, type HeatmapRow } from '@/components/heatmap-grid'
import { fmt } from '@/lib/format'
import type { ProcessedData } from '@/lib/types'

type View = 'spend' | 'model' | 'app' | 'key'

interface ZoneHeatmapProps {
  data: ProcessedData
  colors: Record<string, string>
  darkMode: boolean
}

const views: { id: View; label: string }[] = [
  { id: 'spend', label: 'Spend' },
  { id: 'model', label: 'Model' },
  { id: 'app', label: 'App' },
  { id: 'key', label: 'Key' },
]

export function ZoneHeatmap({ data, colors, darkMode }: ZoneHeatmapProps) {
  const [view, setView] = useState<View>('spend')

  const rows: HeatmapRow[] = useMemo(() => {
    switch (view) {
      case 'spend':
        return [{
          label: 'Total',
          values: data.days.map((_, di) =>
            data.models.reduce((s, m) => s + (data.dailyCost[m]?.[di] || 0), 0)
          ),
        }]

      case 'model':
        return data.models
          .filter(m => (data.modelTotals[m]?.cost || 0) > 0)
          .map(m => ({
            label: m,
            values: data.dailyCost[m] || [],
            color: colors[m],
          }))

      case 'app':
        return Object.entries(data.apps)
          .sort(([, a], [, b]) => b.cost - a.cost)
          .filter(([, v]) => v.cost > 0)
          .map(([name]) => ({
            label: name,
            values: data.dailyAppCost[name] || [],
          }))

      case 'key':
        return Object.entries(data.keyStats)
          .sort(([, a], [, b]) => b.cost - a.cost)
          .filter(([, v]) => v.cost > 0)
          .map(([name]) => ({
            label: name,
            values: data.dailyKeyCost[name] || [],
          }))
    }
  }, [view, data, colors])

  const mode = view === 'spend' ? 'single' : 'multi'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground font-heading">Heatmap Analysis</h2>
          <p className="text-xs text-muted-foreground">
            {data.dateRange} &middot; {view === 'spend' ? 'Daily spend intensity' : `Per-${view} daily breakdown`}
          </p>
        </div>
        <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === v.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend for multi mode */}
      {mode === 'multi' && (
        <div className="flex flex-wrap gap-3 mb-4 text-xs text-muted-foreground">
          {rows.map(r => (
            <div key={r.label} className="flex items-center gap-1.5">
              {r.color && (
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
              )}
              <span>{r.label}</span>
              <span className="opacity-60">({fmt(r.values.reduce((s, v) => s + v, 0))})</span>
            </div>
          ))}
        </div>
      )}

      {/* Heatmap */}
      <div className="glass-card p-4">
        <HeatmapGrid
          days={data.days}
          rows={rows}
          darkMode={darkMode}
          mode={mode}
        />
      </div>

      {/* Summary stats */}
      {mode === 'multi' && rows.length > 0 && (
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          {rows.slice(0, 6).map(r => {
            const total = r.values.reduce((s, v) => s + v, 0)
            const activeDays = r.values.filter(v => v > 0).length
            return (
              <div key={r.label} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2 mb-1">
                  {r.color && (
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: r.color }} />
                  )}
                  <span className="text-sm font-medium text-foreground truncate">{r.label}</span>
                </div>
                <div className="text-lg font-bold text-foreground">{fmt(total)}</div>
                <div className="text-[11px] text-muted-foreground">
                  {activeDays} active day{activeDays !== 1 ? 's' : ''}
                  {activeDays > 0 && ` · ${fmt(total / activeDays, 4)}/day avg`}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
