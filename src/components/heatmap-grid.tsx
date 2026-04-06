'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { fmt } from '@/lib/format'

const GAP = 2
const MIN_CELL = 14
const MAX_CELL_SINGLE = 36
const MAX_CELL_MULTI = 24
const DAY_LABELS = ['', 'M', '', 'W', '', 'F', '']

export interface HeatmapRow {
  label: string
  values: number[]
  color?: string
}

interface HeatmapGridProps {
  days: string[]
  rows: HeatmapRow[]
  darkMode: boolean
  mode: 'single' | 'multi'
}

function intensityColor(value: number, max: number, darkMode: boolean, baseColor?: string): string {
  if (value === 0) return darkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6'

  if (baseColor) {
    const opacity = Math.max(0.25, Math.min(1, value / max))
    return baseColor + Math.round(opacity * 255).toString(16).padStart(2, '0')
  }

  const ratio = value / max
  if (darkMode) {
    if (ratio > 0.75) return '#86efac'
    if (ratio > 0.5) return '#22c55e'
    if (ratio > 0.25) return '#15803d'
    return '#14532d'
  }
  if (ratio > 0.75) return '#15803d'
  if (ratio > 0.5) return '#22c55e'
  if (ratio > 0.25) return '#86efac'
  return '#dcfce7'
}

export function HeatmapGrid({ days, rows, darkMode, mode }: HeatmapGridProps) {
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; date: string; value: number; label: string; flipBelow: boolean
  } | null>(null)
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

  // Single mode: GitHub-contribution grid (7 rows = Mon-Sun, columns = weeks)
  // Multi mode: rows = entities, columns = days
  const grid = useMemo(() => {
    if (days.length === 0) return { cells: [], colCount: 0, rowCount: 0, months: [], maxVal: 0.01 }

    if (mode === 'single') {
      // Aggregate values across all rows per day
      const totals = days.map((_, di) => rows.reduce((s, r) => s + (r.values[di] || 0), 0))
      const maxVal = Math.max(...totals, 0.01)

      const startDate = new Date(days[0] + 'T00:00:00')
      const endDate = new Date(days[days.length - 1] + 'T00:00:00')

      // Align to Monday
      const aligned = new Date(startDate)
      const dow = aligned.getDay()
      aligned.setDate(aligned.getDate() + (dow === 0 ? -6 : 1 - dow))

      const cells: { col: number; row: number; date: string; value: number; label: string; color?: string }[] = []
      const months: { label: string; col: number }[] = []
      let lastMonth = -1
      let col = 0

      const cursor = new Date(aligned)
      const dateMap = new Map(days.map((d, i) => [d, totals[i]]))

      while (cursor <= endDate) {
        const row = (cursor.getDay() + 6) % 7
        const dateStr = cursor.toISOString().slice(0, 10)

        if (row === 0 && cursor.getMonth() !== lastMonth) {
          months.push({ label: cursor.toLocaleString('en', { month: 'short' }), col })
          lastMonth = cursor.getMonth()
        }

        cells.push({ col, row, date: dateStr, value: dateMap.get(dateStr) || 0, label: 'Total' })

        cursor.setDate(cursor.getDate() + 1)
        if ((cursor.getDay() + 6) % 7 === 0) col++
      }

      return { cells, colCount: col + 1, rowCount: 7, months, maxVal }
    }

    // Multi mode: each row is an entity
    const maxVal = Math.max(...rows.flatMap(r => r.values), 0.01)
    const cells: { col: number; row: number; date: string; value: number; label: string; color?: string }[] = []

    for (let ri = 0; ri < rows.length; ri++) {
      for (let di = 0; di < days.length; di++) {
        cells.push({
          col: di,
          row: ri,
          date: days[di],
          value: rows[ri].values[di] || 0,
          label: rows[ri].label,
          color: rows[ri].color,
        })
      }
    }

    return { cells, colCount: days.length, rowCount: rows.length, months: [], maxVal }
  }, [days, rows, mode])

  // Calculate cell size
  const labelPad = mode === 'multi' ? 120 : 24
  const topPad = mode === 'multi' ? 20 : 18
  const maxCell = mode === 'multi' ? MAX_CELL_MULTI : MAX_CELL_SINGLE

  const cellSize = useMemo(() => {
    if (grid.colCount <= 0 || containerWidth <= 0) return MIN_CELL
    const available = containerWidth - labelPad
    const maxByWidth = Math.floor(available / grid.colCount) - GAP
    return Math.max(MIN_CELL, Math.min(maxCell, maxByWidth))
  }, [grid.colCount, containerWidth, labelPad, maxCell])

  const svgWidth = labelPad + grid.colCount * (cellSize + GAP)
  const svgHeight = topPad + grid.rowCount * (cellSize + GAP)

  return (
    <div className="overflow-x-auto relative" ref={containerRef}>
      <svg
        width={Math.max(svgWidth, containerWidth)}
        height={svgHeight}
        className="block"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Row labels */}
        {mode === 'single'
          ? DAY_LABELS.map((label, i) =>
              label ? (
                <text
                  key={`dl-${i}`}
                  x={labelPad - 6}
                  y={topPad + i * (cellSize + GAP) + cellSize / 2}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={10}
                  fill={darkMode ? '#9ca3af' : '#6b7280'}
                >
                  {label}
                </text>
              ) : null
            )
          : rows.map((r, i) => (
              <text
                key={`rl-${i}`}
                x={labelPad - 6}
                y={topPad + i * (cellSize + GAP) + cellSize / 2}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={10}
                fill={darkMode ? '#d1d5db' : '#374151'}
              >
                {r.label.length > 14 ? r.label.slice(0, 13) + '…' : r.label}
              </text>
            ))}

        {/* Month labels (single mode only) */}
        {grid.months
          .filter((m, i, arr) => {
            if (i === 0) return true
            const prevX = labelPad + arr[i - 1].col * (cellSize + GAP)
            const thisX = labelPad + m.col * (cellSize + GAP)
            return thisX - prevX > 30
          })
          .map((m, i) => (
            <text
              key={`ml-${i}`}
              x={labelPad + m.col * (cellSize + GAP)}
              y={10}
              fontSize={10}
              fill={darkMode ? '#9ca3af' : '#6b7280'}
            >
              {m.label}
            </text>
          ))}

        {/* Cells */}
        {grid.cells.map((cell, i) => (
          <rect
            key={i}
            x={labelPad + cell.col * (cellSize + GAP)}
            y={topPad + cell.row * (cellSize + GAP)}
            width={cellSize}
            height={cellSize}
            rx={2}
            fill={intensityColor(cell.value, grid.maxVal, darkMode, cell.color)}
            className="cursor-pointer"
            onMouseEnter={e => {
              const rect = (e.target as SVGRectElement).getBoundingClientRect()
              const parent = (e.target as SVGRectElement).closest('.overflow-x-auto')!.getBoundingClientRect()
              const relY = rect.top - parent.top
              const flipBelow = relY < 40
              setTooltip({
                x: rect.left - parent.left + cellSize / 2,
                y: flipBelow ? relY + cellSize + 8 : relY - 4,
                date: cell.date,
                value: cell.value,
                label: cell.label,
                flipBelow,
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
            transform: tooltip.flipBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            backgroundColor: darkMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)',
            color: darkMode ? '#f3f4f6' : '#111827',
            border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }}
        >
          <span className="font-medium">{tooltip.label}</span>
          {' · '}
          {tooltip.date}: {fmt(tooltip.value, 4)}
        </div>
      )}
    </div>
  )
}
