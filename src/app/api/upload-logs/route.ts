import { NextRequest, NextResponse } from 'next/server'

// In-memory store for now — will be replaced by Postgres in #10
let storedRows: Record<string, unknown>[] = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rows = body.rows

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }

    storedRows = rows
    return NextResponse.json({ stored: rows.length })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    )
  }
}

export async function GET() {
  return NextResponse.json({ rows: storedRows, count: storedRows.length })
}
