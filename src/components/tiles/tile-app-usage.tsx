/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useMemo } from 'react'
import { ChartBox } from '@/components/chart-box'
import { fmt } from '@/lib/format'
import { PALETTE } from '@/data/colors'
import type { ProcessedData } from '@/lib/types'

interface TileAppUsageProps {
  data: ProcessedData
  darkMode: boolean
}

export function TileAppUsage({ data, darkMode }: TileAppUsageProps) {
  const appsSorted = useMemo(() =>
    Object.entries(data.apps)
      .sort(([, a], [, b]) => b.cost - a.cost)
      .slice(0, 8),
    [data.apps]
  )

  const maxCost = appsSorted[0]?.[1].cost || 1

  const config = useMemo(() => {
    const tc = {
      tooltipBg: darkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
      tooltipTitleColor: darkMode ? '#f3f4f6' : '#111827',
      tooltipBodyColor: darkMode ? '#d1d5db' : '#374151',
      borderColor: darkMode ? 'rgba(255,255,255,0.15)' : '#fff',
    }
    return {
      type: 'doughnut',
      data: {
        labels: appsSorted.map(([name]) => name),
        datasets: [{
          data: appsSorted.map(([, s]) => s.cost),
          backgroundColor: appsSorted.map((_, i) => PALETTE[i % PALETTE.length] + 'cc'),
          borderWidth: 2,
          borderColor: tc.borderColor,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tc.tooltipBg,
            titleColor: tc.tooltipTitleColor,
            bodyColor: tc.tooltipBodyColor,
            callbacks: {
              label: (ctx: any) => {
                const total = (ctx.dataset.data as number[]).reduce((a: number, b: number) => a + b, 0)
                return `${ctx.label}: ${fmt(ctx.parsed as unknown as number)} (${((ctx.parsed as unknown as number) / total * 100).toFixed(1)}%)`
              }
            }
          }
        }
      }
    }
  }, [appsSorted, darkMode])

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3">Usage by App</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-[200px]">
          <ChartBox id="app-usage-doughnut" config={config} height={200} />
        </div>
        <div className="flex flex-col gap-1.5 justify-center">
          {appsSorted.map(([name, stats], i) => (
            <div key={name} className="flex items-center gap-2">
              <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
              <span className="text-xs text-foreground truncate flex-1">{name}</span>
              <span className="text-xs font-medium text-foreground">{fmt(stats.cost)}</span>
            </div>
          ))}
          {appsSorted.length === 0 && (
            <span className="text-xs text-muted-foreground">No app data</span>
          )}
        </div>
      </div>
      {/* Cost bars underneath */}
      <div className="mt-3 space-y-1.5">
        {appsSorted.slice(0, 5).map(([name, stats], i) => (
          <div key={name} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-20 truncate">{name}</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(stats.cost / maxCost) * 100}%`,
                  backgroundColor: PALETTE[i % PALETTE.length],
                }}
              />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground w-12 text-right">{fmt(stats.cost)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
