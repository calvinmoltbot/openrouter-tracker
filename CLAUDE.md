# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev      # Start Vite dev server (use --host 0.0.0.0 for remote access)
pnpm build    # Production build → dist/
pnpm preview  # Preview production build
pnpm lint     # ESLint (flat config, typescript-eslint)
```

## Stack

- **Framework:** Vite 8 + React 19 (TypeScript, strict mode)
- **Styling:** Tailwind CSS 4 (`@tailwindcss/vite`) + shadcn/ui components
- **Charts:** Chart.js + react-chartjs-2
- **CSV parsing:** papaparse
- **Icons:** lucide-react
- **Package manager:** pnpm
- **CI:** GitHub Actions (lint + build on push/PR to main)
- **Deployment:** Vercel (auto-deploy from main) at openrouter.warmwetcircles.com

## Architecture

Single-page dashboard for visualizing OpenRouter API spending. No routing, no backend.

**Data flow:** User provides data (API key or CSV upload) → `SetupScreen` → raw rows passed to `processRows()` → `ProcessedData` object → `Dashboard` renders charts.

### Source layout

```
src/
  components/
    ui/                  # shadcn/ui primitives (button, card, tabs, table, input, alert)
    setup-screen.tsx     # Data input screen (API key / CSV drag-drop)
    dashboard.tsx        # Dashboard shell: state, header, tabs, budget bar, KPIs
    dashboard-header.tsx # Top bar with export/reset actions
    budget-bar.tsx       # Monthly budget progress bar
    kpi-row.tsx          # KPI summary cards
    chart-box.tsx        # Chart.js canvas wrapper (useRef/useEffect lifecycle)
    insights-panel.tsx   # Text insight cards (top spender, cron hotspots, trend)
    tab-overview.tsx     # Overview tab: daily cost, pie chart, weekly trend
    tab-models.tsx       # Models tab: table + cost-per-call + token volume charts
    tab-timing.tsx       # Timing tab: hourly cost/calls charts
    tab-apps.tsx         # Apps tab: per-app spend + app/model matrix
  data/
    processor.ts         # processRows(), parseCSV(), modelGroup(), appGroup()
    colors.ts            # 12-color PALETTE + buildColorMap()
  lib/
    types.ts             # Core interfaces: RawActivityRow, ProcessedData, ModelTotals, etc.
    format.ts            # fmt() and fmtK() number formatters
    chart-configs.ts     # All Chart.js config builder functions
    utils.ts             # cn() from shadcn (clsx + tailwind-merge)
  App.tsx                # Root: state + conditional render of Setup/Dashboard
  main.tsx               # Entry point
  index.css              # Tailwind + shadcn theme variables
```

**Key types** (`src/lib/types.ts`): `RawActivityRow` (CSV/API row shape), `ProcessedData` (aggregated data flowing to all dashboard components).

**Data sources:** OpenRouter Activity API (`/api/v1/activity` with provisioning key) or CSV upload. API key and budget persisted in `localStorage`.

## Path alias

`@/*` maps to `./src/*` — configured in both `tsconfig.json` and `vite.config.ts`.
