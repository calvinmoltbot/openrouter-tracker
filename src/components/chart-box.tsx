import { useEffect, useRef } from 'react'
import { Chart, type ChartConfiguration } from 'chart.js'

interface ChartBoxProps {
  id: string
  config: ChartConfiguration
  height?: number
}

export function ChartBox({ config, height = 300 }: ChartBoxProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    if (!canvasRef.current || !config) return
    chartRef.current = new Chart(canvasRef.current, config)
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [config])

  return <canvas ref={canvasRef} style={{ maxHeight: height }} />
}
