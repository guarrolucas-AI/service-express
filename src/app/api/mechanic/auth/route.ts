/**
 * POST   /api/mechanic/auth — valida PIN contra DB y setea cookie de sesión
 * DELETE /api/mechanic/auth — cierra sesión (borra cookie)
 *
 * Cookie mechanic-session = User.id del mecánico autenticado.
 *
 * Fallback para backward compat: si no hay mecánicos en DB,
 * acepta MECHANIC_PIN del env var y usa MECHANIC_USER_ID como ID.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPin } from '@/lib/pin'

const COOKIE_NAME = 'mechanic-session'
const MAX_AGE     = 60 * 60 * 10  // 10 horas (un turno)

export async function POST(req: NextRequest) {
  try {
    const { mechanicId, pin } = await req.json()

    let sessionValue: string

    if (mechanicId) {
      // ── Flujo normal: validar contra DB ──────────────────────────────────
      const mechanic = await prisma.user.findFirst({
        where: { id: mechanicId, role: 'MECHANIC' },
        select: { id: true, passwordHash: true },
      })

      if (!mechanic || !mechanic.passwordHash) {
        return NextResponse.json({ error: 'Mecánico no encontrado o desactivado' }, { status: 401 })
      }

      if (!verifyPin(String(pin), mechanic.passwordHash)) {
        return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 })
      }

      sessionValue = mechanic.id
    } else {
      // ── Fallback: env var (cuando no hay mecánicos en DB todavía) ─────────
      const envPin = process.env.MECHANIC_PIN ?? '1234'
      if (String(pin) !== String(envPin)) {
        return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 })
      }
      sessionValue = process.env.MECHANIC_USER_ID ?? 'demo-mechanic-id'
    }

    const res = NextResponse.json({ ok: true, mechanicId: sessionValue })
    res.cookies.set(COOKIE_NAME, sessionValue, {
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
