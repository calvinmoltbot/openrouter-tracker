'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartBox } from '@/components/chart-box'
import { buildAppCostConfig, buildAppModelConfig } from '@/lib/chart-configs'
import { fmt } from '@/lib/format'
import type { ProcessedData } from '@/lib/types'

interface TabAppsProps {
  data: ProcessedData
  colors: Record<string, string>
  darkMode: boolean
  search?: string
}

export function TabApps({ data, colors, darkMode, search = '' }: TabAppsProps) {
  const hasKeys = data.hasLogData && Object.keys(data.keyStats).length > 0
  const lc = search.toLowerCase()
  const appNames = Object.keys(data.apps)
    .sort((a, b) => data.apps[b].cost - data.apps[a].cost)
    .filter(a => !lc || a.toLowerCase().includes(lc))

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>Spend by App</CardTitle>
            <CardDescription>Which applications cost money</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartBox id="app-cost" config={buildAppCostConfig(data, darkMode)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>App / Model Matrix</CardTitle>
            <CardDescription>Which models each app uses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartBox id="app-model" config={buildAppModelConfig(data, colors, darkMode)} />
          </CardContent>
        </Card>
      </div>

      {hasKeys && (
        <>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>App / Key / Model Breakdown</CardTitle>
              <CardDescription>Which keys and models each app uses (from Logs CSV)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>App</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Calls</TableHead>
                    <TableHead>Keys Used</TableHead>
                    <TableHead>Models Used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appNames.map(a => {
                    const app = data.apps[a]
                    const keyEntries = Object.entries(app.keys).sort(([, a], [, b]) => b - a)
                    const modelEntries = Object.entries(app.models).sort(([, a], [, b]) => b - a)
                    return (
                      <TableRow key={a}>
                        <TableCell className="font-medium">{a}</TableCell>
                        <TableCell className="font-semibold">{fmt(app.cost)}</TableCell>
                        <TableCell>{app.calls.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {keyEntries.map(([k, cost]) => (
                              <span key={k} className="text-xs">
                                <span className="font-medium">{k}</span>{' '}
                                <span className="text-muted-foreground">({fmt(cost)})</span>
                              </span>
                            ))}
                            {keyEntries.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {modelEntries.map(([m, cost]) => (
                              <span key={m} className="text-xs">
                                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: colors[m] || '#999' }} />
                                <span className="font-medium">{m}</span>{' '}
                                <span className="text-muted-foreground">({fmt(cost)})</span>
                              </span>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Key / App / Model Breakdown</CardTitle>
              <CardDescription>What each API key is being used for</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>API Key</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Calls</TableHead>
                    <TableHead>Apps</TableHead>
                    <TableHead>Models</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(data.keyStats)
                    .sort(([, a], [, b]) => b.cost - a.cost)
                    .map(([keyName, ks]) => {
                      const appEntries = Object.entries(ks.apps).sort(([, a], [, b]) => b - a)
                      const modelEntries = Object.entries(ks.models).sort(([, a], [, b]) => b - a)
                      return (
                        <TableRow key={keyName}>
                          <TableCell className="font-medium">{keyName}</TableCell>
                          <TableCell className="font-semibold">{fmt(ks.cost)}</TableCell>
                          <TableCell>{ks.calls.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              {appEntries.map(([a, cost]) => (
                                <span key={a} className="text-xs">
                                  <span className="font-medium">{a}</span>{' '}
                                  <span className="text-muted-foreground">({fmt(cost)})</span>
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              {modelEntries.map(([m, cost]) => (
                                <span key={m} className="text-xs">
                                  <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: colors[m] || '#999' }} />
                                  <span className="font-medium">{m}</span>{' '}
                                  <span className="text-muted-foreground">({fmt(cost)})</span>
                                </span>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}
