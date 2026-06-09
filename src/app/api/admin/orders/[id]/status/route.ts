/**
 * PATCH /api/admin/orders/[id]/status
 *
 * Avance manual de estado por el admin.
 * Transiciones permitidas:
 *   PENDING_PART          → READY_FOR_APPOINTMENT  (repuestos llegaron / pago en efectivo)
 *   READY_FOR_APPOINTMENT → VEHICLE_RECEIVED        (bypass check-in en casos especiales)
 *   cualquier activo      → CANCELLED
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const ALLOWED: Record<string, string[]> = {
  PENDING_PART:          ['READY_FOR_APPOINTMENT', 'CANCELLED'],
  READY_FOR_APPOINTMENT: ['VEHICLE_RECEIVED', 'CANCELLED'],
  VEHICLE_RECEIVED:      ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS:           ['QUALITY_CONTROL', 'CANCELLED'],
  QUALITY_CONTROL:       ['COMPLETED', 'CANCELLED'],
  PENDING_QUOTE:         ['CANCELLED'],
}

const bodySchema = z.object({
  status: z.string(),
  reason: z.string().max(200).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { status: newStatus, reason } = bodySchema.parse(await req.json())

    const wo = await prisma.workOrder.findUnique({
      where:  { id: params.id },
      select: { status: true },
    })
    if (!wo) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })

    const allowed = ALLOWED[wo.status] ?? []
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Transición inválida: ${wo.status} → ${newStatus}` },
        { status: 400 },
      )
    }

    const extraData: Record<string, unknown> = {}
    if (newStatus === 'COMPLETED') extraData.completedAt = new Date()
    if (newStatus === 'VEHICLE_RECEIVED') {
      extraData.checkInAt = new Date()
    }

    const updated = await prisma.workOrder.update({
      where: { id: params.id },
      data:  { status: newStatus as never, ...extraData },
      select: { id: true, status: true },
    })

    console.log(`[admin/status] ${params.id}: ${wo.status} → ${newStatus}${reason ? ` (${reason})` : ''}`)
    return NextResponse.json({ ok: true, status: updated.status })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
