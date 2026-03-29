import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ChartBox } from '@/components/chart-box'
import { InsightsPanel } from '@/components/insights-panel'
import { buildDailyCostConfig, buildPieConfig, buildWeeklyConfig } from '@/lib/chart-configs'
import type { ProcessedData } from '@/lib/types'

interface TabOverviewProps {
  data: ProcessedData
  colors: Record<string, string>
  topModel: string
  weekTrend: string
}

export function TabOverview({ data, colors, topModel, weekTrend }: TabOverviewProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>Daily Cost by Model</CardTitle>
            <CardDescription>Stacked bars showing which models drive spend each day</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartBox id="daily-cost" config={buildDailyCostConfig(data, colors)} />
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
            <ChartBox id="pie" config={buildPieConfig(data, colors)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weekly Cost Trend</CardTitle>
            <CardDescription>Week-over-week by model</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartBox id="weekly" config={buildWeeklyConfig(data, colors)} />
          </CardContent>
        </Card>
      </div>
      <InsightsPanel data={data} topModel={topModel} weekTrend={weekTrend} />
    </>
  )
}
