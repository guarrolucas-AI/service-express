/**
 * PATCH /api/admin/orders/[id]/assign
 * Asigna o desasigna un mecánico a una orden de trabajo.
 * Body: { mechanicId: string | null }
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const bodySchema = z.object({
  mechanicId: z.string().cuid().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { mechanicId } = bodySchema.parse(await req.json())

    // Verificar que el mecánico existe y está activo
    if (mechanicId) {
      const mechanic = await prisma.user.findFirst({
        where: { id: mechanicId, role: 'MECHANIC' },
        select: { id: true, passwordHash: true },
      })
      if (!mechanic) {
        return NextResponse.json({ error: 'Mecánico no encontrado' }, { status: 404 })
      }
      if (!mechanic.passwordHash) {
        return NextResponse.json({ error: 'El mecánico está desactivado' }, { status: 400 })
      }
    }

    const updated = await prisma.workOrder.update({
      where: { id: params.id },
      data:  { assignedMechanicId: mechanicId },
      select: { id: true, assignedMechanicId: true },
    })

    return NextResponse.json({ ok: true, assignedMechanicId: updated.assignedMechanicId })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
