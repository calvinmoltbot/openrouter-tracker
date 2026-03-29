import type { ChartConfiguration } from 'chart.js'
import type { ProcessedData } from '@/lib/types'
import { PALETTE } from '@/data/colors'
import { fmt } from '@/lib/format'

type Colors = Record<string, string>

function themeColors(darkMode: boolean) {
  return {
    gridColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    tickColor: darkMode ? '#9ca3af' : '#6b7280',
    legendColor: darkMode ? '#9ca3af' : '#6b7280',
    tooltipBg: darkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
    tooltipTitleColor: darkMode ? '#f3f4f6' : '#111827',
    tooltipBodyColor: darkMode ? '#d1d5db' : '#374151',
    borderColor: darkMode ? 'rgba(255,255,255,0.15)' : '#fff',
  }
}

export function buildDailyCostConfig(data: ProcessedData, colors: Colors, darkMode: boolean): ChartConfiguration {
  const tc = themeColors(darkMode)

  const dailyTotals = data.days.map((_, i) =>
    data.models.reduce((sum, m) => sum + (data.dailyCost[m]?.[i] || 0), 0)
  )
  const cumulativeData = dailyTotals.reduce<number[]>((acc, val) => {
    acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + val)
    return acc
  }, [])

  return {
    type: 'bar',
    data: {
      labels: data.days.map(d => d.slice(5)),
      datasets: [
        ...data.models.map(m => ({
          label: m,
          data: data.dailyCost[m],
          backgroundColor: colors[m] + '99',
          borderColor: colors[m],
          borderWidth: 1,
        })),
        {
          label: 'Cumulative',
          type: 'line' as const,
          data: cumulativeData,
          borderColor: darkMode ? '#f59e0b' : '#d97706',
          borderWidth: 2,
          borderDash: [4, 4],
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false,
          yAxisID: 'y1',
          order: 0,
        },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, padding: 12, font: { size: 11 }, color: tc.legendColor } },
        tooltip: {
          backgroundColor: tc.tooltipBg,
          titleColor: tc.tooltipTitleColor,
          bodyColor: tc.tooltipBodyColor,
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label === 'Cumulative') return `Cumulative: ${fmt(ctx.parsed.y, 4)}`
              return `${ctx.dataset.label}: ${fmt(ctx.parsed.y, 4)}`
            },
            footer: items => {
              const barItems = items.filter(i => i.dataset.label !== 'Cumulative')
              return `Total: ${fmt(barItems.reduce((s, i) => s + i.parsed.y, 0), 4)}`
            }
          }
        }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 }, color: tc.tickColor } },
        y: { stacked: true, grid: { color: tc.gridColor }, ticks: { callback: v => '$' + v, color: tc.tickColor } },
        y1: {
          position: 'right' as const,
          grid: { drawOnChartArea: false },
          ticks: { callback: v => '$' + v, color: darkMode ? '#f59e0b' : '#d97706' },
        }
      }
    }
  }
}

