/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useMemo } from 'react'
import { TileWrapper } from '@/components/tiles/tile-wrapper'
import { ExecutiveSummary } from '@/components/executive-summary'
import { BudgetBar } from '@/components/budget-bar'
import { KpiRow } from '@/components/kpi-row'
import { ChartBox } from '@/components/chart-box'
import { CostHeatmap } from '@/components/cost-heatmap'
import { InsightsPanel } from '@/components/insights-panel'
import { RecommendationsPanel } from '@/components/recommendations-panel'
import { TileAppUsage } from '@/components/tiles/tile-app-usage'
import { TileAnomalies } from '@/components/tiles/tile-anomalies'
import { TileHourlyPatterns } from '@/components/tiles/tile-hourly-patterns'
import { buildDailyCostConfig, buildWeeklyConfig } from '@/lib/chart-configs'
import { processRows } from '@/data/processor'
// buildColorMap used in parent — colors passed as prop
import { fmt } from '@/lib/format'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { ProcessedData, RawActivityRow } from '@/lib/types'
import type { BudgetPeriod } from '@/lib/telegram'
import type { ChartConfiguration } from 'chart.js'

interface ZoneDashboardProps {
  data: ProcessedData
  fullData: ProcessedData | null
  prevData: ProcessedData | null
  rawRows: RawActivityRow[]
  colors: Record<string, string>
  darkMode: boolean
  budget: number
  period: BudgetPeriod
  daysInPeriod: number
  daysElapsed: number
  onBudgetChange: (v: number) => void
  onPeriodChange: (p: BudgetPeriod) => void
  thresholds: number[]
  compare: boolean
  // KPI props
  last7Total: number
  weekTrend: string
  topModel: string
  topPct: string
}

