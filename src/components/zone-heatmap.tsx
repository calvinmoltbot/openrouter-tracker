'use client'

import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
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

function getStatusBadge(activeDays: number, totalDays: number, avgDaily: number, overallAvg: number) {
  const ratio = totalDays > 0 ? activeDays / totalDays : 0
  if (avgDaily > overallAvg * 2) return { label: 'Spiking', color: '#ee7d77' }
  if (ratio > 0.8 && avgDaily <= overallAvg * 1.2) return { label: 'Stable', color: '#909fb4' }
  if (avgDaily <= overallAvg * 0.5) return { label: 'Efficient', color: '#f1ffd4' }
  if (ratio < 0.3) return { label: 'Low-Use', color: '#96a9e6' }
  return { label: 'Active', color: '#ffb2bb' }
}

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

  // Overall daily avg for status badge calculation
  const overallDailyAvg = data.days.length > 0 ? data.totalCost / data.days.length : 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground font-heading">Usage Heatmap Analysis</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.dateRange} &middot; {view === 'spend' ? 'Daily spend velocity' : `Per-${view} intensity matrix`}
          </p>
        </div>
        <div className="flex gap-0.5 p-0.5 rounded-md" style={{ background: darkMode ? '#09122b' : '#f0f2f5' }}>
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-3.5 py-1.5 rounded-sm text-sm font-medium transition-colors ${
                view === v.id
                  ? 'text-[#6b2c36]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={view === v.id ? { background: '#ffb2bb' } : undefined}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section title */}
      <div className="mb-3">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
          {mode === 'single' ? 'Spend Velocity' : `${view.charAt(0).toUpperCase() + view.slice(1)} vs. Date Intensity`}
        </h3>
      </div>

      {/* Heatmap */}
      <div className="glass-card p-5">
        <HeatmapGrid
          days={data.days}
          rows={rows}
          darkMode={darkMode}
          mode={mode}
        />
      </div>

      {/* Cost Vector Cards */}
      {rows.length > 0 && (
        <div className="mt-6">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground mb-3">
            Cost Vectors
          </h3>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            {rows.slice(0, 6).map(r => {
              const total = r.values.reduce((s, v) => s + v, 0)
              const activeDays = r.values.filter(v => v > 0).length
              const avgDaily = activeDays > 0 ? total / activeDays : 0
              const status = getStatusBadge(activeDays, data.days.length, avgDaily, overallDailyAvg)

              // Trend: compare last 3 days avg vs prior 3 days
              const last3 = r.values.slice(-3).reduce((s, v) => s + v, 0) / 3
              const prior3 = r.values.slice(-6, -3).reduce((s, v) => s + v, 0) / 3
              const trendPct = prior3 > 0 ? ((last3 - prior3) / prior3) * 100 : 0

              return (
                <div key={r.label} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {r.color && (
                        <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} />
                      )}
                      <span className="text-sm font-medium text-foreground truncate">{r.label}</span>
                    </div>
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm shrink-0"
                      style={{
                        color: status.color,
                        background: darkMode
                          ? `color-mix(in srgb, ${status.color} 15%, transparent)`
                          : `color-mix(in srgb, ${status.color} 10%, white)`,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold font-heading text-foreground">{fmt(total)}</span>
                    {trendPct !== 0 && (
                      <span className="flex items-center gap-0.5 text-xs" style={{ color: trendPct > 0 ? '#ffb2bb' : '#f1ffd4' }}>
                        {trendPct > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        {Math.abs(Math.round(trendPct))}%
                      </span>
                    )}
                    {trendPct === 0 && prior3 > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Minus className="size-3" /> flat
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-muted-foreground mt-1.5">
                    {activeDays} active day{activeDays !== 1 ? 's' : ''}
                    {activeDays > 0 && <span className="mx-1">·</span>}
                    {activeDays > 0 && `${fmt(avgDaily, 4)}/day avg`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Spend intensity legend (single mode) */}
      {mode === 'single' && (
        <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Less</span>
          {[0.08, 0.2, 0.4, 0.7, 1].map((opacity, i) => (
            <span
              key={i}
              className="inline-block w-3 h-3 rounded-[1px]"
              style={{ background: darkMode ? `rgba(255,178,187,${opacity})` : `rgba(115,50,61,${opacity})` }}
            />
          ))}
          <span>More</span>
        </div>
      )}
    </div>
  )
}
