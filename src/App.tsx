import { useState, useCallback, useMemo, useEffect } from 'react'
import { SetupScreen } from '@/components/setup-screen'
import { Dashboard } from '@/components/dashboard'
import { processRows, filterRowsByRange } from '@/data/processor'
import type { RawActivityRow, ApiKey } from '@/lib/types'

export default function App() {
  const [rawRows, setRawRows] = useState<RawActivityRow[] | null>(null)
  const [source, setSource] = useState('')
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [range, setRange] = useState<string>(() => localStorage.getItem('or_range') || 'month')
  const [, setApiKey] = useState(() => localStorage.getItem('or_api_key') || '')

  useEffect(() => {
    localStorage.setItem('or_range', range)
  }, [range])

  const data = useMemo(() => {
    if (!rawRows) return null
    const filtered = filterRowsByRange(rawRows, range)
    return processRows(filtered)
  }, [rawRows, range])

  const handleData = useCallback((rows: RawActivityRow[], src: string, apiKeys?: ApiKey[]) => {
    setRawRows(rows)
    setSource(src)
    setKeys(apiKeys ?? [])
  }, [])

  const handleReset = () => {
    setRawRows(null)
    setSource('')
    setKeys([])
  }

  if (!data) {
    return <SetupScreen onData={handleData} onApiKey={setApiKey} />
  }

  return <Dashboard data={data} source={source} keys={keys} range={range} onRangeChange={setRange} onReset={handleReset} />
}
