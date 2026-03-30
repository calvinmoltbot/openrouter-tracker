import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.OPENROUTER_PROV_KEY
  if (!key) {
    return NextResponse.json({ error: 'OPENROUTER_PROV_KEY not configured' }, { status: 500 })
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/keys', {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ data: [] })
    }

    const json = await res.json()
    return NextResponse.json(json)
  } catch {
    return NextResponse.json({ data: [] })
  }
}
