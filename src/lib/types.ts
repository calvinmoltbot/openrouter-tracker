export interface RawActivityRow {
  created_at: string
  model_permaslug: string
  app_name: string
  cost_total: string
  tokens_prompt: string
  tokens_completion: string
}

export interface ModelTotals {
  cost: number
  calls: number
  promptTok: number
  complTok: number
  avgCostPerCall: number
}

export interface AppStats {
  cost: number
  calls: number
  models: Record<string, number>
}

export interface HourlyBucket {
  hour: number
  cost: number
  calls: number
}

export interface ProcessedData {
  days: string[]
  models: string[]
  dailyCost: Record<string, number[]>
  dailyCalls: Record<string, number[]>
  modelTotals: Record<string, ModelTotals>
  apps: Record<string, AppStats>
  hourly: HourlyBucket[]
  weekly: Record<string, Record<string, number>>
  totalCost: number
  totalCalls: number
  dateRange: string
}
