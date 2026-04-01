'use client'

import { useState } from 'react'
import { ChartBox } from '@/components/chart-box'
import { buildHourlyCostConfig, buildHourlyCallsConfig } from '@/lib/chart-configs'
import type { ProcessedData } from '@/lib/types'

interface TileHourlyPatternsProps {
  data: ProcessedData
  darkMode: boolean
}

export function TileHourlyPatterns({ data, darkMode }: TileHourlyPatternsProps) {
  const [mode, setMode] = useState<'cost' | 'calls'>('cost')

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Hourly Patterns (UTC)</h3>
        <div className="flex gap-0.5 bg-muted rounded-md p-0.5">
          <button
            onClick={() => setMode('cost')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${mode === 'cost' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Cost
          </button>
          <button
            onClick={() => setMode('calls')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${mode === 'calls' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Calls
          </button>
        </div>
      </div>
      <ChartBox
        id={`hourly-pattern-${mode}`}
        config={mode === 'cost' ? buildHourlyCostConfig(data, darkMode) : buildHourlyCallsConfig(data, darkMode)}
        height={200}
      />
    </div>
  )
}
