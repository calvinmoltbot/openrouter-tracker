import { useState, useCallback } from 'react'
import { SetupScreen } from '@/components/setup-screen'
import { Dashboard } from '@/components/dashboard'
import { processRows } from '@/data/processor'
import type { RawActivityRow, ProcessedData } from '@/lib/types'

export default function App() {
  const [data, setData] = useState<ProcessedData | null>(null)
  const [source, setSource] = useState('')
  const [, setApiKey] = useState(() => localStorage.getItem('or_api_key') || '')

  const handleData = useCallback((rows: RawActivityRow[], src: string) => {
    const processed = processRows(rows)
    setData(processed)
    setSource(src)
  }, [])

  const handleReset = () => {
    setData(null)
    setSource('')
  }

  if (!data) {
    return <SetupScreen onData={handleData} onApiKey={setApiKey} />
  }

  return <Dashboard data={data} source={source} onReset={handleReset} />
}
