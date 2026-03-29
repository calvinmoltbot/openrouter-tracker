import type { ChartConfiguration } from 'chart.js'
import type { ProcessedData } from '@/lib/types'
import { PALETTE } from '@/data/colors'
import { fmt } from '@/lib/format'

type Colors = Record<string, string>

export function buildDailyCostConfig(data: ProcessedData, colors: Colors): ChartConfiguration {
  return {
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
}

export function buildPieConfig(data: ProcessedData, colors: Colors): ChartConfiguration {
  return {
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
              const t = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0)
              return `${ctx.label}: ${fmt(ctx.parsed as unknown as number)} (${((ctx.parsed as unknown as number) / t * 100).toFixed(1)}%)`
            }
          }
        }
      }
    }
  }
}

export function buildWeeklyConfig(data: ProcessedData, colors: Colors): ChartConfiguration {
  const weeks = Object.keys(data.weekly).sort()
  return {
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
}

export function buildHourlyCostConfig(data: ProcessedData): ChartConfiguration {
  const barColors = data.hourly.map(h => h.cost > 5 ? '#ef4444cc' : h.cost > 2 ? '#f59e0bcc' : '#3b82f6cc')
  return {
    type: 'bar',
    data: {
      labels: data.hourly.map(h => `${String(h.hour).padStart(2, '0')}:00`),
      datasets: [{ data: data.hourly.map(h => h.cost), backgroundColor: barColors, borderRadius: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmt(ctx.parsed.y) } } },
      scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { ticks: { callback: v => '$' + v } } }
    }
  }
}

export function buildHourlyCallsConfig(data: ProcessedData): ChartConfiguration {
  return {
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
}

export function buildAppCostConfig(data: ProcessedData): ChartConfiguration {
  const appNames = Object.keys(data.apps).sort((a, b) => data.apps[b].cost - data.apps[a].cost)
  return {
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
}

export function buildAppModelConfig(data: ProcessedData, colors: Colors): ChartConfiguration {
  const appNames = Object.keys(data.apps).sort((a, b) => data.apps[b].cost - data.apps[a].cost)
  const appModels = [...new Set(appNames.flatMap(a => Object.keys(data.apps[a].models)))]
  return {
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
}

export function buildCostPerCallConfig(data: ProcessedData, colors: Colors): ChartConfiguration {
  const sorted = [...data.models].sort((a, b) => (data.modelTotals[b]?.avgCostPerCall || 0) - (data.modelTotals[a]?.avgCostPerCall || 0))
  return {
    type: 'bar',
    data: {
      labels: sorted,
      datasets: [{
        data: sorted.map(m => (data.modelTotals[m]?.avgCostPerCall || 0) * 1000),
        backgroundColor: sorted.map(m => colors[m] + 'cc'),
        borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmt(ctx.parsed.x / 1000, 6) + '/call' } } },
      scales: { x: { ticks: { callback: v => '$' + (Number(v) / 1000).toFixed(4) } }, y: { grid: { display: false } } }
    }
  }
}

export function buildTokenVolumeConfig(data: ProcessedData, colors: Colors): ChartConfiguration {
  return {
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
  }
}
