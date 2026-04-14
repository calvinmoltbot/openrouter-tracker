import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { logRows } from '@/db/schema'
import { and, desc, gt, gte } from 'drizzle-orm'

const DEFAULT_DAYS = 90
const MAX_ROWS = 10000

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const sinceParam = url.searchParams.get('since')

    const since = sinceParam
      ? new Date(sinceParam)
      : new Date(Date.now() - DEFAULT_DAYS * 24 * 60 * 60 * 1000)

    // When incrementally fetching, we want rows strictly newer than `since`
    // so clients don't re-receive the boundary row they already have.
    const predicate = sinceParam
      ? gt(logRows.createdAt, since)
      : gte(logRows.createdAt, since)

    const rows = await db()
      .select()
      .from(logRows)
      .where(and(predicate))
      .orderBy(desc(logRows.createdAt))
      .limit(MAX_ROWS)

    const mapped = rows.map(r => ({
      created_at: r.createdAt.toISOString(),
      model_permaslug: r.model,
      app_name: r.app,
      cost_total: String(r.costTotal),
      tokens_prompt: String(r.tokensPrompt),
      tokens_completion: String(r.tokensCompletion),
      requests: String(r.requests),
      ...(r.tokensReasoning != null && { tokens_reasoning: String(r.tokensReasoning) }),
      ...(r.tokensCached != null && { tokens_cached: String(r.tokensCached) }),
      ...(r.costCache != null && { cost_cache: String(r.costCache) }),
      ...(r.generationTimeMs != null && { generation_time_ms: String(r.generationTimeMs) }),
      ...(r.timeToFirstTokenMs != null && { time_to_first_token_ms: String(r.timeToFirstTokenMs) }),
      ...(r.providerName && { provider_name: r.providerName }),
      ...(r.apiKeyName && { api_key_name: r.apiKeyName }),
    }))

    return NextResponse.json(
      { rows: mapped, count: mapped.length },
      {
        headers: {
          // Short private cache so reloads within a minute don't re-hit the DB
          'Cache-Control': 'private, max-age=60',
        },
      },
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
