'use client'

import { useEffect, useRef, useState } from 'react'
import { Chart } from 'chart.js'

interface ChartBoxProps {
  id: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any
  height?: number
}

export function ChartBox({ config, height = 300 }: ChartBoxProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    if (!canvasRef.current || !config) return
    // Ensure transparent canvas background in dark mode
    const cfg = {
      ...config,
      options: {
        ...config.options,
        plugins: {
          ...config.options?.plugins,
        },
      },
    }
    chartRef.current = new Chart(canvasRef.current, cfg)
    // Set canvas background to transparent
    canvasRef.current.style.background = 'transparent'
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [config])

  useEffect(() => {
    // Mark as rendered after first paint
    const id = requestAnimationFrame(() => setRendered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="relative" style={{ minHeight: height }}>
      {!rendered && (
        <div
          className="absolute inset-0 animate-pulse bg-muted rounded-xl"
          style={{ height }}
        />
      )}
      <canvas ref={canvasRef} style={{ maxHeight: height }} />
    </div>
  )
}
