'use client'

import { useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { fmt } from '@/lib/format'
import type { ProcessedData } from '@/lib/types'

interface CostHeatmapProps {
  data: ProcessedData
  darkMode: boolean
}

const CELL_SIZE = 14
const GAP = 2
const DAY_LABELS = ['', 'M', '', 'W', '', 'F', '']

function getColorLevel(cost: number, max: number, darkMode: boolean): string {
  if (cost === 0) return darkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6'
  const ratio = cost / max
  if (darkMode) {
    if (ratio > 0.75) return '#86efac' // green-300
    if (ratio > 0.5) return '#22c55e'  // green-500
    if (ratio > 0.25) return '#15803d' // green-700
    return '#14532d'                    // green-900
  }
  if (ratio > 0.75) return '#15803d'   // green-700
  if (ratio > 0.5) return '#22c55e'    // green-500
  if (ratio > 0.25) return '#86efac'   // green-300
  return '#dcfce7'                      // green-100
}

export function CostHeatmap({ data, darkMode }: CostHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; cost: number } | null>(null)

  const { cells, weeks, months, maxCost } = useMemo(() => {
    const costByDate: Record<string, number> = {}
    for (let di = 0; di < data.days.length; di++) {
      const day = data.days[di]
      costByDate[day] = data.models.reduce((sum, m) => sum + (data.dailyCost[m]?.[di] || 0), 0)
    }

    if (data.days.length === 0) return { cells: [], weeks: 0, months: [], maxCost: 0 }

    const startDate = new Date(data.days[0] + 'T00:00:00')
    const endDate = new Date(data.days[data.days.length - 1] + 'T00:00:00')

    // Align to Monday
    const alignedStart = new Date(startDate)
    const dayOfWeek = alignedStart.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    alignedStart.setDate(alignedStart.getDate() + mondayOffset)

    const cellList: { date: string; cost: number; col: number; row: number }[] = []
    const monthLabels: { label: string; col: number }[] = []
    let lastMonth = -1
    let col = 0

    const cursor = new Date(alignedStart)
    while (cursor <= endDate) {
      const row = (cursor.getDay() + 6) % 7 // Monday=0 .. Sunday=6
      const dateStr = cursor.toISOString().slice(0, 10)

      if (row === 0 && cursor.getMonth() !== lastMonth) {
        monthLabels.push({
          label: cursor.toLocaleString('en', { month: 'short' }),
          col,
        })
        lastMonth = cursor.getMonth()
      }

      cellList.push({ date: dateStr, cost: costByDate[dateStr] || 0, col, row })

      cursor.setDate(cursor.getDate() + 1)
      if ((cursor.getDay() + 6) % 7 === 0) col++
    }

    const totalWeeks = col + 1
    const mx = Math.max(...cellList.map(c => c.cost), 0.01)
    return { cells: cellList, weeks: totalWeeks, months: monthLabels, maxCost: mx }
  }, [data])

  const leftPad = 24
  const topPad = 18
  const svgWidth = leftPad + weeks * (CELL_SIZE + GAP)
  const svgHeight = topPad + 7 * (CELL_SIZE + GAP)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spend Heatmap</CardTitle>
        <CardDescription>Daily spend intensity across the date range</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto relative">
          <svg
            width={svgWidth}
            height={svgHeight}
            className="block"
            onMouseLeave={() => setTooltip(null)}
          >
            {/* Day-of-week labels */}
            {DAY_LABELS.map((label, i) =>
              label ? (
                <text
                  key={i}
                  x={leftPad - 6}
                  y={topPad + i * (CELL_SIZE + GAP) + CELL_SIZE / 2}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={10}
                  fill={darkMode ? '#9ca3af' : '#6b7280'}
                >
                  {label}
                </text>
              ) : null
            )}

            {/* Month labels */}
            {months.map((m, i) => (
              <text
                key={i}
                x={leftPad + m.col * (CELL_SIZE + GAP)}
                y={10}
                fontSize={10}
                fill={darkMode ? '#9ca3af' : '#6b7280'}
              >
                {m.label}
              </text>
            ))}

            {/* Cells */}
            {cells.map((cell, i) => (
              <rect
                key={i}
                x={leftPad + cell.col * (CELL_SIZE + GAP)}
                y={topPad + cell.row * (CELL_SIZE + GAP)}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={2}
                fill={getColorLevel(cell.cost, maxCost, darkMode)}
                className="cursor-pointer"
                onMouseEnter={e => {
                  const rect = (e.target as SVGRectElement).getBoundingClientRect()
                  const parent = (e.target as SVGRectElement).closest('.overflow-x-auto')!.getBoundingClientRect()
                  setTooltip({
                    x: rect.left - parent.left + CELL_SIZE / 2,
                    y: rect.top - parent.top - 4,
                    date: cell.date,
                    cost: cell.cost,
                  })
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="absolute pointer-events-none z-10 px-2 py-1 rounded text-xs whitespace-nowrap"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: 'translate(-50%, -100%)',
                backgroundColor: darkMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)',
                color: darkMode ? '#f3f4f6' : '#111827',
                border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              }}
            >
              {tooltip.date}: {fmt(tooltip.cost, 4)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
