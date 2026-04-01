'use client'

import { useState } from 'react'
import { TabModels } from '@/components/tab-models'
import { TabApps } from '@/components/tab-apps'
import { TabKeys } from '@/components/tab-keys'
import type { ProcessedData, ApiKey } from '@/lib/types'

type SubTab = 'models' | 'apps' | 'keys'

interface ZoneBreakdownProps {
  data: ProcessedData
  colors: Record<string, string>
  darkMode: boolean
  keys: ApiKey[]
}

const tabs: { id: SubTab; label: string }[] = [
  { id: 'models', label: 'Models' },
  { id: 'apps', label: 'Apps' },
  { id: 'keys', label: 'Keys' },
]

export function ZoneBreakdown({ data, colors, darkMode, keys }: ZoneBreakdownProps) {
  const [active, setActive] = useState<SubTab>('models')

  return (
    <div>
      {/* Sub-tab pills + search */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active === t.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              {t.id === 'keys' && keys.length > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({keys.length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="animate-in fade-in duration-300">
        {active === 'models' && <TabModels data={data} colors={colors} darkMode={darkMode} />}
        {active === 'apps' && <TabApps data={data} colors={colors} darkMode={darkMode} />}
        {active === 'keys' && <TabKeys keys={keys} darkMode={darkMode} />}
      </div>
    </div>
  )
}
