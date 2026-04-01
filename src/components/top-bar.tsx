'use client'

import { DateRangePills } from '@/components/date-range-pills'
import { formatCacheAge, isCacheStale } from '@/lib/cache'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TopBarProps {
  dateRange: string
  totalCalls: number
  source: string
  range: string
  onRangeChange: (range: string) => void
  compare: boolean
  onCompareToggle: () => void
  onReset: () => void
  cacheTimestamp: number | null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TopBar({ dateRange, totalCalls, source, range, onRangeChange, compare, onCompareToggle, onReset, cacheTimestamp }: TopBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">OpenRouter Cost Tracker</h1>
          <div className="text-xs text-muted-foreground">
            {dateRange} &middot; {totalCalls.toLocaleString()} calls
            {cacheTimestamp && (
              <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${isCacheStale(cacheTimestamp) ? 'bg-amber-500/15 text-amber-400' : 'bg-muted text-muted-foreground'}`}>
                {formatCacheAge(cacheTimestamp)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <DateRangePills range={range} onRangeChange={onRangeChange} compare={compare} onCompareToggle={onCompareToggle} />
        <Button variant="ghost" size="sm" onClick={onReset} className="text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className="size-3 mr-1" />
          Reset
        </Button>
      </div>
    </div>
  )
}
