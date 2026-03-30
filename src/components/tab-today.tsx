'use client'

import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ChartBox } from '@/components/chart-box'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Clock, Zap } from 'lucide-react'
import { fmt, fmtK } from '@/lib/format'
import { processRows } from '@/data/processor'
import { buildColorMap } from '@/data/colors'
import type { RawActivityRow } from '@/lib/types'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface TabTodayProps {
  rawRows: RawActivityRow[]
  darkMode: boolean
  dailyBudget: number
}

function themeColors(darkMode: boolean) {
  return {
    gridColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    tickColor: darkMode ? '#9ca3af' : '#6b7280',
    tooltipBg: darkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
    tooltipTitleColor: darkMode ? '#f3f4f6' : '#111827',
    tooltipBodyColor: darkMode ? '#d1d5db' : '#374151',
  }
}

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
  if (previous === 0 && current === 0) return <span className="text-xs text-muted-foreground">{label}: —</span>
  const delta = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0
  const isUp = delta > 5
  const isDown = delta < -5
  return (
    <div className="flex items-center gap-1 text-sm">
      {isUp ? <TrendingUp className="size-3.5 text-red-500" /> : isDown ? <TrendingDown className="size-3.5 text-emerald-500" /> : <Minus className="size-3.5 text-muted-foreground" />}
      <span className={isUp ? 'text-red-500' : isDown ? 'text-emerald-500' : 'text-muted-foreground'}>
        {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
      </span>
      <span className="text-muted-foreground text-xs">{label} ({fmt(previous)})</span>
    </div>
  )
}

export function TabToday({ rawRows, darkMode, dailyBudget }: TabTodayProps) {
  const today = todayStr()
  const yesterday = yesterdayStr()

  const todayData = useMemo(() => processRows(filterByDay(rawRows, today)), [rawRows, today])
  const yesterdayData = useMemo(() => processRows(filterByDay(rawRows, yesterday)), [rawRows, yesterday])
  const last7Data = useMemo(() => processRows(filterLast7Days(rawRows)), [rawRows])

  const avg7Cost = last7Data.totalCost / 7
  const avg7Calls = last7Data.totalCalls / 7

  const currentHour = new Date().getHours()
  const hourlyPace = currentHour > 0 ? (todayData.totalCost / currentHour) * 24 : 0
  const onTrack = dailyBudget > 0 && hourlyPace > dailyBudget

  const colors = buildColorMap(todayData.models)
  const tc = themeColors(darkMode)

  // Hourly cost chart config
  const hourlyConfig = useMemo(() => {
    const barColors = todayData.hourly.map(h =>
      h.hour > currentHour ? 'rgba(100,100,100,0.2)' :
        h.cost > 2 ? '#ef4444cc' : h.cost > 0.5 ? '#f59e0bcc' : '#3b82f6cc'
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
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: tc.tickColor } },
          y: { grid: { color: tc.gridColor }, ticks: { callback: (v: any) => '$' + v, color: tc.tickColor } },
        },
      },
    }
  }, [todayData, currentHour, tc])

  // Model breakdown sorted by today's cost
  const modelsSorted = [...todayData.models].sort((a, b) => (todayData.modelTotals[b]?.cost || 0) - (todayData.modelTotals[a]?.cost || 0))

  // App breakdown
  const appsSorted = Object.entries(todayData.apps).sort(([, a], [, b]) => b.cost - a.cost)

  // Key breakdown
  const keysSorted = Object.entries(todayData.keyStats).sort(([, a], [, b]) => b.cost - a.cost)

  // Executive summary text
  const summaryParts: string[] = []
  if (todayData.totalCost === 0) {
    summaryParts.push('No spend recorded yet today.')
  } else {
    summaryParts.push(`You've spent ${fmt(todayData.totalCost)} across ${todayData.totalCalls.toLocaleString()} calls so far today.`)
    if (modelsSorted[0]) {
      const topCost = todayData.modelTotals[modelsSorted[0]]?.cost || 0
      summaryParts.push(`${modelsSorted[0]} is leading at ${fmt(topCost)}.`)
    }
    if (onTrack) {
      summaryParts.push(`At the current pace, you'll hit ${fmt(hourlyPace)} by end of day — ${fmt(hourlyPace - dailyBudget)} over budget.`)
    } else if (dailyBudget > 0) {
      summaryParts.push(`On track to finish under the ${fmt(dailyBudget)} daily budget.`)
    }
  }

  return (
    <div className="space-y-4">
      {/* Executive summary banner */}
      <Card className={onTrack ? 'border-red-500/50' : ''}>
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            {onTrack && <AlertTriangle className="size-5 text-red-500 mt-0.5 shrink-0" />}
            <div>
              <p className="text-sm font-medium">{summaryParts.join(' ')}</p>
              <div className="flex flex-wrap gap-4 mt-2">
                <DeltaBadge current={todayData.totalCost} previous={yesterdayData.totalCost} label="vs yesterday" />
                <DeltaBadge current={todayData.totalCost} previous={avg7Cost} label="vs 7-day avg" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground mb-1">Today's Spend</div>
            <div className="text-2xl font-bold">{fmt(todayData.totalCost)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Clock className="size-3" /> Calls</div>
            <div className="text-2xl font-bold">{todayData.totalCalls.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">avg {Math.round(avg7Calls)}/day</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Zap className="size-3" /> Projected</div>
            <div className={`text-2xl font-bold ${onTrack ? 'text-red-500' : ''}`}>{fmt(hourlyPace)}</div>
            {dailyBudget > 0 && <div className="text-xs text-muted-foreground">budget {fmt(dailyBudget)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground mb-1">Models Active</div>
            <div className="text-2xl font-bold">{todayData.models.length}</div>
            <div className="text-xs text-muted-foreground">{appsSorted.length} apps</div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly cost chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Hourly Spend</CardTitle>
          <CardDescription>Cost per hour today (UTC). Grey bars = future hours.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartBox id="today-hourly" config={hourlyConfig} height={250} />
        </CardContent>
      </Card>

      {/* Model + App tables side by side */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Per-model table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Per Model</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelsSorted.map(m => {
                  const t = todayData.modelTotals[m]
                  if (!t) return null
                  return (
                    <TableRow key={m}>
                      <TableCell className="flex items-center gap-2">
                        <span className="inline-block size-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[m] }} />
                        <span className="truncate text-sm">{m}</span>
                      </TableCell>
                      <TableCell className="text-right text-sm">{fmt(t.cost)}</TableCell>
                      <TableCell className="text-right text-sm">{t.calls.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">{fmtK(t.promptTok + t.complTok)}</TableCell>
                    </TableRow>
                  )
                })}
                {modelsSorted.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm">No data yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Per-app table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Per App</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appsSorted.map(([name, stats]) => (
                  <TableRow key={name}>
                    <TableCell className="truncate text-sm">{name}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(stats.cost)}</TableCell>
                    <TableCell className="text-right text-sm">{stats.calls.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {appsSorted.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground text-sm">No data yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Per-key table (if any keys tracked) */}
      {keysSorted.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Per API Key</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keysSorted.map(([name, stats]) => (
                  <TableRow key={name}>
                    <TableCell className="truncate text-sm font-mono">{name}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(stats.cost)}</TableCell>
                    <TableCell className="text-right text-sm">{stats.calls.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
