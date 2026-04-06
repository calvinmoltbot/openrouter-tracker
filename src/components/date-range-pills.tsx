'use client'

import { useState, useRef, useEffect, useCallback } from 'react' // useEffect for click-outside
import { cn } from '@/lib/utils'
import { ArrowLeftRight, Calendar } from 'lucide-react'

const RANGES = [
  { key: '1d', label: '1d' },
  { key: '7d', label: '7d' },
  { key: '14d', label: '14d' },
  { key: 'month', label: 'This Month' },
  { key: '90d', label: '90d' },
  { key: 'all', label: 'All' },
]

interface DateRangePillsProps {
  range: string
  onRangeChange: (range: string) => void
  compare?: boolean
  onCompareToggle?: () => void
}

export function DateRangePills({ range, onRangeChange, compare, onCompareToggle }: DateRangePillsProps) {
  const [showCustom, setShowCustom] = useState(false)
  // Local draft state for the date picker inputs (not synced from props)
  const [draftStart, setDraftStart] = useState('')
  const [draftEnd, setDraftEnd] = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)

  const isCustom = range.startsWith('custom:')
  const parsedStart = isCustom ? range.split(':')[1] : ''
  const parsedEnd = isCustom ? range.split(':')[2] : ''

  // Parse custom range for display
  const customLabel = isCustom ? `${parsedStart} → ${parsedEnd}` : null

  // When opening the popover, seed draft from current range
  const handleToggleCustom = useCallback(() => {
    setShowCustom(s => {
      if (!s) {
        // Opening: seed with current custom range or empty
        setDraftStart(parsedStart)
        setDraftEnd(parsedEnd)
      }
      return !s
    })
  }, [parsedStart, parsedEnd])

  // Close popover on outside click
  useEffect(() => {
    if (!showCustom) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowCustom(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCustom])

  const applyCustomRange = () => {
    if (draftStart && draftEnd && draftStart <= draftEnd) {
      onRangeChange(`custom:${draftStart}:${draftEnd}`)
      setShowCustom(false)
    }
  }

  return (
    <div className="flex gap-2 mb-4 items-center flex-wrap">
      {RANGES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => { onRangeChange(key); setShowCustom(false) }}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium transition-colors',
            range === key
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          {label}
        </button>
      ))}

      {/* Custom date range */}
      <div className="relative" ref={popoverRef}>
        <button
          onClick={handleToggleCustom}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5',
            isCustom
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          <Calendar className="size-3" />
          {customLabel ?? 'Custom'}
        </button>
        {showCustom && (
          <div className="absolute top-full right-0 mt-2 p-3 rounded-lg border border-border bg-popover shadow-lg z-50 min-w-[260px]">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-medium text-muted-foreground">From</label>
              <input
                type="date"
                value={draftStart}
                onChange={e => setDraftStart(e.target.value)}
                className="px-2 py-1.5 text-xs rounded-md border border-border bg-background text-foreground"
              />
              <label className="text-[11px] font-medium text-muted-foreground">To</label>
              <input
                type="date"
                value={draftEnd}
                onChange={e => setDraftEnd(e.target.value)}
                className="px-2 py-1.5 text-xs rounded-md border border-border bg-background text-foreground"
              />
              <button
                onClick={applyCustomRange}
                disabled={!draftStart || !draftEnd || draftStart > draftEnd}
                className="mt-1 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {range !== 'all' && !isCustom && onCompareToggle && (
        <>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={onCompareToggle}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5',
              compare
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <ArrowLeftRight className="size-3" />
            Compare
          </button>
        </>
      )}
    </div>
  )
}
