/**
 * POST /api/admin/auth   — valida password y setea cookie de sesión
 * DELETE /api/admin/auth — cierra sesión (borra cookie)
 */
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'express2026'
const COOKIE_NAME    = 'admin-session'
const COOKIE_VALUE   = 'ok'
const MAX_AGE        = 60 * 60 * 24 * 7  // 7 días

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
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
