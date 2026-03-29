# OpenRouter Cost Tracker — Professional Rewrite Prompt

## Who You Are
You are rebuilding the OpenRouter Cost Tracker from a working prototype into a **SaaS-grade personal finance dashboard** for API spending. The app already works — your job is to make it beautiful, insightful, and actionable.

## The User
Calvin runs ~35 projects on a headless Mac Mini, all hitting OpenRouter for LLM calls. His wife looks at the bill and asks: **"Why the hell are you spending so much on OpenRouter?"** This app needs to answer that question — clearly, visually, and immediately — while also giving Calvin the technical depth to actually optimize his spend.

## The Repo
`calvinmoltbot/openrouter-tracker` — a Vite 8 + React 19 + TypeScript app with Tailwind CSS 4, shadcn/ui, and Chart.js. Read `CLAUDE.md` for the full architecture. The app has two data sources: OpenRouter Activity API (via provisioning key) and Logs CSV export (manual upload with richer data including latency, caching, and per-key attribution).

## Design Philosophy
- **Dark mode first** — this is a dev tool, dark is the default
- **Layered information** — plain-English summary for anyone at the top, technical drill-down below
- **SaaS-grade polish** — glassmorphism, animations, loading states, micro-interactions. This should look like a paid product.
- **Actionable, not just informational** — don't just show data, tell the user what to do about it

## The Work — 7 Issues

These are tracked as GitHub issues. Implement them in the tier order below. Each issue has detailed requirements and acceptance criteria — read the full issue before starting.

### Tier 1 — Foundation (sequential, do first)
- **#1 Design System — Dark Mode + Visual Polish** — dark theme, glassmorphism, animations, loading skeletons, theme toggle
- **#3 Date Range Controls** — smart defaults (This Month), quick toggles (7d/14d/30d/90d/All), all components filter by range

### Tier 2 — Core Features (parallel, after Tier 1)
- **#2 Executive Summary — "The Wife View"** — hero section answering "how much?", "what's eating money?", "is it getting worse?" in plain English
- **#4 Budget Alerts + Telegram** — redesigned budget with thresholds, in-app visual alerts, Telegram push on dashboard load
- **#6 Enhanced Charts** — cumulative spend line, cost heatmap calendar, model efficiency scatter, dark mode chart support

### Tier 3 — Intelligence Layer (parallel, after Tier 2)
- **#5 Recommendations Engine** — analyze patterns, suggest cheaper models, flag waste, estimate savings
- **#7 Data Persistence & Comparison** — IndexedDB caching, instant reload, period-over-period comparison overlay

## Execution Strategy

Use `/recursive-build` or spawn parallel agents per tier:

1. **Read every issue** (`gh issue view <N> --repo calvinmoltbot/openrouter-tracker`) before writing any code
2. **Tier 1 is sequential**: #1 (Design System) first, then #3 (Date Range) — because date range components need the design system
3. **Tier 2 agents run in parallel**: one agent per issue (#2, #4, #6), each on a worktree branch, merged via PR
4. **Tier 3 agents run in parallel**: one agent per issue (#5, #7), each on a worktree branch, merged via PR
5. After each tier merges, verify: `pnpm lint && pnpm build` passes, then visually review at `http://100.90.11.37:<port>`

## Constraints

- **pnpm** only — no npm/yarn
- **No new frameworks** — stay with Vite + React + Tailwind + shadcn/ui + Chart.js
- **TypeScript strict** — all new code must be fully typed
- **Dev server**: `pnpm dev --host 0.0.0.0 --port 5173` (Mac Mini → MacBook via Tailscale)
- **No Turbopack** — this is Vite, not Next.js
- **Always check CI** after pushing: `gh run list --repo calvinmoltbot/openrouter-tracker --limit 1`
- **Dark mode must work** — every component, every chart, every text element must be readable in both themes
- **Don't break what works** — the current API and CSV flows must continue functioning throughout

## Quality Bar

Before marking any issue as done:
1. `pnpm lint` — zero errors
2. `pnpm build` — successful production build
3. Visual review — both dark and light mode, both data sources (API key + CSV upload)
4. CI green — `gh run list` shows success after push
5. Close the issue with a summary of what was implemented

## Key Files to Understand First

| File | What it does |
|------|-------------|
| `src/App.tsx` | Root state: data, source, keys, routing between Setup/Dashboard |
| `src/lib/types.ts` | All TypeScript interfaces — ProcessedData flows to every component |
| `src/data/processor.ts` | processRows() is the data pipeline — all aggregation happens here |
| `src/lib/chart-configs.ts` | All Chart.js configuration builders |
| `src/components/dashboard.tsx` | Dashboard shell: header, budget, KPIs, tabs |
| `src/index.css` | Tailwind + shadcn theme variables (dark mode tokens already here) |

## Example of "Done"

When this rewrite is complete, Calvin's wife should be able to glance at the dashboard and say:
- "You spent $47 this month, that's more than last month"
- "Most of it is some thing called DeepSeek"
- "It's going to be worse by the end of the month"

And Calvin should be able to:
- See exactly which apps and keys are driving cost
- Get recommendations for cheaper alternatives
- Set a budget and get a Telegram alert before he blows past it
- Compare this month to last month at a glance
- Load the dashboard instantly from cached data
