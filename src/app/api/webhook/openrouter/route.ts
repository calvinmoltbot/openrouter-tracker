import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { logRows, settings } from '@/db/schema'

// No auth middleware — this endpoint is called by OpenRouter's broadcast system
// Optionally verify with a shared secret header
export const dynamic = 'force-dynamic'

interface OtlpAttribute {
  key: string
  value: { stringValue?: string; intValue?: string | number; doubleValue?: number }
}

interface OtlpSpan {
  traceId: string
  spanId: string
  parentSpanId?: string
  name: string
  startTimeUnixNano: string
  endTimeUnixNano: string
  attributes: OtlpAttribute[]
  status?: { code: number }
}

function getAttr(attrs: OtlpAttribute[], key: string): string | number | undefined {
  const attr = attrs.find(a => a.key === key)
  if (!attr) return undefined
  if (attr.value.stringValue !== undefined) return attr.value.stringValue
  if (attr.value.doubleValue !== undefined) return attr.value.doubleValue
  if (attr.value.intValue !== undefined) {
    const v = attr.value.intValue
    return typeof v === 'string' ? parseInt(v) : v
  }
  return undefined
}

function getNum(attrs: OtlpAttribute[], key: string): number {
  const v = getAttr(attrs, key)
  return typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) || 0 : 0
}

function getStr(attrs: OtlpAttribute[], key: string): string {
  const v = getAttr(attrs, key)
  return typeof v === 'string' ? v : ''
}

function spanToRow(span: OtlpSpan) {
  const a = span.attributes

  // Nanosecond timestamps — divide by 1e6 for ms (drop last 6 chars for safe integer math)
  const startMs = Math.floor(Number(span.startTimeUnixNano) / 1e6)
  const endMs = Math.floor(Number(span.endTimeUnixNano) / 1e6)
  const durationMs = endMs - startMs

  const model = getStr(a, 'gen_ai.response.model') || getStr(a, 'gen_ai.request.model')
  const app = getStr(a, 'openrouter.api_key_name')
  const cost = getNum(a, 'gen_ai.usage.total_cost') || (getNum(a, 'gen_ai.usage.input_cost') + getNum(a, 'gen_ai.usage.output_cost')) || getNum(a, 'gen_ai.usage.cost')
  const tokensPrompt = getNum(a, 'gen_ai.usage.input_tokens') || getNum(a, 'gen_ai.usage.prompt_tokens')
  const tokensCompletion = getNum(a, 'gen_ai.usage.output_tokens') || getNum(a, 'gen_ai.usage.completion_tokens')
  const tokensReasoning = getNum(a, 'gen_ai.usage.output_tokens.reasoning') || null
  const tokensCached = getNum(a, 'gen_ai.usage.input_tokens.cached') || null
  const provider = getStr(a, 'gen_ai.provider.name') || getStr(a, 'openrouter.provider_name')

  return {
    generationId: span.traceId + '_' + span.spanId,
    createdAt: new Date(startMs),
    model,
    app,
    costTotal: cost,
    tokensPrompt: Math.round(tokensPrompt),
    tokensCompletion: Math.round(tokensCompletion),
    requests: 1,
    tokensReasoning: tokensReasoning != null ? Math.round(tokensReasoning) : null,
    tokensCached: tokensCached != null ? Math.round(tokensCached) : null,
    costCache: null,
    generationTimeMs: durationMs > 0 ? durationMs : null,
    timeToFirstTokenMs: null,
    providerName: provider || null,
    apiKeyName: app || null,
  }
}

export async function POST(request: NextRequest) {
  // Optional: verify shared secret
  const secret = process.env.WEBHOOK_SECRET
  if (secret) {
    const provided = request.headers.get('x-webhook-secret') || request.headers.get('authorization')?.replace('Bearer ', '')
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const body = await request.json()

    // Parse OTLP resourceSpans format
    const resourceSpans = body.resourceSpans
    if (!Array.isArray(resourceSpans)) {
      return NextResponse.json({ error: 'Invalid OTLP payload' }, { status: 400 })
    }

    const rows: ReturnType<typeof spanToRow>[] = []

    for (const rs of resourceSpans) {
      const scopeSpans = rs.scopeSpans
      if (!Array.isArray(scopeSpans)) continue

      for (const ss of scopeSpans) {
        const spans = ss.spans
        if (!Array.isArray(spans)) continue

        for (const span of spans) {
          if (!span.attributes || !span.startTimeUnixNano) continue
          rows.push(spanToRow(span))
        }
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ stored: 0 })
    }

    // Debug: store last raw span attributes for troubleshooting
    try {
      const firstSpan = resourceSpans[0]?.scopeSpans?.[0]?.spans?.[0]
      if (firstSpan?.attributes) {
        const attrKeys = firstSpan.attributes.map((a: OtlpAttribute) => ({
          key: a.key,
          value: a.value.stringValue ?? a.value.doubleValue ?? a.value.intValue ?? null,
        }))
        await db().insert(settings).values({
          key: 'last_webhook_debug',
          value: attrKeys,
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: settings.key,
          set: { value: attrKeys, updatedAt: new Date() },
        })
      }
    } catch { /* debug is best-effort */ }

    // Insert in batches
    const batchSize = 500
    let inserted = 0
    for (let i = 0; i < rows.length; i += batchSize) {
      await db().insert(logRows).values(rows.slice(i, i + batchSize)).onConflictDoNothing()
      inserted += rows.length
    }

    return NextResponse.json({ stored: inserted })
  } catch (e) {
    console.error('Webhook error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
