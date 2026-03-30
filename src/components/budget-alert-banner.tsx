'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { fmt } from '@/lib/format'
import { cn } from '@/lib/utils'

interface BudgetAlertBannerProps {
  spent: number
  budget: number
  period: string
  projectedOverspend: number | null // null = on track, positive = amount over
}

export function BudgetAlertBanner({ spent, budget, period, projectedOverspend }: BudgetAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || budget <= 0) return null

  const pct = (spent / budget) * 100
  if (pct < 50) return null

  const isRed = pct >= 80
  const label = period === 'daily' ? 'daily' : period === 'weekly' ? 'weekly' : 'monthly'

  return (
    <div
      className={cn(
        'mb-4 rounded-xl px-5 py-3 flex items-start gap-3 ring-1',
        isRed
          ? 'bg-red-500/10 text-red-400 ring-red-500/20'
          : 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
      )}
    >
      <AlertTriangle className="size-4 mt-0.5 shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">
          You&apos;ve used {pct.toFixed(0)}% of your {label} budget ({fmt(spent)} of {fmt(budget, 0)})
        </p>
        {projectedOverspend !== null && projectedOverspend > 0 && (
          <p className="mt-0.5 text-xs opacity-80">
            At this rate, you&apos;ll exceed budget by {fmt(projectedOverspend)} this {label === 'daily' ? 'day' : label === 'weekly' ? 'week' : 'month'}.
          </p>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
