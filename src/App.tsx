'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { SetupScreen } from '@/components/setup-screen'
import { Dashboard } from '@/components/dashboard'
import { processRows, filterRowsByRange, filterRowsByPreviousRange } from '@/data/processor'
import { cacheData, getCachedData, clearCache } from '@/lib/cache'
import { appGroup } from '@/data/processor'
import type { RawActivityRow, ApiKey } from '@/lib/types'

export default function App() {
  const [rawRows, setRawRows] = useState<RawActivityRow[] | null>(null)
  const [source, setSource] = useState('')
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [range, setRange] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('or_range') || 'month'
    }
    return 'month'
  })
  const [excludedApps, setExcludedApps] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('or_excluded_apps')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    }
    return new Set()
  })
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [compare, setCompare] = useState(false)

  // Load data: try server DB first, fall back to client cache
  useEffect(() => {
    async function loadData() {
      // Try fetching from server DB
      try {
        const res = await fetch('/api/logs')
        if (res.ok) {
          const json = await res.json()
          if (json.rows && json.rows.length > 0) {
            setRawRows(json.rows)
            setSource('db')
            setCacheTimestamp(Date.now())
            // Also fetch API keys (best-effort)
            try {
              const keysRes = await fetch('/api/keys')
              if (keysRes.ok) {
                const keysJson = await keysRes.json()
                const k = Array.isArray(keysJson) ? keysJson : (keysJson.data ?? [])
                setKeys(k)
                cacheData(json.rows, 'db', k)
              } else {
                cacheData(json.rows, 'db', [])
              }
            } catch {
              cacheData(json.rows, 'db', [])
            }
            setLoading(false)
            return
          }
        }
      } catch { /* fall through to cache */ }

      // Fall back to client-side cache
      const cached = await getCachedData()
      if (cached) {
        setRawRows(cached.rawRows)
        setSource(cached.source)
        setKeys(cached.keys)
        setCacheTimestamp(cached.timestamp)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  useEffect(() => {
    localStorage.setItem('or_range', range)
  }, [range])

  useEffect(() => {
    localStorage.setItem('or_excluded_apps', JSON.stringify([...excludedApps]))
  }, [excludedApps])

  const filterExcluded = useCallback((rows: RawActivityRow[]) => {
    if (excludedApps.size === 0) return rows
    return rows.filter(r => !excludedApps.has(appGroup(r.app_name)))
  }, [excludedApps])

  // All unique app names from rawRows (for the exclusion UI)
  const allApps = useMemo(() => {
    if (!rawRows) return []
    const apps = new Set<string>()
    for (const r of rawRows) apps.add(appGroup(r.app_name))
    return [...apps].sort()
  }, [rawRows])

  const data = useMemo(() => {
    if (!rawRows) return null
    const filtered = filterExcluded(filterRowsByRange(rawRows, range))
    return processRows(filtered)
  }, [rawRows, range, filterExcluded])

  const fullData = useMemo(() => {
    if (!rawRows) return null
    return processRows(filterExcluded(rawRows))
  }, [rawRows, filterExcluded])

  const prevData = useMemo(() => {
    if (!rawRows || !compare) return null
    const prevFiltered = filterExcluded(filterRowsByPreviousRange(rawRows, range))
    return processRows(prevFiltered)
  }, [rawRows, range, compare, filterExcluded])

  const handleData = useCallback((rows: RawActivityRow[], src: string, apiKeys?: ApiKey[]) => {
    setRawRows(rows)
    setSource(src)
    const k = apiKeys ?? []
    setKeys(k)
    const now = Date.now()
    setCacheTimestamp(now)
    cacheData(rows, src, k)
  }, [])

  const handleReset = () => {
    setRawRows(null)
    setSource('')
    setKeys([])
    setCacheTimestamp(null)
    clearCache()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading...</div>
  }

  if (!data) {
    return <SetupScreen onData={handleData} />
  }

  return (
    <Dashboard
      data={data}
      fullData={fullData}
      prevData={prevData}
      rawRows={rawRows!}
      source={source}
      keys={keys}
      range={range}
      onRangeChange={setRange}
      onReset={handleReset}
      cacheTimestamp={cacheTimestamp}
      compare={compare}
      onCompareToggle={() => setCompare(c => !c)}
      allApps={allApps}
      excludedApps={excludedApps}
      onExcludedAppsChange={setExcludedApps}
    />
  )
}
