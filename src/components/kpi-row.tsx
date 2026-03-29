import { Card, CardContent } from '@/components/ui/card'
import type { ProcessedData } from '@/lib/types'
import { fmt } from '@/lib/format'

interface KpiRowProps {
  data: ProcessedData
  last7Total: number
  weekTrend: string
  topModel: string
  topPct: string
}

export function KpiRow({ data, last7Total, weekTrend, topModel, topPct }: KpiRowProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-4">
      <Card className="border-l-4 border-l-red-500">
        <CardContent>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Total Spend</div>
          <div className="text-2xl font-bold">{fmt(data.totalCost)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{data.totalCalls.toLocaleString()} API calls</div>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-amber-500">
        <CardContent>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Top Model Cost</div>
          <div className="text-2xl font-bold">{fmt(data.modelTotals[topModel]?.cost || 0)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{topModel} ({topPct}%)</div>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-blue-500">
        <CardContent>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Last 7 Days</div>
          <div className="text-2xl font-bold">{fmt(last7Total)}</div>
          <div className="text-xs mt-0.5" style={{ color: parseInt(weekTrend) < 0 ? '#10b981' : '#ef4444' }}>
            {weekTrend}% vs prior 7d
          </div>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-blue-500">
        <CardContent>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Daily Avg</div>
          <div className="text-2xl font-bold">{fmt(data.totalCost / Math.max(data.days.length, 1))}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Projected: ~${(data.totalCost / Math.max(data.days.length, 1) * 30).toFixed(0)}/mo
          </div>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-emerald-500">
        <CardContent>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Models</div>
          <div className="text-2xl font-bold">{data.models.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{Object.keys(data.apps).length} apps</div>
        </CardContent>
      </Card>
    </div>
  )
}
