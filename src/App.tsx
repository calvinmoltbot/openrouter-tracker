import { useState, useCallback } from 'react'
import { SetupScreen } from '@/components/setup-screen'
import { Dashboard } from '@/components/dashboard'
import { processRows } from '@/data/processor'
import type { RawActivityRow, ProcessedData, ApiKey } from '@/lib/types'

export default function App() {
  const [data, setData] = useState<ProcessedData | null>(null)
  const [source, setSource] = useState('')
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [, setApiKey] = useState(() => localStorage.getItem('or_api_key') || '')

  const handleData = useCallback((rows: RawActivityRow[], src: string, apiKeys?: ApiKey[]) => {
    const processed = processRows(rows)
    setData(processed)
    setSource(src)
    setKeys(apiKeys ?? [])
  }, [])

  const handleReset = () => {
    setData(null)
    setSource('')
    setKeys([])
  }

  if (!data) {
    return <SetupScreen onData={handleData} onApiKey={setApiKey} />
  }

  return <Dashboard data={data} source={source} keys={keys} onReset={handleReset} />
}
