/**
 * PATCH  /api/admin/mechanics/[id]  — edita nombre, teléfono o PIN
 * DELETE /api/admin/mechanics/[id]  — desactiva (borra hash → no puede hacer login)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { hashPin } from '@/lib/pin'

type Ctx = { params: { id: string } }

const patchSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName:  z.string().min(2).max(50).optional(),
  phone:     z.string().max(20).optional(),
  pin:       z.string().regex(/^\d{4,6}$/).optional(),
})

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const body = patchSchema.parse(await req.json())
    const data: Record<string, string | null | undefined> = {
      firstName: body.firstName,
      lastName:  body.lastName,
      phone:     body.phone,
    }
    if (body.pin) data.passwordHash = hashPin(body.pin)

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, firstName: true, lastName: true, phone: true, passwordHash: true },
    })

    return NextResponse.json({
      mechanic: {
        id:        updated.id,
        firstName: updated.firstName,
        lastName:  updated.lastName,
        phone:     updated.phone,
        active:    !!updated.passwordHash,
      },
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await prisma.user.update({
      where: { id: params.id },
      data:  { passwordHash: null },   // bloquea el login sin eliminar el registro
    })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
