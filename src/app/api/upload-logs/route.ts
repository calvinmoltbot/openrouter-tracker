import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { logRows } from '@/db/schema'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rows = body.rows

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }

    const values = rows.map((row: Record<string, string>) => ({
      generationId: row.generation_id || crypto.randomUUID(),
      createdAt: new Date(row.created_at),
      model: row.model_permaslug || row.model || '',
      app: row.app_name || '',
      costTotal: parseFloat(row.cost_total) || 0,
      tokensPrompt: parseInt(row.tokens_prompt) || 0,
      tokensCompletion: parseInt(row.tokens_completion) || 0,
      requests: parseInt(row.requests) || 1,
      tokensReasoning: row.tokens_reasoning ? parseInt(row.tokens_reasoning) : null,
      tokensCached: row.tokens_cached ? parseInt(row.tokens_cached) : null,
      costCache: row.cost_cache ? parseFloat(row.cost_cache) : null,
      generationTimeMs: row.generation_time_ms ? parseFloat(row.generation_time_ms) : null,
      timeToFirstTokenMs: row.time_to_first_token_ms ? parseFloat(row.time_to_first_token_ms) : null,
      providerName: row.provider_name || null,
      apiKeyName: row.api_key_name || null,
    }))

    // Insert in batches of 500 to avoid query size limits
    const batchSize = 500
    let inserted = 0
    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize)
      await db().insert(logRows).values(batch).onConflictDoNothing()
      inserted += batch.length
    }

    return NextResponse.json({ stored: inserted })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
