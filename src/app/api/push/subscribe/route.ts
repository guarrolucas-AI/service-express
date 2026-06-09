/**
 * POST /api/push/subscribe — Guardar suscripción push de un cliente
 * DELETE /api/push/subscribe — Eliminar suscripción
 */

import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json() as {
    phone:        string
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  }

  if (!body.phone || !body.subscription?.endpoint) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const user = await prisma.user.findFirst({ where: { phone: body.phone } })
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  await prisma.pushSubscription.upsert({
    where:  { endpoint: body.subscription.endpoint },
    create: {
      userId:   user.id,
      endpoint: body.subscription.endpoint,
      p256dh:   body.subscription.keys.p256dh,
      auth:     body.subscription.keys.auth,
    },
    update: {
      userId: user.id,
      p256dh: body.subscription.keys.p256dh,
      auth:   body.subscription.keys.auth,
    },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const { endpoint } = await req.json() as { endpoint: string }
  if (!endpoint) return NextResponse.json({ error: 'Endpoint requerido' }, { status: 400 })

  await prisma.pushSubscription.deleteMany({ where: { endpoint } })
  return NextResponse.json({ ok: true })
}
