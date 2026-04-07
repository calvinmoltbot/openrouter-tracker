'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { fmt } from '@/lib/format'

const GAP = 2
const SINGLE_CELL = 12
const MULTI_CELL_W = 16
const MULTI_CELL_H = 24
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

/** Spend mode: muted rose opacity scale */
function spendColor(ratio: number, darkMode: boolean): string {
  if (darkMode) {
    if (ratio > 0.9) return '#c4a0a6'
    if (ratio > 0.7) return 'rgba(196,160,166,0.7)'
    if (ratio > 0.5) return 'rgba(196,160,166,0.45)'
    if (ratio > 0.3) return 'rgba(196,160,166,0.25)'
    return 'rgba(196,160,166,0.10)'
  }
  if (ratio > 0.9) return '#6b4a50'
  if (ratio > 0.7) return '#8a6068'
  if (ratio > 0.5) return '#b8949a'
  if (ratio > 0.3) return '#dcc4c8'
  return '#f2e8ea'
}

function intensityColor(value: number, max: number, darkMode: boolean, baseColor?: string): string {
  if (value === 0) return darkMode ? 'rgba(255,255,255,0.04)' : '#f3f4f6'

  const ratio = value / max

  if (baseColor) {
    // Multi mode: use entity color with opacity scale
    const opacity = Math.max(0.15, Math.min(1, ratio))
    return baseColor + Math.round(opacity * 255).toString(16).padStart(2, '0')
  }

  return spendColor(ratio, darkMode)
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

  const grid = useMemo(() => {
    if (days.length === 0) return { cells: [], colCount: 0, rowCount: 0, months: [], maxVal: 0.01 }

    if (mode === 'single') {
      const totals = days.map((_, di) => rows.reduce((s, r) => s + (r.values[di] || 0), 0))
      const maxVal = Math.max(...totals, 0.01)

      const startDate = new Date(days[0] + 'T00:00:00')
      const endDate = new Date(days[days.length - 1] + 'T00:00:00')

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

    // Multi mode
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

  // Cell sizing — single uses fixed 12px squares, multi uses 16×24 rectangles
  const labelPad = mode === 'multi' ? 120 : 24
  const topPad = mode === 'multi' ? 20 : 18

  const cellW = useMemo(() => {
    if (mode === 'single') {
      if (grid.colCount <= 0 || containerWidth <= 0) return SINGLE_CELL
      const available = containerWidth - labelPad
      const maxByWidth = Math.floor(available / grid.colCount) - GAP
      return Math.max(SINGLE_CELL, Math.min(36, maxByWidth))
    }
    // Multi: fixed width, scrollable
    if (grid.colCount <= 0 || containerWidth <= 0) return MULTI_CELL_W
    const available = containerWidth - labelPad
    const maxByWidth = Math.floor(available / grid.colCount) - GAP
    return Math.max(MULTI_CELL_W, Math.min(32, maxByWidth))
  }, [mode, grid.colCount, containerWidth, labelPad])

  const cellH = mode === 'multi' ? Math.max(MULTI_CELL_H, Math.round(cellW * 1.5)) : cellW

  const svgWidth = labelPad + grid.colCount * (cellW + GAP)
  const svgHeight = topPad + grid.rowCount * (cellH + GAP)

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
                  y={topPad + i * (cellH + GAP) + cellH / 2}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={10}
                  fill={darkMode ? '#8090b0' : '#6b7280'}
                  fontFamily="Inter Variable, sans-serif"
                >
                  {label}
                </text>
              ) : null
            )
          : rows.map((r, i) => (
              <text
                key={`rl-${i}`}
                x={labelPad - 6}
                y={topPad + i * (cellH + GAP) + cellH / 2}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={10}
                fill={darkMode ? '#d0d4e0' : '#374151'}
                fontFamily="Inter Variable, sans-serif"
              >
                {r.label.length > 14 ? r.label.slice(0, 13) + '…' : r.label}
              </text>
            ))}

        {/* Month labels (single mode) */}
        {grid.months
          .filter((m, i, arr) => {
            if (i === 0) return true
            const prevX = labelPad + arr[i - 1].col * (cellW + GAP)
            const thisX = labelPad + m.col * (cellW + GAP)
            return thisX - prevX > 30
          })
          .map((m, i) => (
            <text
              key={`ml-${i}`}
              x={labelPad + m.col * (cellW + GAP)}
              y={10}
              fontSize={10}
              fill={darkMode ? '#8090b0' : '#6b7280'}
              fontFamily="Inter Variable, sans-serif"
            >
              {m.label}
            </text>
          ))}

        {/* Cells */}
        {grid.cells.map((cell, i) => (
          <rect
            key={i}
            x={labelPad + cell.col * (cellW + GAP)}
            y={topPad + cell.row * (cellH + GAP)}
            width={cellW}
            height={cellH}
            rx={1}
            fill={intensityColor(cell.value, grid.maxVal, darkMode, cell.color)}
            className="cursor-pointer transition-opacity hover:opacity-80"
            onMouseEnter={e => {
              const rect = (e.target as SVGRectElement).getBoundingClientRect()
              const parent = (e.target as SVGRectElement).closest('.overflow-x-auto')!.getBoundingClientRect()
              const relY = rect.top - parent.top
              const flipBelow = relY < 40
              setTooltip({
                x: rect.left - parent.left + cellW / 2,
                y: flipBelow ? relY + cellH + 8 : relY - 4,
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
          className="absolute pointer-events-none z-10 px-2.5 py-1.5 rounded-sm text-xs whitespace-nowrap font-medium"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: tooltip.flipBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            backgroundColor: darkMode ? '#0b1d48' : 'rgba(255,255,255,0.95)',
            color: darkMode ? '#d0d4e0' : '#111827',
            border: `1px solid ${darkMode ? 'rgba(50,69,124,0.3)' : 'rgba(0,0,0,0.1)'}`,
            boxShadow: darkMode ? '0 4px 16px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.15)',
          }}
        >
          <span className="text-[#ffb2bb]">{tooltip.label}</span>
          <span className="text-muted-foreground mx-1">·</span>
          {tooltip.date}: {fmt(tooltip.value, 4)}
        </div>
      )}
    </div>
  )
}