/* ---------- helpers for today's data ---------- */

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function yesterdayStr() {
  const d = new Date(Date.now() - 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function filterByDay(rows: RawActivityRow[], day: string): RawActivityRow[] {
  return rows.filter(r => (r.created_at || '').slice(0, 10) === day)
}

function filterLast7Days(rows: RawActivityRow[]): RawActivityRow[] {
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const today = todayStr()
  return rows.filter(r => {
    const d = (r.created_at || '').slice(0, 10)
    return d >= cutoff && d < today
  })
}

function DeltaBadge({ current, previous, label }: { current: number; previous: number; label: string }) {
  if (previous === 0 && current === 0) return <span className="text-xs text-muted-foreground">{label}: --</span>
  const delta = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0
  const isUp = delta > 5
  const isDown = delta < -5
  return (
    <div className="flex items-center gap-1 text-sm">
      {isUp ? <TrendingUp className="size-3.5 text-primary" /> : isDown ? <TrendingDown className="size-3.5 text-[#f1ffd4]" /> : <Minus className="size-3.5 text-muted-foreground" />}
      <span className={isUp ? 'text-primary' : isDown ? 'text-[#f1ffd4]' : 'text-muted-foreground'}>
        {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
      </span>
      <span className="text-muted-foreground text-xs">{label} ({fmt(previous)})</span>
    </div>
  )
}

/* ---------- helpers for theme ---------- */

function themeColors(darkMode: boolean) {
  return {
    gridColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    tickColor: darkMode ? '#9ca3af' : '#6b7280',
    tooltipBg: darkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
    tooltipTitleColor: darkMode ? '#f3f4f6' : '#111827',
    tooltipBodyColor: darkMode ? '#d1d5db' : '#374151',
  }
}

export function ZoneDashboard({
  data,
  fullData,
  prevData,
  rawRows,
  colors,
  darkMode,
  budget,
  period,
  daysInPeriod,
  daysElapsed,
  onBudgetChange,
  onPeriodChange,
  thresholds,
  compare,
  last7Total,
  weekTrend,
  topModel,
  topPct,
}: ZoneDashboardProps) {
  /* ---------- Today's hourly chart ---------- */
  const today = todayStr()
  const yesterday = yesterdayStr()

  const todayData = useMemo(() => processRows(filterByDay(rawRows, today)), [rawRows, today])
  const yesterdayData = useMemo(() => processRows(filterByDay(rawRows, yesterday)), [rawRows, yesterday])
  const last7Data = useMemo(() => processRows(filterLast7Days(rawRows)), [rawRows])

  const avg7Cost = last7Data.totalCost / 7
  const currentHour = new Date().getHours()

  const hourlyConfig = useMemo(() => {
    const tc = themeColors(darkMode)
    const barColors = todayData.hourly.map(h =>
      h.hour > currentHour ? 'rgba(100,100,100,0.2)' :
        h.cost > 2 ? '#ffb2bbcc' : h.cost > 0.5 ? '#f9a0abcc' : '#909fb4cc'
    )
    return {
      type: 'bar',
      data: {
        labels: todayData.hourly.map(h => `${String(h.hour).padStart(2, '0')}:00`),
        datasets: [{
          label: 'Cost',
          data: todayData.hourly.map(h => h.cost),
          backgroundColor: barColors,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tc.tooltipBg, titleColor: tc.tooltipTitleColor, bodyColor: tc.tooltipBodyColor,
            callbacks: { label: (ctx: any) => `${fmt(ctx.parsed.y, 4)} (${todayData.hourly[ctx.dataIndex].calls} calls)` },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 }, color: tc.tickColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
          y: { grid: { color: tc.gridColor }, ticks: { callback: (v: any) => '$' + v, color: tc.tickColor } },
        },
      },
    }
  }, [todayData, currentHour, darkMode])

  /* ---------- Daily cost chart with comparison overlay ---------- */
  const dailyCostConfig = useMemo(() => {
    const base = buildDailyCostConfig(data, colors, darkMode) as ChartConfiguration<'bar'>

    if (!compare || !prevData || prevData.days.length === 0) return base

    const prevDailyTotals = data.days.map((_, i) => {
      if (i >= prevData.days.length) return null
      return prevData.models.reduce((sum, m) => sum + (prevData.dailyCost[m]?.[i] || 0), 0)
    })

    const datasets = base.data?.datasets ?? []
    datasets.push({
      label: 'Prev Period',
      type: 'line' as const,
      data: prevDailyTotals,
      borderColor: darkMode ? '#94a3b8' : '#64748b',
      borderWidth: 2,
      borderDash: [6, 3],
      pointRadius: 0,
      fill: false,
      yAxisID: 'y',
      stack: undefined,
      order: -1,
    } as any)

    return base
  }, [data, prevData, colors, darkMode, compare])

  /* ---------- Weekly trend chart ---------- */
  const weeklyConfig = useMemo(() => buildWeeklyConfig(data, colors, darkMode), [data, colors, darkMode])

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Row 1: Executive Summary (full width) */}
      <div className="col-span-12">
        <ExecutiveSummary data={data} fullData={fullData} budget={budget} />
      </div>

      {/* Row 2: Budget Bar + Today's Hourly */}
      <div className="col-span-12 lg:col-span-5">
        <TileWrapper>
          <BudgetBar
            spent={data.totalCost}
            budget={budget}
            period={period}
            daysInPeriod={daysInPeriod}
            daysElapsed={daysElapsed}
            onChange={onBudgetChange}
            onPeriodChange={onPeriodChange}
            thresholds={thresholds}
          />
        </TileWrapper>
      </div>
      <div className="col-span-12 lg:col-span-7">
        <TileWrapper>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">Today&apos;s Spend</h3>
            <span className="text-xs text-muted-foreground">{fmt(todayData.totalCost)} &middot; {todayData.totalCalls} calls</span>
          </div>
          <ChartBox id="zone-today-hourly" config={hourlyConfig} height={180} />
          <div className="flex flex-wrap gap-4 mt-2">
            <DeltaBadge current={todayData.totalCost} previous={yesterdayData.totalCost} label="vs yesterday" />
            <DeltaBadge current={todayData.totalCost} previous={avg7Cost} label="vs 7-day avg" />
          </div>
        </TileWrapper>
      </div>

      {/* Row 3: Daily Cost hero chart (full width) */}
      <div className="col-span-12">
        <TileWrapper>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Daily Cost by Model</h3>
              <p className="text-xs text-muted-foreground">
                Stacked bars showing which models drive spend each day
                {compare && prevData && prevData.days.length > 0 && (
                  <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    Dashed line = previous period
                  </span>
                )}
              </p>
            </div>
          </div>
          <ChartBox id="zone-daily-cost" config={dailyCostConfig} height={320} />
        </TileWrapper>
      </div>

      {/* Row 4: App Usage (prominent) + KPI Row */}
      <div className="col-span-12 lg:col-span-7">
        <TileWrapper prominent>
          <TileAppUsage data={data} darkMode={darkMode} />
        </TileWrapper>
      </div>
      <div className="col-span-12 lg:col-span-5">
        <TileWrapper>
          <KpiRow data={data} last7Total={last7Total} weekTrend={weekTrend} topModel={topModel} topPct={topPct} />
        </TileWrapper>
      </div>

      {/* Row 5: Cost Heatmap + Weekly Trend */}
      <div className="col-span-12 lg:col-span-8">
        <TileWrapper>
          <CostHeatmap data={data} darkMode={darkMode} colors={colors} />
        </TileWrapper>
      </div>
      <div className="col-span-12 lg:col-span-4">
        <TileWrapper>
          <h3 className="text-sm font-semibold text-foreground mb-2">Weekly Trend</h3>
          <ChartBox id="zone-weekly" config={weeklyConfig} height={220} />
        </TileWrapper>
      </div>

      {/* Row 6: Hourly Patterns + Anomalies */}
      <div className="col-span-12 lg:col-span-6">
        <TileWrapper>
          <TileHourlyPatterns data={data} darkMode={darkMode} />
        </TileWrapper>
      </div>
      <div className="col-span-12 lg:col-span-6">
        <TileWrapper>
          <TileAnomalies data={data} />
        </TileWrapper>
      </div>

      {/* Row 7: Recommendations + Insights */}
      <div className="col-span-12 lg:col-span-8">
        <TileWrapper>
          <RecommendationsPanel data={data} budget={budget} />
        </TileWrapper>
      </div>
      <div className="col-span-12 lg:col-span-4">
        <TileWrapper>
          <InsightsPanel data={data} topModel={topModel} weekTrend={weekTrend} />
        </TileWrapper>
      </div>
    </div>
  )
}
