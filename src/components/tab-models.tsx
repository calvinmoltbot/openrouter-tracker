import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartBox } from '@/components/chart-box'
import { buildCostPerCallConfig, buildTokenVolumeConfig } from '@/lib/chart-configs'
import { fmt } from '@/lib/format'
import type { ProcessedData } from '@/lib/types'

interface TabModelsProps {
  data: ProcessedData
  colors: Record<string, string>
}

export function TabModels({ data, colors }: TabModelsProps) {
  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Model Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Calls</TableHead>
                <TableHead>Avg $/call</TableHead>
                <TableHead>Prompt Tokens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.models.map(m => {
                const t = data.modelTotals[m]
                return (
                  <TableRow key={m}>
                    <TableCell className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: colors[m] }} />
                      {m}
                    </TableCell>
                    <TableCell className="font-semibold">{fmt(t.cost, 4)}</TableCell>
                    <TableCell>{t.calls.toLocaleString()}</TableCell>
                    <TableCell>{fmt(t.avgCostPerCall, 6)}</TableCell>
                    <TableCell>{(t.promptTok / 1e6).toFixed(1)}M</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>Cost per API Call</CardTitle>
            <CardDescription>Average cost efficiency by model</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartBox id="cost-per-call" config={buildCostPerCallConfig(data, colors)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Token Volume</CardTitle>
            <CardDescription>Prompt tokens processed (millions)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartBox id="tokens" config={buildTokenVolumeConfig(data, colors)} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
