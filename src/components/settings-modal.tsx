'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  type BudgetPeriod,
  type TelegramConfig,
  getBudgetThresholds,
  saveBudgetThresholds,
  getBudgetForPeriod,
  saveBudgetForPeriod,
  getTelegramConfig,
  saveTelegramConfig,
  sendTelegramAlert,
} from '@/lib/telegram'

const PERIODS: { key: BudgetPeriod; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
]

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  period: BudgetPeriod
  onPeriodChange: (p: BudgetPeriod) => void
  onBudgetChange: (amount: number) => void
}

export function SettingsModal({ open, onClose, period, onPeriodChange, onBudgetChange }: SettingsModalProps) {
  const [thresholds, setThresholds] = useState(() => getBudgetThresholds())
  const [budgets, setBudgets] = useState(() => ({
    daily: getBudgetForPeriod('daily'),
    weekly: getBudgetForPeriod('weekly'),
    monthly: getBudgetForPeriod('monthly'),
  }))
  const [telegram, setTelegram] = useState<TelegramConfig>(() => getTelegramConfig())
  const [testStatus, setTestStatus] = useState<string | null>(null)

  if (!open) return null

  const handleThresholdChange = (idx: number, val: string) => {
    const next = [...thresholds]
    next[idx] = Math.max(0, Math.min(200, parseInt(val) || 0))
    setThresholds(next)
    saveBudgetThresholds(next)
  }

  const handleBudgetAmountChange = (p: BudgetPeriod, val: string) => {
    const amount = parseFloat(val) || 0
    setBudgets(prev => ({ ...prev, [p]: amount }))
    saveBudgetForPeriod(p, amount)
    if (p === period) onBudgetChange(amount)
  }

  const handlePeriodSwitch = (p: BudgetPeriod) => {
    onPeriodChange(p)
    onBudgetChange(budgets[p])
  }

  const handleTelegramToggle = () => {
    const next = { ...telegram, enabled: !telegram.enabled }
    setTelegram(next)
    saveTelegramConfig(next)
  }

  const handleChatIdChange = (val: string) => {
    const next = { ...telegram, chatId: val }
    setTelegram(next)
    saveTelegramConfig(next)
  }

  const handleTestAlert = async () => {
    setTestStatus('Sending...')
    const ok = await sendTelegramAlert('Test alert from OpenRouter Cost Tracker')
    setTestStatus(ok ? 'Alert queued' : 'Not configured')
    setTimeout(() => setTestStatus(null), 3000)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl p-6 max-w-md w-full mx-4 ring-1 ring-border max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        {/* Budget Settings */}
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Budget Settings</h3>

          {/* Period Selector */}
          <label className="text-xs text-muted-foreground mb-1.5 block">Budget Period</label>
          <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handlePeriodSwitch(key)}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  period === key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Budget Amounts */}
          <label className="text-xs text-muted-foreground mb-1.5 block">Budget Amounts</label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {PERIODS.map(({ key, label }) => (
              <div key={key}>
                <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={budgets[key]}
                    onChange={e => handleBudgetAmountChange(key, e.target.value)}
                    min={0}
                    step={1}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Thresholds */}
          <label className="text-xs text-muted-foreground mb-1.5 block">Alert Thresholds (%)</label>
          <div className="grid grid-cols-3 gap-2">
            {['Warning', 'Critical', 'Over'].map((label, i) => (
              <div key={label}>
                <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={thresholds[i]}
                    onChange={e => handleThresholdChange(i, e.target.value)}
                    min={0}
                    max={200}
                    className="h-8 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Telegram Alerts */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">Telegram Alerts</h3>

          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground">Enable Telegram alerts</span>
            <button
              onClick={handleTelegramToggle}
              className={cn(
                'w-10 h-5 rounded-full transition-colors relative',
                telegram.enabled ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 size-4 rounded-full bg-white transition-transform',
                  telegram.enabled ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>

          <label className="text-xs text-muted-foreground mb-1.5 block">Chat ID</label>
          <Input
            type="text"
            value={telegram.chatId}
            onChange={e => handleChatIdChange(e.target.value)}
            placeholder="e.g. 123456789"
            className="h-8 text-xs mb-3"
          />

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestAlert}
              disabled={!telegram.enabled || !telegram.chatId}
              className="text-xs h-7"
            >
              Send Test
            </Button>
            <span className="text-xs text-muted-foreground">
              {testStatus
                ? testStatus
                : telegram.enabled && telegram.chatId
                  ? 'Configured'
                  : 'Not configured'}
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}
