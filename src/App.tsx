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

  // Load data: cache-first, then incrementally top up from server.
  // Cache <5min old skips the network entirely; otherwise we fetch only rows
  // newer than the most recent cached row. A full fetch only happens when
  // there is no local cache.
  useEffect(() => {
    const FRESH_MS = 5 * 60 * 1000

    function maxTimestamp(rows: RawActivityRow[]): string | null {
      let max: string | null = null
      for (const r of rows) {
        if (r.created_at && (!max || r.created_at > max)) max = r.created_at
      }
      return max
    }

    async function loadData() {
      const cached = await getCachedData()

      // Fresh cache — render immediately, no network
      if (cached && Date.now() - cached.timestamp < FRESH_MS) {
        setRawRows(cached.rawRows)
        setSource(cached.source)
        setKeys(cached.keys)
        setCacheTimestamp(cached.timestamp)
        setLoading(false)
        return
      }

      // Stale or no cache — incremental fetch if we have a baseline, full otherwise
      const since = cached ? maxTimestamp(cached.rawRows) : null
      const url = since ? `/api/logs?since=${encodeURIComponent(since)}` : '/api/logs'

      try {
        const res = await fetch(url)
        if (res.ok) {
          const json = await res.json()
          const newRows: RawActivityRow[] = json.rows ?? []
          const merged = cached ? [...newRows, ...cached.rawRows] : newRows

          if (merged.length > 0) {
            setRawRows(merged)
            setSource(cached?.source || 'db')
            setCacheTimestamp(Date.now())

            // Refresh keys only on full loads; incremental updates don't need them
            let nextKeys = cached?.keys ?? []
            if (!since) {
              try {
                const keysRes = await fetch('/api/keys')
                if (keysRes.ok) {
                  const keysJson = await keysRes.json()
                  nextKeys = Array.isArray(keysJson) ? keysJson : (keysJson.data ?? [])
                }
              } catch { /* keep previous keys */ }
            }
            setKeys(nextKeys)
            cacheData(merged, cached?.source || 'db', nextKeys)
            setLoading(false)
            return
          }
        }
      } catch { /* fall through to cache */ }

      // Network failed or empty response — fall back to cache if we have one
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
