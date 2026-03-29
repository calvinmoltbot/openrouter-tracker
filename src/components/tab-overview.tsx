import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ChartBox } from '@/components/chart-box'
import { CostHeatmap } from '@/components/cost-heatmap'
import { InsightsPanel } from '@/components/insights-panel'
import { buildDailyCostConfig, buildPieConfig, buildWeeklyConfig } from '@/lib/chart-configs'
import type { ProcessedData } from '@/lib/types'
import type { ChartConfiguration } from 'chart.js'

interface TabOverviewProps {
  data: ProcessedData
  prevData?: ProcessedData | null
  colors: Record<string, string>
  topModel: string
  weekTrend: string
  darkMode: boolean
  compare?: boolean
}

export function TabOverview({ data, prevData, colors, topModel, weekTrend, darkMode, compare }: TabOverviewProps) {
  const dailyCostConfig = useMemo(() => {
    const base = buildDailyCostConfig(data, colors, darkMode) as ChartConfiguration<'bar'>

    if (!compare || !prevData || prevData.days.length === 0) return base

    // Compute previous period daily totals aligned to current period days
    const prevDailyTotals = data.days.map((_, i) => {
      if (i >= prevData.days.length) return null
      return prevData.models.reduce((sum, m) => sum + (prevData.dailyCost[m]?.[i] || 0), 0)
    })

    // Add a dashed line dataset for previous period totals
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    return base
  }, [data, prevData, colors, darkMode, compare])

  return (
    <>
      <div className="grid grid-cols-1 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>Daily Cost by Model</CardTitle>
            <CardDescription>
              Stacked bars showing which models drive spend each day
              {compare && prevData && prevData.days.length > 0 && (
                <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Dashed line = previous period
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartBox id="daily-cost" config={dailyCostConfig} />
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>Cost Share by Model</CardTitle>
            <CardDescription>Total spend breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartBox id="pie" config={buildPieConfig(data, colors, darkMode)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weekly Cost Trend</CardTitle>
            <CardDescription>Week-over-week by model</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartBox id="weekly" config={buildWeeklyConfig(data, colors, darkMode)} />
          </CardContent>
        </Card>
      </div>
      <div className="mb-4">
        <CostHeatmap data={data} darkMode={darkMode} />
      </div>
      <InsightsPanel data={data} topModel={topModel} weekTrend={weekTrend} />
    </>
  )
}
