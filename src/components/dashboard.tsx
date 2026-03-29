import { useState, useEffect } from 'react'
import { Chart, registerables } from 'chart.js'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard-header'
import { BudgetBar } from '@/components/budget-bar'
import { KpiRow } from '@/components/kpi-row'
import { TabOverview } from '@/components/tab-overview'
import { TabModels } from '@/components/tab-models'
import { TabTiming } from '@/components/tab-timing'
import { TabApps } from '@/components/tab-apps'
import { TabKeys } from '@/components/tab-keys'
import { buildColorMap } from '@/data/colors'
import { fmt } from '@/lib/format'
import { useTheme } from '@/lib/theme'
import type { ProcessedData, ApiKey } from '@/lib/types'

Chart.register(...registerables)

interface DashboardProps {
  data: ProcessedData
  source: string
  keys: ApiKey[]
  onReset: () => void
}

export function Dashboard({ data, source, keys, onReset }: DashboardProps) {
  const [budget, setBudget] = useState(() => {
    const saved = localStorage.getItem('or_budget')
    return saved ? parseFloat(saved) : 50
  })

  const { darkMode } = useTheme()
  const colors = buildColorMap(data.models)

  useEffect(() => {
    localStorage.setItem('or_budget', String(budget))
  }, [budget])

  const exportReport = () => {
    let text = `# OpenRouter Cost Report\n`
    text += `Period: ${data.dateRange}\n`
    text += `Total Spend: ${fmt(data.totalCost)}\n`
    text += `Total Calls: ${data.totalCalls.toLocaleString()}\n\n`
    text += `## Model Breakdown\n`
    for (const m of data.models) {
      const t = data.modelTotals[m]
      text += `- ${m}: ${fmt(t.cost)} (${t.calls} calls, avg ${fmt(t.avgCostPerCall, 6)}/call)\n`
    }
    text += `\n## App Breakdown\n`
    for (const [a, v] of Object.entries(data.apps)) {
      text += `- ${a}: ${fmt(v.cost)} (${v.calls} calls)\n`
    }
    text += `\n## Weekly Trend\n`
    for (const [w, models] of Object.entries(data.weekly).sort()) {
      const total = Object.values(models).reduce((s, v) => s + v, 0)
      text += `- ${w}: ${fmt(total)}\n`
    }

    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `openrouter-report-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // KPI calculations
  const last7Cost = data.days.slice(-7)
  const prev7Cost = data.days.slice(-14, -7)
  const sum7 = (dayList: string[]) => {
    let s = 0
    for (const m of data.models) {
      for (let i = 0; i < data.days.length; i++) {
        if (dayList.includes(data.days[i])) s += (data.dailyCost[m]?.[i] || 0)
      }
    }
    return s
  }
  const last7Total = sum7(last7Cost)
  const prev7Total = sum7(prev7Cost)
  const weekTrend = prev7Total > 0 ? ((last7Total - prev7Total) / prev7Total * 100).toFixed(0) : '0'

  const topModel = data.models[0]
  const topPct = data.totalCost > 0 ? ((data.modelTotals[topModel]?.cost || 0) / data.totalCost * 100).toFixed(0) : '0'

  return (
    <div className="max-w-[1400px] mx-auto p-4">
      <DashboardHeader
        dateRange={data.dateRange}
        totalCalls={data.totalCalls}
        source={source}
        onExport={exportReport}
        onReset={onReset}
      />

      <BudgetBar spent={data.totalCost} budget={budget} onChange={setBudget} />

      {topModel && data.modelTotals[topModel]?.cost > data.totalCost * 0.5 && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            <strong>{topModel} accounts for {topPct}% of your spend ({fmt(data.modelTotals[topModel].cost)} of {fmt(data.totalCost)})</strong>
            {topModel.includes('DeepSeek') && ' — check your cron job model assignments.'}
          </AlertDescription>
        </Alert>
      )}

      <KpiRow data={data} last7Total={last7Total} weekTrend={weekTrend} topModel={topModel} topPct={topPct} />

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="timing">Timing</TabsTrigger>
          <TabsTrigger value="apps">Apps</TabsTrigger>
          <TabsTrigger value="keys">Keys{keys.length > 0 ? ` (${keys.length})` : ''}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="animate-in fade-in duration-300">
          <TabOverview data={data} colors={colors} topModel={topModel} weekTrend={weekTrend} darkMode={darkMode} />
        </TabsContent>
        <TabsContent value="models" className="animate-in fade-in duration-300">
          <TabModels data={data} colors={colors} darkMode={darkMode} />
        </TabsContent>
        <TabsContent value="timing" className="animate-in fade-in duration-300">
          <TabTiming data={data} darkMode={darkMode} />
        </TabsContent>
        <TabsContent value="apps" className="animate-in fade-in duration-300">
          <TabApps data={data} colors={colors} darkMode={darkMode} />
        </TabsContent>
        <TabsContent value="keys" className="animate-in fade-in duration-300">
          <TabKeys keys={keys} darkMode={darkMode} />
        </TabsContent>
      </Tabs>

      <div className="text-center py-5 text-xs text-muted-foreground">
        OpenRouter Cost Tracker &middot; Data from {source === 'api' ? 'OpenRouter API' : 'CSV export'}
      </div>
    </div>
  )
}
