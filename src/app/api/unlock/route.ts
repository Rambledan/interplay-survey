import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'interplay_access'
const COOKIE_VALUE = 'granted'
const PASSWORD = process.env.LANDING_PASSWORD ?? 'interplay2026'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (password !== PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // 30-day session
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
