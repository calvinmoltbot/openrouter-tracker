import { NextResponse } from 'next/server'

// Placeholder — will read from Postgres in #10
// For now, returns empty data since log storage is in-memory via /api/upload-logs
export async function GET() {
  return NextResponse.json({ rows: [], count: 0 })
}
