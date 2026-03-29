import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ChartBox } from '@/components/chart-box'
import { buildHourlyCostConfig, buildHourlyCallsConfig } from '@/lib/chart-configs'
import type { ProcessedData } from '@/lib/types'

interface TabTimingProps {
  data: ProcessedData
}

export function TabTiming({ data }: TabTimingProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] gap-4 mb-4">
      <Card>
        <CardHeader>
          <CardTitle>Cost by Hour of Day (UTC)</CardTitle>
          <CardDescription>When are your cron jobs firing?</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartBox id="hourly-cost" config={buildHourlyCostConfig(data)} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Calls by Hour of Day (UTC)</CardTitle>
          <CardDescription>Call volume reveals scheduling clusters</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartBox id="hourly-calls" config={buildHourlyCallsConfig(data)} />
        </CardContent>
      </Card>
    </div>
  )
}
