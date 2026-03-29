import { useEffect, useRef, useState } from 'react'
import { Chart, type ChartConfiguration } from 'chart.js'

interface ChartBoxProps {
  id: string
  config: ChartConfiguration
  height?: number
}

export function ChartBox({ config, height = 300 }: ChartBoxProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    if (!canvasRef.current || !config) return
    chartRef.current = new Chart(canvasRef.current, config)
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
