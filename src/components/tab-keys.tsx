import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartBox } from '@/components/chart-box'
import { fmt } from '@/lib/format'
import type { ApiKey } from '@/lib/types'
import type { ChartConfiguration } from 'chart.js'
import { PALETTE } from '@/data/colors'

interface TabKeysProps {
  keys: ApiKey[]
}

function buildKeySpendConfig(keys: ApiKey[]): ChartConfiguration {
  const sorted = [...keys].sort((a, b) => b.usage - a.usage)
  return {
    type: 'bar',
    data: {
      labels: sorted.map(k => k.name || k.label || k.hash.slice(0, 12)),
      datasets: [
        {
          label: 'Total Spend',
          data: sorted.map(k => k.usage),
          backgroundColor: sorted.map((_, i) => PALETTE[i % PALETTE.length]),
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { callback: v => '$' + Number(v).toFixed(2) } },
      },
    },
  }
}

function buildKeyMonthlyConfig(keys: ApiKey[]): ChartConfiguration {
  const sorted = [...keys].sort((a, b) => b.usage_monthly - a.usage_monthly)
  return {
    type: 'bar',
    data: {
      labels: sorted.map(k => k.name || k.label || k.hash.slice(0, 12)),
      datasets: [
        {
          label: 'This Month',
          data: sorted.map(k => k.usage_monthly),
          backgroundColor: PALETTE[1],
        },
        {
          label: 'This Week',
          data: sorted.map(k => k.usage_weekly),
          backgroundColor: PALETTE[2],
        },
        {
          label: 'Today',
          data: sorted.map(k => k.usage_daily),
          backgroundColor: PALETTE[0],
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { stacked: false, ticks: { callback: v => '$' + Number(v).toFixed(2) } },
      },
    },
  }
}

export function TabKeys({ keys }: TabKeysProps) {
  if (keys.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No API key data available. Key data is only fetched when connecting via provisioning API key.
        </CardContent>
      </Card>
    )
  }

  const sorted = [...keys].sort((a, b) => b.usage - a.usage)
  const totalUsage = sorted.reduce((s, k) => s + k.usage, 0)

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>API Key Breakdown</CardTitle>
          <CardDescription>Usage per key — identify which keys are driving spend</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Spend</TableHead>
                <TableHead>This Month</TableHead>
                <TableHead>This Week</TableHead>
                <TableHead>Today</TableHead>
                <TableHead>% of Total</TableHead>
                <TableHead>Limit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(k => (
                <TableRow key={k.hash} className={k.disabled ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">
                    {k.name || k.label || k.hash.slice(0, 12)}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${k.disabled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {k.disabled ? 'Disabled' : 'Active'}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold">{fmt(k.usage)}</TableCell>
                  <TableCell>{fmt(k.usage_monthly)}</TableCell>
                  <TableCell>{fmt(k.usage_weekly)}</TableCell>
                  <TableCell>{fmt(k.usage_daily)}</TableCell>
                  <TableCell>{totalUsage > 0 ? ((k.usage / totalUsage) * 100).toFixed(1) + '%' : '—'}</TableCell>
                  <TableCell>{k.limit != null ? fmt(k.limit) : 'None'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Spend by Key</CardTitle>
            <CardDescription>All-time usage per API key</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartBox id="key-total-spend" config={buildKeySpendConfig(keys)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Spend by Period</CardTitle>
            <CardDescription>Monthly / weekly / daily breakdown per key</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartBox id="key-period-spend" config={buildKeyMonthlyConfig(keys)} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
