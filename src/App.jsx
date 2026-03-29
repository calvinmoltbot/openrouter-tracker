import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Chart, registerables } from 'chart.js'
import { processRows, parseCSV } from './dataProcessor'
import { buildColorMap, PALETTE } from './colors'

Chart.register(...registerables)

// ── Helpers ──
const fmt = (n, d = 2) => '$' + n.toFixed(d)
const fmtK = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'K' : n.toLocaleString()

// ── ChartBox: renders a Chart.js canvas ──
function ChartBox({ id, config, height = 300 }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    if (!canvasRef.current || !config) return
    chartRef.current = new Chart(canvasRef.current, config)
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [config])

  return <canvas ref={canvasRef} style={{ maxHeight: height }} />
}

// ── Setup Screen ──
function SetupScreen({ onData, onApiKey }) {
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileRef = useRef()

  const fetchFromApi = async () => {
    if (!key.trim()) return setError('Please enter your provisioning API key')
    setLoading(true)
    setError('')
    try {
      // Fetch last 30 days
      const res = await fetch('https://openrouter.ai/api/v1/activity', {
        headers: { 'Authorization': `Bearer ${key.trim()}` }
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`API returned ${res.status}: ${body.slice(0, 200)}`)
      }
      const json = await res.json()
      // The API response format may vary - try to extract rows
      let rows = []
      if (Array.isArray(json)) rows = json
      else if (json.data && Array.isArray(json.data)) rows = json.data
      else if (json.activity) rows = json.activity
      else rows = [json] // fallback

      if (rows.length === 0) throw new Error('No activity data returned')

      localStorage.setItem('or_api_key', key.trim())
      onApiKey(key.trim())
      onData(rows, 'api')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const rows = parseCSV(e.target.result)
        if (rows.length === 0) return setError('No data found in CSV')
        onData(rows, 'csv')
      } catch (err) {
        setError('Could not parse CSV: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="setup">
      <h1>OpenRouter Cost Tracker</h1>
      <p>Monitor your API spending across models and apps</p>

      {error && <div className="alert" style={{ textAlign: 'left', marginBottom: 16 }}><strong>Error:</strong> {error}</div>}

      <div className="setup-card">
        <h3>Option 1: Connect via API</h3>
        <label>OpenRouter Provisioning API Key</label>
        <input
          className="input"
          type="password"
          placeholder="sk-or-..."
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchFromApi()}
        />
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
          Get this from <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener" style={{ color: '#3b82f6' }}>OpenRouter Settings &rarr; Keys</a>. Needs a provisioning key, not a regular API key.
        </p>
        <button className="btn btn-primary" style={{ color: 'white', width: '100%' }} onClick={fetchFromApi} disabled={loading}>
          {loading ? 'Connecting...' : 'Fetch Activity Data'}
        </button>
      </div>

      <div className="setup-or">or</div>

      <div className="setup-card">
        <h3>Option 2: Upload CSV Export</h3>
        <div
          className={'file-drop' + (dragActive ? ' active' : '')}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
        >
          Drop your OpenRouter activity CSV here, or click to browse
          <input ref={fileRef} type="file" accept=".csv" onChange={e => handleFile(e.target.files[0])} />
        </div>
        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
          Export from <a href="https://openrouter.ai/activity" target="_blank" rel="noopener" style={{ color: '#3b82f6' }}>OpenRouter Activity page</a>
        </p>
      </div>
    </div>
  )
}

// ── Budget Bar ──
function BudgetBar({ spent, budget, onChange }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
  const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981'
  const projected = spent // could project based on days remaining

  return (
    <div className="budget-row">
      <label>Monthly Budget:</label>
      <span>$</span>
      <input
        className="budget-input"
        type="number"
        value={budget}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        min="0"
        step="5"
      />
      <div className="budget-bar-bg">
        <div className="budget-bar-fill" style={{ width: `${Math.max(pct, 8)}%`, background: color }}>
          {fmt(spent)} / {fmt(budget, 0)} ({pct.toFixed(0)}%)
        </div>
      </div>
      {pct > 80 && <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>Over 80% of budget used</span>}
    </div>
  )
}

// ── Main Dashboard ──
function Dashboard({ data, source, onReset }) {
  const [tab, setTab] = useState('overview')
  const [budget, setBudget] = useState(() => {
    const saved = localStorage.getItem('or_budget')
    return saved ? parseFloat(saved) : 50
  })

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

  // Chart configs
  const dailyCostConfig = {
    type: 'bar',
    data: {
      labels: data.days.map(d => d.slice(5)),
      datasets: data.models.map(m => ({
        label: m,
        data: data.dailyCost[m],
        backgroundColor: colors[m] + '99',
        borderColor: colors[m],
        borderWidth: 1,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, padding: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${fmt(ctx.parsed.y, 4)}`,
            footer: items => `Total: ${fmt(items.reduce((s, i) => s + i.parsed.y, 0), 4)}`
          }
        }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { stacked: true, ticks: { callback: v => '$' + v } }
      }
    }
  }

  const pieConfig = {
    type: 'doughnut',
    data: {
      labels: data.models.filter(m => data.modelTotals[m]?.cost > 0.01),
      datasets: [{
        data: data.models.filter(m => data.modelTotals[m]?.cost > 0.01).map(m => data.modelTotals[m].cost),
        backgroundColor: data.models.filter(m => data.modelTotals[m]?.cost > 0.01).map(m => colors[m] + 'cc'),
        borderWidth: 2, borderColor: '#fff'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '55%',
      plugins: {
        legend: { position: 'right', labels: { usePointStyle: true, padding: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const t = ctx.dataset.data.reduce((a, b) => a + b, 0)
              return `${ctx.label}: ${fmt(ctx.parsed)} (${(ctx.parsed / t * 100).toFixed(1)}%)`
            }
          }
        }
      }
    }
  }

  const weeks = Object.keys(data.weekly).sort()
  const weeklyConfig = {
    type: 'bar',
    data: {
      labels: weeks,
      datasets: data.models.filter(m => weeks.some(w => (data.weekly[w]?.[m] || 0) > 0.01)).map(m => ({
        label: m,
        data: weeks.map(w => data.weekly[w]?.[m] || 0),
        backgroundColor: colors[m] + 'cc',
        borderColor: colors[m],
        borderWidth: 1,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` } }
      },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, ticks: { callback: v => '$' + v } }
      }
    }
  }

  const hourlyBarColors = data.hourly.map(h => h.cost > 5 ? '#ef4444cc' : h.cost > 2 ? '#f59e0bcc' : '#3b82f6cc')
  const hourlyCostConfig = {
    type: 'bar',
    data: {
      labels: data.hourly.map(h => `${String(h.hour).padStart(2, '0')}:00`),
      datasets: [{ data: data.hourly.map(h => h.cost), backgroundColor: hourlyBarColors, borderRadius: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmt(ctx.parsed.y) } } },
      scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { ticks: { callback: v => '$' + v } } }
    }
  }

  const hourlyCallsConfig = {
    type: 'bar',
    data: {
      labels: data.hourly.map(h => `${String(h.hour).padStart(2, '0')}:00`),
      datasets: [{ data: data.hourly.map(h => h.calls), backgroundColor: '#6366f1aa', borderRadius: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y} calls` } } },
      scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: {} }
    }
  }

  const appNames = Object.keys(data.apps).sort((a, b) => data.apps[b].cost - data.apps[a].cost)
  const appCostConfig = {
    type: 'bar',
    data: {
      labels: appNames,
      datasets: [{ data: appNames.map(a => data.apps[a].cost), backgroundColor: PALETTE.slice(0, appNames.length).map(c => c + 'cc'), borderRadius: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${fmt(ctx.parsed.y)} (${data.apps[appNames[ctx.dataIndex]].calls} calls)` } } },
      scales: { x: { grid: { display: false } }, y: { ticks: { callback: v => '$' + v } } }
    }
  }

  const appModels = [...new Set(appNames.flatMap(a => Object.keys(data.apps[a].models)))]
  const appModelConfig = {
    type: 'bar',
    data: {
      labels: appNames,
      datasets: appModels.map(m => ({
        label: m,
        data: appNames.map(a => data.apps[a].models[m] || 0),
        backgroundColor: (colors[m] || '#999') + 'cc',
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, font: { size: 10 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt(ctx.parsed.y, 4)}` } }
      },
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: v => '$' + v } } }
    }
  }

  // KPI calculations
  const last7Cost = data.days.slice(-7)
  const prev7Cost = data.days.slice(-14, -7)
  const sum7 = (days) => {
    let s = 0
    for (const m of data.models) {
      for (let i = 0; i < data.days.length; i++) {
        if (days.includes(data.days[i])) s += (data.dailyCost[m]?.[i] || 0)
      }
    }
    return s
  }
  const last7Total = sum7(last7Cost)
  const prev7Total = sum7(prev7Cost)
  const weekTrend = prev7Total > 0 ? ((last7Total - prev7Total) / prev7Total * 100).toFixed(0) : 0

  // Find top model
  const topModel = data.models[0]
  const topPct = data.totalCost > 0 ? ((data.modelTotals[topModel]?.cost || 0) / data.totalCost * 100).toFixed(0) : 0

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>OpenRouter Cost Tracker</h1>
          <div className="header-sub">{data.dateRange} &middot; {data.totalCalls.toLocaleString()} calls &middot; Source: {source}</div>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={exportReport}>Export Report</button>
          <button className="btn" onClick={onReset}>Change Data Source</button>
        </div>
      </div>

      <BudgetBar spent={data.totalCost} budget={budget} onChange={setBudget} />

      {topModel && data.modelTotals[topModel]?.cost > data.totalCost * 0.5 && (
        <div className="alert">
          <span style={{ fontSize: 18 }}>&#9888;</span>
          <span>
            <strong>{topModel} accounts for {topPct}% of your spend ({fmt(data.modelTotals[topModel].cost)} of {fmt(data.totalCost)})</strong>
            {topModel.includes('DeepSeek') && ' — check your cron job model assignments.'}
          </span>
        </div>
      )}

      <div className="kpi-row">
        <div className="kpi danger">
          <div className="kpi-label">Total Spend</div>
          <div className="kpi-value">{fmt(data.totalCost)}</div>
          <div className="kpi-detail">{data.totalCalls.toLocaleString()} API calls</div>
        </div>
        <div className="kpi warning">
          <div className="kpi-label">Top Model Cost</div>
          <div className="kpi-value">{fmt(data.modelTotals[topModel]?.cost || 0)}</div>
          <div className="kpi-detail">{topModel} ({topPct}%)</div>
        </div>
        <div className="kpi info">
          <div className="kpi-label">Last 7 Days</div>
          <div className="kpi-value">{fmt(last7Total)}</div>
          <div className="kpi-detail" style={{ color: parseInt(weekTrend) < 0 ? '#10b981' : '#ef4444' }}>
            {weekTrend}% vs prior 7d
          </div>
        </div>
        <div className="kpi info">
          <div className="kpi-label">Daily Avg</div>
          <div className="kpi-value">{fmt(data.totalCost / Math.max(data.days.length, 1))}</div>
          <div className="kpi-detail">
            Projected: ~${(data.totalCost / Math.max(data.days.length, 1) * 30).toFixed(0)}/mo
          </div>
        </div>
        <div className="kpi success">
          <div className="kpi-label">Models</div>
          <div className="kpi-value">{data.models.length}</div>
          <div className="kpi-detail">{Object.keys(data.apps).length} apps</div>
        </div>
      </div>

      <div className="tabs">
        {['overview', 'models', 'timing', 'apps'].map(t => (
          <button key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="chart-grid full">
            <div className="card">
              <h3>Daily Cost by Model</h3>
              <div className="card-sub">Stacked bars showing which models drive spend each day</div>
              <ChartBox id="daily-cost" config={dailyCostConfig} />
            </div>
          </div>
          <div className="chart-grid">
            <div className="card">
              <h3>Cost Share by Model</h3>
              <div className="card-sub">Total spend breakdown</div>
              <ChartBox id="pie" config={pieConfig} />
            </div>
            <div className="card">
              <h3>Weekly Cost Trend</h3>
              <div className="card-sub">Week-over-week by model</div>
              <ChartBox id="weekly" config={weeklyConfig} />
            </div>
          </div>
          <div className="insights">
            <div className="insight">
              <h4>Top Spender</h4>
              <p>
                <span className="hl-bad">{topModel}</span> consumed {fmt(data.modelTotals[topModel]?.cost || 0)} across {' '}
                {(data.modelTotals[topModel]?.calls || 0).toLocaleString()} calls at{' '}
                {fmt(data.modelTotals[topModel]?.avgCostPerCall || 0, 6)}/call.
              </p>
            </div>
            <div className="insight">
              <h4>Cron Hotspots</h4>
              <p>
                {(() => {
                  const sorted = [...data.hourly].sort((a, b) => b.cost - a.cost)
                  const top2 = sorted.slice(0, 2)
                  return `Busiest hours: ${top2.map(h => `${String(h.hour).padStart(2, '0')}:00 UTC (${fmt(h.cost)})`).join(' and ')}. These likely indicate cron job bursts.`
                })()}
              </p>
            </div>
            <div className="insight">
              <h4>Weekly Trend</h4>
              <p>
                {parseInt(weekTrend) < 0
                  ? <><span className="hl-good">Spending is down {Math.abs(weekTrend)}%</span> vs the prior 7 days.</>
                  : <><span className="hl-bad">Spending is up {weekTrend}%</span> vs the prior 7 days.</>
                }
              </p>
            </div>
          </div>
        </>
      )}

      {tab === 'models' && (
        <>
          <div className="card" style={{ marginBottom: 'var(--gap)' }}>
            <h3>Model Breakdown</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model</th><th>Cost</th><th>Calls</th><th>Avg $/call</th><th>Prompt Tokens</th>
                </tr>
              </thead>
              <tbody>
                {data.models.map(m => {
                  const t = data.modelTotals[m]
                  return (
                    <tr key={m}>
                      <td>
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: colors[m], marginRight: 8, verticalAlign: 'middle' }} />
                        {m}
                      </td>
                      <td><strong>{fmt(t.cost, 4)}</strong></td>
                      <td>{t.calls.toLocaleString()}</td>
                      <td>{fmt(t.avgCostPerCall, 6)}</td>
                      <td>{(t.promptTok / 1e6).toFixed(1)}M</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="chart-grid">
            <div className="card">
              <h3>Cost per API Call</h3>
              <div className="card-sub">Average cost efficiency by model</div>
              <ChartBox id="cost-per-call" config={{
                type: 'bar',
                data: {
                  labels: [...data.models].sort((a, b) => (data.modelTotals[b]?.avgCostPerCall || 0) - (data.modelTotals[a]?.avgCostPerCall || 0)),
                  datasets: [{
                    data: [...data.models].sort((a, b) => (data.modelTotals[b]?.avgCostPerCall || 0) - (data.modelTotals[a]?.avgCostPerCall || 0))
                      .map(m => (data.modelTotals[m]?.avgCostPerCall || 0) * 1000),
                    backgroundColor: [...data.models].sort((a, b) => (data.modelTotals[b]?.avgCostPerCall || 0) - (data.modelTotals[a]?.avgCostPerCall || 0))
                      .map(m => colors[m] + 'cc'),
                    borderRadius: 4
                  }]
                },
                options: {
                  responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                  plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmt(ctx.parsed.x / 1000, 6) + '/call' } } },
                  scales: { x: { ticks: { callback: v => '$' + (v / 1000).toFixed(4) } }, y: { grid: { display: false } } }
                }
              }} />
            </div>
            <div className="card">
              <h3>Token Volume</h3>
              <div className="card-sub">Prompt tokens processed (millions)</div>
              <ChartBox id="tokens" config={{
                type: 'bar',
                data: {
                  labels: data.models,
                  datasets: [{
                    data: data.models.map(m => (data.modelTotals[m]?.promptTok || 0) / 1e6),
                    backgroundColor: data.models.map(m => colors[m] + 'cc'),
                    borderRadius: 4
                  }]
                },
                options: {
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.parsed.y.toFixed(1) + 'M tokens' } } },
                  scales: { x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } }, y: { ticks: { callback: v => v + 'M' } } }
                }
              }} />
            </div>
          </div>
        </>
      )}

      {tab === 'timing' && (
        <div className="chart-grid">
          <div className="card">
            <h3>Cost by Hour of Day (UTC)</h3>
            <div className="card-sub">When are your cron jobs firing?</div>
            <ChartBox id="hourly-cost" config={hourlyCostConfig} />
          </div>
          <div className="card">
            <h3>Calls by Hour of Day (UTC)</h3>
            <div className="card-sub">Call volume reveals scheduling clusters</div>
            <ChartBox id="hourly-calls" config={hourlyCallsConfig} />
          </div>
        </div>
      )}

      {tab === 'apps' && (
        <div className="chart-grid">
          <div className="card">
            <h3>Spend by App</h3>
            <div className="card-sub">Which applications cost money</div>
            <ChartBox id="app-cost" config={appCostConfig} />
          </div>
          <div className="card">
            <h3>App / Model Matrix</h3>
            <div className="card-sub">Which models each app uses</div>
            <ChartBox id="app-model" config={appModelConfig} />
          </div>
        </div>
      )}

      <div className="footer">
        OpenRouter Cost Tracker &middot; Data from {source === 'api' ? 'OpenRouter API' : 'CSV export'}
      </div>
    </div>
  )
}

// ── App Root ──
export default function App() {
  const [data, setData] = useState(null)
  const [source, setSource] = useState('')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('or_api_key') || '')

  const handleData = useCallback((rows, src) => {
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
