import { cn } from '@/lib/utils'
import { ArrowLeftRight } from 'lucide-react'

const RANGES = [
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
  return (
    <div className="flex gap-2 mb-4 items-center">
      {RANGES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onRangeChange(key)}
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
      {range !== 'all' && onCompareToggle && (
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
