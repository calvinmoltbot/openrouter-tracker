import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const SESSION_COOKIE = 'or_session'
const THIRTY_DAYS = 30 * 24 * 60 * 60

export async function POST(request: NextRequest) {
  const password = process.env.AUTH_PASSWORD
  if (!password) {
    return NextResponse.json({ error: 'AUTH_PASSWORD not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const submitted = body.password

    if (!submitted || typeof submitted !== 'string') {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    // Constant-time comparison to prevent timing attacks
    const match =
      submitted.length === password.length &&
      crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(password))

    if (!match) {
      return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
    }

    // Generate a session token
    const token = crypto.randomBytes(32).toString('hex')

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: THIRTY_DAYS,
      path: '/',
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
