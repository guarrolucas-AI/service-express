/**
 * POST   /api/mechanic/auth — valida PIN y setea cookie de sesión
 * DELETE /api/mechanic/auth — cierra sesión (borra cookie)
 */
import { NextRequest, NextResponse } from 'next/server'

const MECHANIC_PIN = process.env.MECHANIC_PIN ?? '1234'
const COOKIE_NAME  = 'mechanic-session'
const COOKIE_VALUE = 'ok'
const MAX_AGE      = 60 * 60 * 10  // 10 horas (un turno de taller)

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json()
    if (!pin || String(pin) !== String(MECHANIC_PIN)) {
      return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE_NAME, COOKIE_VALUE, {
      httpOnly: true,
      sameSite: 'lax',
      path:     '/',
      maxAge:   MAX_AGE,
      secure:   process.env.NODE_ENV === 'production',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' })
  return res
}
