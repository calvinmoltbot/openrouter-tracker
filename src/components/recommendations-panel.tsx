'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  ChevronDown,
  ChevronUp,
  X,
  PieChart,
  Clock,
  Database,
  TrendingUp,
  ArrowDownUp,
  KeyRound,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { generateRecommendations, type Recommendation } from '@/lib/recommendations'
import { fmt } from '@/lib/format'
import type { ProcessedData } from '@/lib/types'

const STORAGE_KEY = 'or_dismissed_recs'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  PieChart,
  Clock,
  Database,
  TrendingUp,
  ArrowDownUp,
  KeyRound,
}

const severityStyles: Record<Recommendation['severity'], string> = {
  critical: 'border-l-4 border-l-red-500',
  warning: 'border-l-4 border-l-amber-500',
  info: 'border-l-4 border-l-blue-500',
}

const severityBadge: Record<Recommendation['severity'], string> = {
  critical: 'bg-red-500/15 text-red-600 dark:text-red-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  info: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
}

function getDismissed(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveDismissed(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

interface RecommendationsPanelProps {
  data: ProcessedData
  budget: number
}

export function RecommendationsPanel({ data, budget }: RecommendationsPanelProps) {
  const [dismissed, setDismissed] = useState<string[]>(getDismissed)
  const [collapsed, setCollapsed] = useState(false)

  const allRecs = useMemo(() => generateRecommendations(data, budget), [data, budget])
  const visibleRecs = useMemo(() => allRecs.filter(r => !dismissed.includes(r.id)), [allRecs, dismissed])

  const dismiss = useCallback((id: string) => {
    setDismissed(prev => {
      const next = [...prev, id]
      saveDismissed(next)
      return next
    })
  }, [])

  if (allRecs.length === 0) return null

  return (
    <div className="mb-4">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
      >
        <Sparkles className="size-4" />
        Recommendations
        {visibleRecs.length > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-primary/15 text-primary px-2 py-0.5 text-xs font-medium">
            {visibleRecs.length}
          </span>
        )}
        {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
      </button>

      {!collapsed && (
        visibleRecs.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-3">
            {visibleRecs.map(rec => {
              const Icon = iconMap[rec.icon] || Sparkles
              return (
                <Card key={rec.id} className={severityStyles[rec.severity]}>
                  <CardContent className="flex gap-3">
                    <Icon className="size-5 shrink-0 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold leading-snug">{rec.title}</h4>
                        <button
                          onClick={() => dismiss(rec.id)}
                          className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          aria-label="Dismiss recommendation"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                      <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">
                        {rec.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${severityBadge[rec.severity]}`}>
                          {rec.severity}
                        </span>
                        {rec.savings !== null && rec.savings > 0 && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-xs font-medium">
                            Save ~{fmt(rec.savings)}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No recommendations — your usage looks efficient!
          </p>
        )
      )}
    </div>
  )
}
