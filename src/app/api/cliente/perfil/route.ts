/**
 * PATCH /api/cliente/perfil
 * Actualiza datos básicos del cliente (identificado por teléfono)
 */

import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request) {
  const body = await req.json() as {
    phone:      string   // identificador — no cambia
    firstName?: string
    lastName?:  string
    email?:     string
  }

  if (!body.phone) return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 })

  const user = await prisma.user.findFirst({ where: { phone: body.phone } })
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(body.firstName && { firstName: body.firstName.trim() }),
      ...(body.lastName  && { lastName:  body.lastName.trim()  }),
      ...(body.email     && { email:     body.email.trim().toLowerCase() }),
    },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
  })

  return NextResponse.json(updated)
}
