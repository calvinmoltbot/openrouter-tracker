# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev      # Start Next.js dev server (binds 0.0.0.0, uses --webpack)
pnpm build    # Production build
pnpm start    # Start production server
pnpm lint     # ESLint (flat config, typescript-eslint)
```

## Stack

- **Framework:** Next.js 16 App Router + React 19 (TypeScript, strict mode)
- **Styling:** Tailwind CSS 4 (`@tailwindcss/postcss`) + shadcn/ui components
- **Charts:** Chart.js + react-chartjs-2 (client components)
- **CSV parsing:** papaparse
- **Icons:** lucide-react
- **Package manager:** pnpm
- **CI:** GitHub Actions (lint + build on push/PR to main)
- **Deployment:** Vercel (auto-deploy from main) at openrouter.warmwetcircles.com

## Architecture

Dashboard for visualizing OpenRouter API spending. Next.js App Router with server-side API routes.

**Data flow:** Server fetches from OpenRouter API using `OPENROUTER_PROV_KEY` env var → client calls `/api/activity` → raw rows passed to `processRows()` → `ProcessedData` object → `Dashboard` renders charts. CSV upload also supported client-side.

### Source layout

```
src/
  app/
    layout.tsx             # Root layout (html, body, ThemeProvider, fonts)
    page.tsx               # Main page (renders App component)
    globals.css            # Tailwind + shadcn theme variables
    api/
      activity/route.ts    # Proxy to OpenRouter Activity API (server-side)
      keys/route.ts        # Proxy to OpenRouter Keys API (server-side)
      upload-logs/route.ts # Accept CSV upload, store logs
      logs/route.ts        # Return stored log data
  components/
    ui/                    # shadcn/ui primitives (button, card, tabs, table, input, alert)
    setup-screen.tsx       # Data input screen (fetch API / CSV drag-drop)
    dashboard.tsx          # Dashboard shell: state, header, tabs, budget bar, KPIs
    dashboard-header.tsx   # Top bar with export/reset actions
    budget-bar.tsx         # Monthly budget progress bar
    kpi-row.tsx            # KPI summary cards
    chart-box.tsx          # Chart.js canvas wrapper (useRef/useEffect lifecycle)
    insights-panel.tsx     # Text insight cards (top spender, cron hotspots, trend)
    tab-overview.tsx       # Overview tab: daily cost, pie chart, weekly trend
    tab-models.tsx         # Models tab: table + cost-per-call + token volume charts
    tab-timing.tsx         # Timing tab: hourly cost/calls charts
    tab-apps.tsx           # Apps tab: per-app spend + app/model matrix
  data/
    processor.ts           # processRows(), parseCSV(), modelGroup(), appGroup()
    colors.ts              # 12-color PALETTE + buildColorMap()
  lib/
    types.ts               # Core interfaces: RawActivityRow, ProcessedData, ModelTotals, etc.
    format.ts              # fmt() and fmtK() number formatters
    chart-configs.ts       # All Chart.js config builder functions
    utils.ts               # cn() from shadcn (clsx + tailwind-merge)
  App.tsx                  # Root client component: state + conditional render of Setup/Dashboard
```

**Key types** (`src/lib/types.ts`): `RawActivityRow` (CSV/API row shape), `ProcessedData` (aggregated data flowing to all dashboard components).

**Data sources:** OpenRouter Activity API (proxied via `/api/activity`, provisioning key stored server-side in `OPENROUTER_PROV_KEY` env var) or CSV upload. Budget settings persisted in `localStorage`.

## Environment Variables

- `OPENROUTER_PROV_KEY` — OpenRouter provisioning API key (server-side only, set in Vercel)

## Path alias

`@/*` maps to `./src/*` — configured in `tsconfig.json`.
