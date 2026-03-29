export interface TelegramConfig {
  chatId: string
  enabled: boolean
}

export function getTelegramConfig(): TelegramConfig {
  return {
    chatId: localStorage.getItem('or_telegram_chat_id') || '',
    enabled: localStorage.getItem('or_telegram_enabled') === 'true',
  }
}

export function saveTelegramConfig(config: TelegramConfig) {
  localStorage.setItem('or_telegram_chat_id', config.chatId)
  localStorage.setItem('or_telegram_enabled', String(config.enabled))
}

export async function sendTelegramAlert(message: string): Promise<boolean> {
  const config = getTelegramConfig()
  if (!config.enabled || !config.chatId) return false

  // Client-side app — can't call Telegram Bot API directly (CORS).
  // Store the alert as a pending message for external pickup
  // (e.g. Claude Code MCP plugin or a cron hook).
  localStorage.setItem(
    'or_pending_telegram',
    JSON.stringify({
      message,
      timestamp: Date.now(),
      chatId: config.chatId,
    })
  )

  return true
}

export type BudgetPeriod = 'daily' | 'weekly' | 'monthly'

export function getBudgetThresholds(): number[] {
  const saved = localStorage.getItem('or_budget_thresholds')
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as number[]
      if (Array.isArray(parsed) && parsed.length === 3) return parsed
    } catch {
      // fall through to default
    }
  }
  return [50, 80, 100]
}

export function saveBudgetThresholds(thresholds: number[]) {
  localStorage.setItem('or_budget_thresholds', JSON.stringify(thresholds))
}

export function getBudgetPeriod(): BudgetPeriod {
  return (localStorage.getItem('or_budget_period') as BudgetPeriod) || 'monthly'
}

export function saveBudgetPeriod(period: BudgetPeriod) {
  localStorage.setItem('or_budget_period', period)
}

export function getBudgetForPeriod(period: BudgetPeriod): number {
  const key = `or_budget_${period}`
  const saved = localStorage.getItem(key)
  if (saved) return parseFloat(saved) || 0
  // Defaults
  if (period === 'daily') return 5
  if (period === 'weekly') return 20
  return 50
}

export function saveBudgetForPeriod(period: BudgetPeriod, amount: number) {
  localStorage.setItem(`or_budget_${period}`, String(amount))
}
