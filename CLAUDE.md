# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # Production build → dist/
npm run preview  # Preview production build
```

No test runner or linter is configured.

## Architecture

Single-page React app (Vite + React 18) that visualizes OpenRouter API spending. No routing, no backend, no TypeScript.

**Data flow:** User provides data (API key or CSV upload) → `SetupScreen` → raw rows passed to `processRows()` → aggregated data object → `Dashboard` renders charts via Chart.js.

**Key modules:**
- `src/App.jsx` — All UI components in one file: `SetupScreen` (data input), `Dashboard` (tabbed charts/tables/KPIs), `ChartBox` (Chart.js canvas wrapper), `BudgetBar`
- `src/dataProcessor.js` — `processRows()` aggregates raw activity rows into daily/weekly/hourly/model/app breakdowns. `modelGroup()` maps model slugs to display names. `parseCSV()` handles CSV import with a hand-rolled parser.
- `src/colors.js` — 12-color palette and `buildColorMap()` for consistent model→color assignment
- `src/styles.css` — All styles, CSS custom properties for theming

**Data sources:** OpenRouter Activity API (`/api/v1/activity` with provisioning key) or CSV file upload. API key and budget are persisted in `localStorage`.

**Dashboard tabs:** Overview (daily cost, cost share pie, weekly trend, insights), Models (table + cost-per-call + token volume charts), Timing (hourly cost/calls), Apps (spend by app, app/model matrix).
