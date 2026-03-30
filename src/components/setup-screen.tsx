'use client'

import { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Sun, Moon } from 'lucide-react'
import { parseCSV, normalizeApiRows } from '@/data/processor'
import { useTheme } from '@/lib/theme'
import type { RawActivityRow, ApiActivityRow, ApiKey } from '@/lib/types'

interface SetupScreenProps {
  onData: (rows: RawActivityRow[], source: string, keys?: ApiKey[]) => void
}

export function SetupScreen({ onData }: SetupScreenProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { darkMode, toggleTheme } = useTheme()

  const fetchFromApi = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/activity')
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(body.error || `API returned ${res.status}`)
      }
      const json = await res.json()
      let apiRows: ApiActivityRow[] = []
      if (Array.isArray(json)) apiRows = json
      else if (json.data && Array.isArray(json.data)) apiRows = json.data
      else if (json.activity) apiRows = json.activity
      else apiRows = [json]

      if (apiRows.length === 0) throw new Error('No activity data returned')
      const rows = normalizeApiRows(apiRows)

      // Fetch API keys (best-effort)
      let keys: ApiKey[] = []
      try {
        const keysRes = await fetch('/api/keys')
        if (keysRes.ok) {
          const keysJson = await keysRes.json()
          keys = Array.isArray(keysJson) ? keysJson : (keysJson.data ?? [])
        }
      } catch { /* keys fetch is best-effort */ }

      onData(rows, 'api', keys)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const rows = parseCSV(e.target?.result as string)
        if (rows.length === 0) return setError('No data found in CSV')
        onData(rows, 'csv')
      } catch (err) {
        setError('Could not parse CSV: ' + (err instanceof Error ? err.message : String(err)))
      }
    }
    reader.readAsText(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="max-w-[600px] mx-auto mt-20 text-center relative">
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="absolute top-0 right-0 size-8"
      >
        {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>

      <h1 className="text-[28px] font-bold mb-2">OpenRouter Cost Tracker</h1>
      <p className="text-muted-foreground mb-6">Monitor your API spending across models and apps</p>

      {error && (
        <Alert variant="destructive" className="text-left mb-4">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="text-left mb-4">
        <CardContent className="space-y-3">
          <h3 className="text-[15px] font-semibold">Option 1: Fetch from API</h3>
          <p className="text-xs text-muted-foreground">
            Fetches activity data using the provisioning key configured on the server.
          </p>
          <Button className="w-full" onClick={fetchFromApi} disabled={loading}>
            {loading ? 'Connecting...' : 'Fetch Activity Data'}
          </Button>
        </CardContent>
      </Card>

      <div className="text-muted-foreground text-[13px] my-4">or</div>

      <Card className="text-left">
        <CardContent className="space-y-3">
          <h3 className="text-[15px] font-semibold">Option 2: Upload CSV Export</h3>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors text-muted-foreground text-sm ${dragActive ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:border-blue-500'}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
          >
            Drop your OpenRouter activity CSV here, or click to browse
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
          </div>
          <p className="text-xs text-muted-foreground">
            Export from <a href="https://openrouter.ai/activity" target="_blank" rel="noopener" className="text-blue-500 hover:underline">OpenRouter Activity page</a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
