import { Card, CardContent } from '@/components/ui/card'
import type { ProcessedData } from '@/lib/types'
import { fmt } from '@/lib/format'

interface InsightsPanelProps {
  data: ProcessedData
  topModel: string
  weekTrend: string
}

export function InsightsPanel({ data, topModel, weekTrend }: InsightsPanelProps) {
  const sorted = [...data.hourly].sort((a, b) => b.cost - a.cost)
  const top2 = sorted.slice(0, 2)

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 mb-4">
      <Card>
        <CardContent>
          <h4 className="text-sm font-semibold mb-1.5">Top Spender</h4>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            <span className="text-red-500 font-semibold">{topModel}</span> consumed {fmt(data.modelTotals[topModel]?.cost || 0)} across{' '}
            {(data.modelTotals[topModel]?.calls || 0).toLocaleString()} calls at{' '}
            {fmt(data.modelTotals[topModel]?.avgCostPerCall || 0, 6)}/call.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h4 className="text-sm font-semibold mb-1.5">Cron Hotspots</h4>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Busiest hours: {top2.map(h => `${String(h.hour).padStart(2, '0')}:00 UTC (${fmt(h.cost)})`).join(' and ')}. These likely indicate cron job bursts.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h4 className="text-sm font-semibold mb-1.5">Weekly Trend</h4>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {parseInt(weekTrend) < 0
              ? <><span className="text-emerald-500 font-semibold">Spending is down {Math.abs(parseInt(weekTrend))}%</span> vs the prior 7 days.</>
              : <><span className="text-red-500 font-semibold">Spending is up {weekTrend}%</span> vs the prior 7 days.</>
            }
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
