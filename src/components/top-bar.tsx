'use client'

import { useState, useRef, useEffect } from 'react'
import { DateRangePills } from '@/components/date-range-pills'
import { formatCacheAge, isCacheStale } from '@/lib/cache'
import { RefreshCw, Filter, X } from 'lucide-react'
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
  allApps: string[]
  excludedApps: Set<string>
  onExcludedAppsChange: (apps: Set<string>) => void
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TopBar({ dateRange, totalCalls, source, range, onRangeChange, compare, onCompareToggle, onReset, cacheTimestamp, allApps, excludedApps, onExcludedAppsChange }: TopBarProps) {
  const [showAppFilter, setShowAppFilter] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showAppFilter) return
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowAppFilter(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAppFilter])

  const toggleApp = (app: string) => {
    const next = new Set(excludedApps)
    if (next.has(app)) next.delete(app)
    else next.add(app)
    onExcludedAppsChange(next)
  }

  return (
    <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground font-heading">OpenRouter Cost Tracker</h1>
          <div className="text-xs text-muted-foreground">
            {dateRange} &middot; {totalCalls.toLocaleString()} calls
            {excludedApps.size > 0 && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                {excludedApps.size} app{excludedApps.size > 1 ? 's' : ''} hidden
              </span>
            )}
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

        {/* App exclusion filter */}
        <div className="relative" ref={filterRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAppFilter(s => !s)}
            className={`text-xs ${excludedApps.size > 0 ? 'text-amber-400 hover:text-amber-300' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Filter className="size-3 mr-1" />
            Apps
          </Button>
          {showAppFilter && (
            <div className="absolute top-full right-0 mt-2 p-3 rounded-lg border border-border bg-popover shadow-lg z-50 min-w-[220px] max-h-[300px] overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground">Show/Hide Apps</span>
                {excludedApps.size > 0 && (
                  <button
                    onClick={() => onExcludedAppsChange(new Set())}
                    className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <X className="size-2.5" /> Clear
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {allApps.map(app => (
                  <label key={app} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={!excludedApps.has(app)}
                      onChange={() => toggleApp(app)}
                      className="rounded border-border"
                    />
                    <span className={excludedApps.has(app) ? 'text-muted-foreground line-through' : 'text-foreground'}>
                      {app}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button variant="ghost" size="sm" onClick={onReset} className="text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className="size-3 mr-1" />
          Reset
        </Button>
      </div>
    </div>
  )
}
