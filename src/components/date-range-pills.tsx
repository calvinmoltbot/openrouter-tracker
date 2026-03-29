import { cn } from '@/lib/utils'

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
}

export function DateRangePills({ range, onRangeChange }: DateRangePillsProps) {
  return (
    <div className="flex gap-2 mb-4">
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
    </div>
  )
}
