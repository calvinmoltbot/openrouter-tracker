'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartBox } from '@/components/chart-box'
import { buildCostPerCallConfig, buildTokenVolumeConfig, buildEfficiencyScatterConfig } from '@/lib/chart-configs'
import { fmt } from '@/lib/format'
import type { ProcessedData } from '@/lib/types'

interface TabModelsProps {
  data: ProcessedData
  colors: Record<string, string>
  darkMode: boolean
  search?: string
}

export function TabModels({ data, colors, darkMode, search = '' }: TabModelsProps) {
  const hasLog = data.hasLogData
  const lc = search.toLowerCase()
  const filteredModels = lc ? data.models.filter(m => m.toLowerCase().includes(lc)) : data.models

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Model Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="border-0">
            <TableHeader>
              <TableRow className="border-0">
                <TableHead className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium">Model</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium">Cost</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium">Calls</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium">Avg $/call</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium">Prompt Tokens</TableHead>
                {hasLog && <TableHead className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium">Cache Saved</TableHead>}
                {hasLog && <TableHead className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium">Avg Latency</TableHead>}
                {hasLog && <TableHead className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium">Avg TTFT</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModels.map(m => {
                const t = data.modelTotals[m]
                return (
                  <TableRow key={m} className="border-0 even:bg-[rgba(10,24,57,0.3)]">
                    <TableCell className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: colors[m] }} />
                      {m}
                    </TableCell>
                    <TableCell className="font-semibold">{fmt(t.cost, 4)}</TableCell>
                    <TableCell>{t.calls.toLocaleString()}</TableCell>
                    <TableCell>{fmt(t.avgCostPerCall, 6)}</TableCell>
                    <TableCell>{(t.promptTok / 1e6).toFixed(1)}M</TableCell>
                    {hasLog && <TableCell className="text-emerald-600">{t.cacheSavings > 0 ? fmt(t.cacheSavings) : '—'}</TableCell>}
                    {hasLog && <TableCell>{t.latencyCount > 0 ? `${(t.avgLatencyMs / 1000).toFixed(1)}s` : '—'}</TableCell>}
                    {hasLog && <TableCell>{t.latencyCount > 0 ? `${(t.avgTtftMs / 1000).toFixed(1)}s` : '—'}</TableCell>}
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
            <ChartBox id="cost-per-call" config={buildCostPerCallConfig(data, colors, darkMode)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Token Volume</CardTitle>
            <CardDescription>Prompt tokens processed (millions)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartBox id="tokens" config={buildTokenVolumeConfig(data, colors, darkMode)} />
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>Model Efficiency</CardTitle>
            <CardDescription>Cost vs tokens per call — bubble size = call volume</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartBox id="efficiency" config={buildEfficiencyScatterConfig(data, colors, darkMode)} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
