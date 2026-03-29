import { Input } from '@/components/ui/input'
import { fmt } from '@/lib/format'

interface BudgetBarProps {
  spent: number
  budget: number
  onChange: (v: number) => void
}

export function BudgetBar({ spent, budget, onChange }: BudgetBarProps) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
  const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981'

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-card p-3.5 px-5 ring-1 ring-foreground/10 mb-4">
      <label className="text-sm font-medium">Monthly Budget:</label>
      <span>$</span>
      <Input
        type="number"
        value={budget}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        min={0}
        step={5}
        className="w-24"
      />
      <div className="flex-1 min-w-[200px] h-6 bg-muted rounded-xl overflow-hidden relative">
        <div
          className="h-full rounded-xl transition-[width] duration-300 flex items-center pl-2.5 text-[11px] font-semibold text-white min-w-fit"
          style={{ width: `${Math.max(pct, 8)}%`, background: color }}
        >
          {fmt(spent)} / {fmt(budget, 0)} ({pct.toFixed(0)}%)
        </div>
      </div>
      {pct > 80 && <span className="text-[13px] text-red-500 font-semibold">Over 80% of budget used</span>}
    </div>
  )
}
