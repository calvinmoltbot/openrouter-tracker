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
  const topModelData = data.modelTotals[topModel]

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 mb-4">
      <Card>
        <CardContent>
          <h4 className="text-sm font-semibold mb-1.5">Top Spender</h4>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            <span className="text-red-500 font-semibold">{topModel}</span> consumed {fmt(topModelData?.cost || 0)} across{' '}
            {(topModelData?.calls || 0).toLocaleString()} calls at{' '}
            {fmt(topModelData?.avgCostPerCall || 0, 6)}/call.
            {data.hasLogData && topModelData?.avgLatencyMs > 0 && (
              <> Avg latency: {(topModelData.avgLatencyMs / 1000).toFixed(1)}s.</>
            )}
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
      {data.hasLogData && data.totalCacheSavings > 0 && (
        <Card>
          <CardContent>
            <h4 className="text-sm font-semibold mb-1.5">Cache Efficiency</h4>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              <span className="text-emerald-500 font-semibold">{fmt(data.totalCacheSavings)} saved</span> from prompt caching across{' '}
              {(data.totalCachedTok / 1e6).toFixed(1)}M cached tokens.
              {data.totalReasoningTok > 0 && <> {(data.totalReasoningTok / 1e6).toFixed(1)}M reasoning tokens used.</>}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
