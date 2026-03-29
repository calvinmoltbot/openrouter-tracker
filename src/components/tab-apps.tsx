import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ChartBox } from '@/components/chart-box'
import { buildAppCostConfig, buildAppModelConfig } from '@/lib/chart-configs'
import type { ProcessedData } from '@/lib/types'

interface TabAppsProps {
  data: ProcessedData
  colors: Record<string, string>
}

export function TabApps({ data, colors }: TabAppsProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] gap-4 mb-4">
      <Card>
        <CardHeader>
          <CardTitle>Spend by App</CardTitle>
          <CardDescription>Which applications cost money</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartBox id="app-cost" config={buildAppCostConfig(data)} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>App / Model Matrix</CardTitle>
          <CardDescription>Which models each app uses</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartBox id="app-model" config={buildAppModelConfig(data, colors)} />
        </CardContent>
      </Card>
    </div>
  )
}
