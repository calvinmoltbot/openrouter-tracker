export interface RawActivityRow {
  created_at: string
  model_permaslug: string
  app_name: string
  cost_total: string
  tokens_prompt: string
  tokens_completion: string
  requests: string
  // Logs CSV extras (optional — only present in Logs export)
  tokens_reasoning?: string
  tokens_cached?: string
  cost_cache?: string
  generation_time_ms?: string
  time_to_first_token_ms?: string
  provider_name?: string
  api_key_name?: string
}

export interface ApiActivityRow {
  date: string
  model_permaslug: string
  model: string
  usage: number
  prompt_tokens: number
  completion_tokens: number
  requests: number
  provider_name: string
  endpoint_id: string
}

export interface ModelTotals {
  cost: number
  calls: number
  promptTok: number
  complTok: number
  avgCostPerCall: number
  reasoningTok: number
  cachedTok: number
  cacheSavings: number
  avgLatencyMs: number
  avgTtftMs: number
  latencyCount: number
}

export interface AppStats {
  cost: number
  calls: number
  models: Record<string, number>
  keys: Record<string, number>
}

export interface HourlyBucket {
  hour: number
  cost: number
  calls: number
}

export interface ApiKey {
  hash: string
  name: string
  label: string
  disabled: boolean
  limit: number | null
  limit_remaining: number | null
  usage: number
  usage_daily: number
  usage_weekly: number
  usage_monthly: number
  created_at: string
  updated_at: string | null
}

export interface ProviderStats {
  cost: number
  calls: number
}

export interface KeyStats {
  cost: number
  calls: number
  apps: Record<string, number>
  models: Record<string, number>
}

export interface ProcessedData {
  days: string[]
  models: string[]
  dailyCost: Record<string, number[]>
  dailyCalls: Record<string, number[]>
  modelTotals: Record<string, ModelTotals>
  apps: Record<string, AppStats>
  providers: Record<string, ProviderStats>
  keyStats: Record<string, KeyStats>
  dailyAppCost: Record<string, number[]>
  dailyKeyCost: Record<string, number[]>
  hourly: HourlyBucket[]
  weekly: Record<string, Record<string, number>>
  totalCost: number
  totalCalls: number
  totalCacheSavings: number
  totalReasoningTok: number
  totalCachedTok: number
  hasLogData: boolean
  dateRange: string
}
