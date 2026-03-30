import { NextResponse } from 'next/server'
import { db } from '@/db'
import { activitySnapshots } from '@/db/schema'

export async function GET() {
  const key = process.env.OPENROUTER_PROV_KEY
  if (!key) {
    return NextResponse.json({ error: 'OPENROUTER_PROV_KEY not configured' }, { status: 500 })
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/activity', {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json(
        { error: `OpenRouter API returned ${res.status}: ${body.slice(0, 200)}` },
        { status: res.status },
      )
    }

    const json = await res.json()

    // Store activity snapshots in DB (best-effort)
    try {
      const rows = Array.isArray(json) ? json : (json.data ?? json.activity ?? [])
      if (rows.length > 0 && process.env.DATABASE_URL) {
        const values = rows.map((r: Record<string, string | number>) => ({
          id: `${r.date || r.created_at}_${r.model_permaslug || r.model}_${r.app_name || ''}`,
          date: String(r.date || r.created_at || '').slice(0, 10),
          model: String(r.model_permaslug || r.model || ''),
          app: String(r.app_name || ''),
          costTotal: Number(r.usage || r.cost_total || 0),
          tokensPrompt: Number(r.prompt_tokens || r.tokens_prompt || 0),
          tokensCompletion: Number(r.completion_tokens || r.tokens_completion || 0),
          requests: Number(r.requests || 0),
          providerName: r.provider_name ? String(r.provider_name) : null,
        }))

        const batchSize = 500
        for (let i = 0; i < values.length; i += batchSize) {
          await db().insert(activitySnapshots).values(values.slice(i, i + batchSize)).onConflictDoNothing()
        }
      }
    } catch {
      // Snapshot storage is best-effort — don't fail the response
    }

    return NextResponse.json(json)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
