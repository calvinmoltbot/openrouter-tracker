import { NextResponse } from 'next/server'

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
    return NextResponse.json(json)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
