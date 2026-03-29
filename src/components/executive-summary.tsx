import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useCountUp } from '@/lib/hooks'
import { fmt } from '@/lib/format'
import type { ProcessedData } from '@/lib/types'

interface ExecutiveSummaryProps {
  data: ProcessedData
  fullData: ProcessedData | null
  budget: number
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function sumCostForMonth(data: ProcessedData, monthKey: string): number {
  let total = 0
  for (let i = 0; i < data.days.length; i++) {
    if (data.days[i].slice(0, 7) === monthKey) {
      for (const m of data.models) {
        total += data.dailyCost[m]?.[i] || 0
      }
    }
  }
  return total
}

export function ExecutiveSummary({ data, fullData, budget }: ExecutiveSummaryProps) {
  const { currentMonthKey, prevMonthKey, dayOfMonth, daysInMonth } = useMemo(() => {
    const n = new Date()
    const curKey = getMonthKey(n)
    const prevDate = new Date(n.getFullYear(), n.getMonth() - 1, 1)
    const prevKey = getMonthKey(prevDate)
    const dim = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate()
    return { currentMonthKey: curKey, prevMonthKey: prevKey, dayOfMonth: n.getDate(), daysInMonth: dim }
  }, [])

  const { currentMonthCost, prevMonthCost, hasPrevMonth } = useMemo(() => {
    const source = fullData || data
    const cur = sumCostForMonth(source, currentMonthKey)
    const prev = sumCostForMonth(source, prevMonthKey)
    const hasPrev = source.days.some(d => d.slice(0, 7) === prevMonthKey)
    return { currentMonthCost: cur, prevMonthCost: prev, hasPrevMonth: hasPrev }
  }, [data, fullData, currentMonthKey, prevMonthKey])

  // Use current month cost if we have data for it, otherwise fall back to filtered total
  const displayCost = currentMonthCost > 0 ? currentMonthCost : data.totalCost

  const delta = hasPrevMonth && prevMonthCost > 0
    ? ((currentMonthCost - prevMonthCost) / prevMonthCost) * 100
    : null

  // Top cost driver
  const topModel = data.models[0]
  const topModelStats = topModel ? data.modelTotals[topModel] : null
  const topModelPct = topModelStats && data.totalCost > 0
    ? Math.round((topModelStats.cost / data.totalCost) * 100)
    : 0

  // Projected spend
  const projected = useMemo(() => {
    if (dayOfMonth === 0 || currentMonthCost === 0) return 0
    const dailyAvg = currentMonthCost / dayOfMonth
    return dailyAvg * daysInMonth
  }, [currentMonthCost, dayOfMonth, daysInMonth])

  // Animated values
  const animatedCost = useCountUp(displayCost, 1000)
  const animatedProjected = useCountUp(projected, 1000)

  // Projection color
  const projectionColor = projected > budget
    ? 'text-red-500'
    : hasPrevMonth && projected > prevMonthCost
      ? 'text-amber-500'
      : 'text-emerald-500'

  return (
    <div className="mb-4 rounded-xl border border-border bg-gradient-to-br from-card to-muted/50 p-5 sm:p-6 backdrop-blur-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {/* Block 1: How much this month? */}
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            How much this month?
          </div>
          <div className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            {fmt(animatedCost)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-sm">
            {delta !== null ? (
              <>
                {delta > 0 ? (
                  <TrendingUp className="size-4 text-red-500" />
                ) : delta < 0 ? (
                  <TrendingDown className="size-4 text-emerald-500" />
                ) : (
                  <Minus className="size-4 text-muted-foreground" />
                )}
                <span className={delta > 0 ? 'text-red-500' : delta < 0 ? 'text-emerald-500' : 'text-muted-foreground'}>
                  {delta > 0 ? 'Up' : delta < 0 ? 'Down' : 'Flat'} {Math.abs(Math.round(delta))}% from last month
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">First month of data</span>
            )}
          </div>
        </div>

        {/* Block 2: What's eating the money? */}
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            What&apos;s eating the money?
          </div>
          {topModel ? (
            <>
              <div className="text-xl sm:text-2xl font-semibold text-foreground">
                {topModel} is {topModelPct}% of your bill
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {fmt(topModelStats?.cost || 0)} across {(topModelStats?.calls || 0).toLocaleString()} calls
              </div>
            </>
          ) : (
            <div className="text-xl text-muted-foreground">No model data yet</div>
          )}
        </div>

        {/* Block 3: Is it getting worse? */}
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Is it getting worse?
          </div>
          {projected > 0 ? (
            <>
              <div className={`text-xl sm:text-2xl font-semibold ${projectionColor}`}>
                On track to spend {fmt(animatedProjected)}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Based on daily average so far this month
              </div>
            </>
          ) : (
            <div className="text-xl text-muted-foreground">Not enough data to project</div>
          )}
        </div>
      </div>
    </div>
  )
}