export function buildPieConfig(data: ProcessedData, colors: Colors, darkMode: boolean): ChartConfiguration {
  const tc = themeColors(darkMode)
  return {
    type: 'doughnut',
    data: {
      labels: data.models.filter(m => data.modelTotals[m]?.cost > 0.01),
      datasets: [{
        data: data.models.filter(m => data.modelTotals[m]?.cost > 0.01).map(m => data.modelTotals[m].cost),
        backgroundColor: data.models.filter(m => data.modelTotals[m]?.cost > 0.01).map(m => colors[m] + 'cc'),
        borderWidth: 2, borderColor: tc.borderColor
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '55%',
      plugins: {
        legend: { position: 'right', labels: { usePointStyle: true, padding: 12, font: { size: 11 }, color: tc.legendColor } },
        tooltip: {
          backgroundColor: tc.tooltipBg,
          titleColor: tc.tooltipTitleColor,
          bodyColor: tc.tooltipBodyColor,
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

export function buildWeeklyConfig(data: ProcessedData, colors: Colors, darkMode: boolean): ChartConfiguration {
  const tc = themeColors(darkMode)
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
        legend: { position: 'top', labels: { usePointStyle: true, font: { size: 11 }, color: tc.legendColor } },
        tooltip: {
          backgroundColor: tc.tooltipBg,
          titleColor: tc.tooltipTitleColor,
          bodyColor: tc.tooltipBodyColor,
          callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` }
        }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { color: tc.tickColor } },
        y: { stacked: true, grid: { color: tc.gridColor }, ticks: { callback: v => '$' + v, color: tc.tickColor } }
      }
    }
  }
}

export function buildHourlyCostConfig(data: ProcessedData, darkMode: boolean): ChartConfiguration {
  const tc = themeColors(darkMode)
  const barColors = data.hourly.map(h => h.cost > 5 ? '#ef4444cc' : h.cost > 2 ? '#f59e0bcc' : '#3b82f6cc')
  return {
    type: 'bar',
    data: {
      labels: data.hourly.map(h => `${String(h.hour).padStart(2, '0')}:00`),
      datasets: [{ data: data.hourly.map(h => h.cost), backgroundColor: barColors, borderRadius: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tc.tooltipBg,
          titleColor: tc.tooltipTitleColor,
          bodyColor: tc.tooltipBodyColor,
          callbacks: { label: ctx => fmt(ctx.parsed.y) }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: tc.tickColor } },
        y: { grid: { color: tc.gridColor }, ticks: { callback: v => '$' + v, color: tc.tickColor } }
      }
    }
  }
}

export function buildHourlyCallsConfig(data: ProcessedData, darkMode: boolean): ChartConfiguration {
  const tc = themeColors(darkMode)
  return {
    type: 'bar',
    data: {
      labels: data.hourly.map(h => `${String(h.hour).padStart(2, '0')}:00`),
      datasets: [{ data: data.hourly.map(h => h.calls), backgroundColor: '#6366f1aa', borderRadius: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tc.tooltipBg,
          titleColor: tc.tooltipTitleColor,
          bodyColor: tc.tooltipBodyColor,
          callbacks: { label: ctx => `${ctx.parsed.y} calls` }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: tc.tickColor } },
        y: { grid: { color: tc.gridColor }, ticks: { color: tc.tickColor } }
      }
    }
  }
}

export function buildAppCostConfig(data: ProcessedData, darkMode: boolean): ChartConfiguration {
  const tc = themeColors(darkMode)
  const appNames = Object.keys(data.apps).sort((a, b) => data.apps[b].cost - data.apps[a].cost)
  return {
    type: 'bar',
    data: {
      labels: appNames,
      datasets: [{ data: appNames.map(a => data.apps[a].cost), backgroundColor: PALETTE.slice(0, appNames.length).map(c => c + 'cc'), borderRadius: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tc.tooltipBg,
          titleColor: tc.tooltipTitleColor,
          bodyColor: tc.tooltipBodyColor,
          callbacks: { label: ctx => `${fmt(ctx.parsed.y)} (${data.apps[appNames[ctx.dataIndex]].calls} calls)` }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: tc.tickColor } },
        y: { grid: { color: tc.gridColor }, ticks: { callback: v => '$' + v, color: tc.tickColor } }
      }
    }
  }
}

export function buildAppModelConfig(data: ProcessedData, colors: Colors, darkMode: boolean): ChartConfiguration {
  const tc = themeColors(darkMode)
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
        legend: { position: 'top', labels: { usePointStyle: true, font: { size: 10 }, color: tc.legendColor } },
        tooltip: {
          backgroundColor: tc.tooltipBg,
          titleColor: tc.tooltipTitleColor,
          bodyColor: tc.tooltipBodyColor,
          callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt(ctx.parsed.y, 4)}` }
        }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { color: tc.tickColor } },
        y: { stacked: true, grid: { color: tc.gridColor }, ticks: { callback: v => '$' + v, color: tc.tickColor } }
      }
    }
  }
}

export function buildCostPerCallConfig(data: ProcessedData, colors: Colors, darkMode: boolean): ChartConfiguration {
  const tc = themeColors(darkMode)
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
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tc.tooltipBg,
          titleColor: tc.tooltipTitleColor,
          bodyColor: tc.tooltipBodyColor,
          callbacks: { label: ctx => fmt(ctx.parsed.x / 1000, 6) + '/call' }
        }
      },
      scales: {
        x: { grid: { color: tc.gridColor }, ticks: { callback: v => '$' + (Number(v) / 1000).toFixed(4), color: tc.tickColor } },
        y: { grid: { display: false }, ticks: { color: tc.tickColor } }
      }
    }
  }
}

export function buildTokenVolumeConfig(data: ProcessedData, colors: Colors, darkMode: boolean): ChartConfiguration {
  const tc = themeColors(darkMode)
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
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tc.tooltipBg,
          titleColor: tc.tooltipTitleColor,
          bodyColor: tc.tooltipBodyColor,
          callbacks: { label: ctx => ctx.parsed.y.toFixed(1) + 'M tokens' }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45, color: tc.tickColor } },
        y: { grid: { color: tc.gridColor }, ticks: { callback: v => v + 'M', color: tc.tickColor } }
      }
    }
  }
}

export function buildEfficiencyScatterConfig(data: ProcessedData, colors: Colors, darkMode: boolean): ChartConfiguration {
  const tc = themeColors(darkMode)
  return {
    type: 'bubble',
    data: {
      datasets: data.models
        .filter(m => data.modelTotals[m]?.calls > 0)
        .map(m => {
          const t = data.modelTotals[m]
          const avgTokens = (t.promptTok + t.complTok) / t.calls
          const radius = Math.max(5, Math.min(30, Math.sqrt(t.calls) * 2))
          return {
            label: m,
            data: [{ x: avgTokens, y: t.avgCostPerCall, r: radius }],
            backgroundColor: colors[m] + '99',
            borderColor: colors[m],
            borderWidth: 1,
          }
        })
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, font: { size: 10 }, color: tc.legendColor } },
        tooltip: {
          backgroundColor: tc.tooltipBg,
          titleColor: tc.tooltipTitleColor,
          bodyColor: tc.tooltipBodyColor,
          callbacks: {
            label: ctx => {
              const ds = ctx.dataset
              const raw = ds.data[0] as { x: number; y: number }
              return `${ds.label}: ${fmt(raw.y, 6)}/call, ${Math.round(raw.x).toLocaleString()} tok/call`
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Avg Tokens / Call', color: tc.tickColor },
          grid: { color: tc.gridColor },
          ticks: { color: tc.tickColor },
        },
        y: {
          title: { display: true, text: 'Avg Cost / Call ($)', color: tc.tickColor },
          grid: { color: tc.gridColor },
          ticks: { callback: v => '$' + Number(v).toFixed(4), color: tc.tickColor },
        }
      }
    }
  }
}
