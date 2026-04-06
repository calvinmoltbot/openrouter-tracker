'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { fmt } from '@/lib/format'
import type { ProcessedData } from '@/lib/types'

interface CostHeatmapProps {
  data: ProcessedData
  darkMode: boolean
  colors?: Record<string, string>
}

const MIN_CELL_SIZE = 14
const MAX_CELL_SIZE = 36
const GAP = 2
const DAY_LABELS = ['', 'M', '', 'W', '', 'F', '']

function getSpendColor(cost: number, max: number, darkMode: boolean): string {
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

function getModelColor(
  dayIndex: number,
  data: ProcessedData,
  colors: Record<string, string>,
  maxCost: number,
  darkMode: boolean,
): string {
  if (dayIndex < 0 || dayIndex >= data.days.length) {
    return darkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6'
  }

  let topModel = ''
  let topCost = 0
  let totalCost = 0
  for (const m of data.models) {
    const c = data.dailyCost[m]?.[dayIndex] || 0
    totalCost += c
    if (c > topCost) {
      topCost = c
      topModel = m
    }
  }

  if (totalCost === 0 || !topModel) {
    return darkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6'
  }

  const baseColor = colors[topModel] || '#6b7280'
  // Scale opacity by cost relative to max
  const opacity = Math.max(0.25, Math.min(1, totalCost / maxCost))
  return baseColor + Math.round(opacity * 255).toString(16).padStart(2, '0')
}

export function CostHeatmap({ data, darkMode, colors = {} }: CostHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; cost: number; topModel?: string } | null>(null)
  const [mode, setMode] = useState<'spend' | 'model'>('spend')
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { cells, weeks, months, maxCost, dateToIndex } = useMemo(() => {
    const costByDate: Record<string, number> = {}
    const dateIndexMap: Record<string, number> = {}
    for (let di = 0; di < data.days.length; di++) {
      const day = data.days[di]
      dateIndexMap[day] = di
      costByDate[day] = data.models.reduce((sum, m) => sum + (data.dailyCost[m]?.[di] || 0), 0)
    }

    if (data.days.length === 0) return { cells: [], weeks: 0, months: [], maxCost: 0, dateToIndex: {} }

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
    return { cells: cellList, weeks: totalWeeks, months: monthLabels, maxCost: mx, dateToIndex: dateIndexMap }
  }, [data])

  // For model mode, find dominant model per day
  const getDominantModel = (dayIndex: number): string => {
    if (dayIndex < 0 || dayIndex >= data.days.length) return ''
    let topModel = ''
    let topCost = 0
    for (const m of data.models) {
      const c = data.dailyCost[m]?.[dayIndex] || 0
      if (c > topCost) {
        topCost = c
        topModel = m
      }
    }
    return topModel
  }

  const getCellColor = (cell: { date: string; cost: number }): string => {
    if (mode === 'model') {
      const di = dateToIndex[cell.date]
      return getModelColor(di ?? -1, data, colors, maxCost, darkMode)
    }
    return getSpendColor(cell.cost, maxCost, darkMode)
  }

  const leftPad = 24
  const topPad = 18
  // Scale cells to fill container when few weeks, clamp between min and max
  const cellSize = useMemo(() => {
    if (weeks <= 0 || containerWidth <= 0) return MIN_CELL_SIZE
    const available = containerWidth - leftPad
    const maxByWidth = Math.floor(available / weeks) - GAP
    return Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, maxByWidth))
  }, [weeks, containerWidth])
  const svgWidth = leftPad + weeks * (cellSize + GAP)
  const svgHeight = topPad + 7 * (cellSize + GAP)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Spend Heatmap</h3>
          <p className="text-xs text-muted-foreground">Daily spend intensity across the date range</p>
        </div>
        <div className="flex gap-0.5 bg-muted rounded-md p-0.5">
          <button
            onClick={() => setMode('spend')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${mode === 'spend' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Spend
          </button>
          <button
            onClick={() => setMode('model')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${mode === 'model' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Model
          </button>
        </div>
      </div>
      <div className="overflow-x-auto relative" ref={containerRef}>
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
                y={topPad + i * (cellSize + GAP) + cellSize / 2}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={10}
                fill={darkMode ? '#9ca3af' : '#6b7280'}
              >
                {label}
              </text>
            ) : null
          )}

          {/* Month labels — deduplicate overlapping labels */}
          {months
            .filter((m, i, arr) => {
              if (i === 0) return true
              const prevX = leftPad + arr[i - 1].col * (cellSize + GAP)
              const thisX = leftPad + m.col * (cellSize + GAP)
              return thisX - prevX > 30 // skip if too close
            })
            .map((m, i) => (
            <text
              key={i}
              x={leftPad + m.col * (cellSize + GAP)}
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
              x={leftPad + cell.col * (cellSize + GAP)}
              y={topPad + cell.row * (cellSize + GAP)}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={getCellColor(cell)}
              className="cursor-pointer"
              onMouseEnter={e => {
                const rect = (e.target as SVGRectElement).getBoundingClientRect()
                const parent = (e.target as SVGRectElement).closest('.overflow-x-auto')!.getBoundingClientRect()
                const di = dateToIndex[cell.date]
                const topModel = di !== undefined ? getDominantModel(di) : undefined
                setTooltip({
                  x: rect.left - parent.left + cellSize / 2,
                  y: rect.top - parent.top - 4,
                  date: cell.date,
                  cost: cell.cost,
                  topModel: topModel || undefined,
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
            {mode === 'model' && tooltip.topModel && (
              <span className="ml-1 opacity-75">({tooltip.topModel})</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
