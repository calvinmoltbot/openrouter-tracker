import { get, set, del } from 'idb-keyval'
import type { RawActivityRow, ApiKey } from '@/lib/types'

interface CachedData {
  rawRows: RawActivityRow[]
  source: string
  keys: ApiKey[]
  timestamp: number
}

export async function cacheData(rawRows: RawActivityRow[], source: string, keys: ApiKey[]): Promise<void> {
  await set('or_cached_data', { rawRows, source, keys, timestamp: Date.now() })
}

export async function getCachedData(): Promise<CachedData | null> {
  const data = await get<CachedData>('or_cached_data')
  return data ?? null
}

export async function clearCache(): Promise<void> {
  await del('or_cached_data')
}

export function formatCacheAge(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/** Returns true if the cached data is older than 24 hours */
export function isCacheStale(timestamp: number): boolean {
  return Date.now() - timestamp > 24 * 60 * 60 * 1000
}
