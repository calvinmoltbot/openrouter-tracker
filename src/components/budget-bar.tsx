'use client'

import { Input } from '@/components/ui/input'
import { fmt } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BudgetPeriod } from '@/lib/telegram'

const PERIODS: { key: BudgetPeriod; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
]

interface BudgetBarProps {
  spent: number
  budget: number
  period: BudgetPeriod
  daysInPeriod: number
  daysElapsed: number
  onChange: (v: number) => void
  onPeriodChange: (p: BudgetPeriod) => void
  thresholds: number[]
}

export function BudgetBar({
  spent,
  budget,
  period,
  daysInPeriod,
  daysElapsed,
  onChange,
  onPeriodChange,
  thresholds,
}: BudgetBarProps) {
  const pct = budget > 0 ? (spent / budget) * 100 : 0
  const clampedPct = Math.min(pct, 100)

  // Thresholds
  const [t1, t2, t3] = thresholds

  // Color based on thresholds
  const barColor =
    pct >= t3
      ? 'bg-[#ee7d77]'
      : pct >= t2
        ? 'bg-[#ee7d77]'
        : pct >= t1
          ? 'bg-[#f9a0ab]'
          : 'bg-[#f1ffd4]'

  const pulse = pct >= t2

  // Projection
  const dailyAvg = daysElapsed > 0 ? spent / daysElapsed : 0
  const projected = dailyAvg * daysInPeriod
  const projectedOver = projected - budget

  const periodLabel = period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'

  return (
    <div className="rounded-xl bg-card p-3.5 px-5 ring-1 ring-foreground/10 mb-4">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {/* Period pills */}
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onPeriodChange(key)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                period === key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="text-sm font-medium text-foreground">Budget:</label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-foreground">$</span>
          <Input
            type="number"
            value={budget}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            min={0}
            step={5}
            className="w-24 h-8"
          />
        </div>

        <span className="text-sm font-medium text-muted-foreground ml-auto">
          {fmt(spent)} / {fmt(budget, 0)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-6 bg-muted rounded-xl overflow-hidden relative">
        <div
          className={cn(
            'h-full rounded-xl transition-[width] duration-300 flex items-center justify-end pr-2.5 text-[11px] font-semibold text-white min-w-fit',
            barColor,
            pulse && 'animate-pulse',
            pct >= t3 && 'shadow-[0_0_12px_rgba(239,68,68,0.5)]'
          )}
          style={{ width: `${Math.max(clampedPct, 8)}%` }}
        >
          {pct.toFixed(0)}%
        </div>
      </div>

      {/* Projected spend */}
      {budget > 0 && daysElapsed > 0 && (
        <div className="mt-2 text-xs">
          {projectedOver > 0 ? (
            <span className="text-[#ee7d77]">
              At current rate, you&apos;ll exceed your {fmt(budget, 0)} budget by{' '}
              {fmt(projectedOver)} this {periodLabel}
            </span>
          ) : (
            <span className="text-[#d7e5bb]">
              On track to use {((projected / budget) * 100).toFixed(0)}% of budget this {periodLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
