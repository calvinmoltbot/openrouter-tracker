import { NextResponse } from 'next/server'
import { db } from '@/db'
import { logRows } from '@/db/schema'
import { desc } from 'drizzle-orm'

export async function GET() {
  try {
    const rows = await db()
      .select()
      .from(logRows)
      .orderBy(desc(logRows.createdAt))
      .limit(10000)

    // Map back to RawActivityRow shape for the client
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

    return NextResponse.json({ rows: mapped, count: mapped.length })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
