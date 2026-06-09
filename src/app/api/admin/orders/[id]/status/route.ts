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
import { sendPushToUser } from '@/lib/push'

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
      select: { status: true, userId: true, vehicle: { select: { brand: true, model: true, plate: true } } },
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

    // ── Push notification al cliente ────────────────────────────────────
    const PUSH_MSG: Record<string, { title: string; body: string }> = {
      PENDING_PART:          { title: '💰 Presupuesto listo',        body: 'Tu presupuesto está disponible para revisar.' },
      READY_FOR_APPOINTMENT: { title: '📅 Turno confirmado',         body: 'Tu turno quedó agendado. ¡Te esperamos!' },
      VEHICLE_RECEIVED:      { title: '🚗 Vehículo recibido',        body: 'Tu auto llegó al taller.' },
      IN_PROGRESS:           { title: '🔧 Trabajando en tu auto',    body: 'El mecánico ya empezó con los trabajos.' },
      QUALITY_CONTROL:       { title: '🔍 Casi listo',               body: 'Último control de calidad antes de entregarte el auto.' },
      COMPLETED:             { title: '🎉 ¡Tu auto está listo!',     body: 'Podés venir a retirarlo cuando quieras.' },
    }
    const msg = PUSH_MSG[newStatus]
    if (msg && wo.userId) {
      const plate = wo.vehicle?.plate ?? ''
      sendPushToUser(wo.userId, {
        title: msg.title,
        body:  `${wo.vehicle?.brand ?? ''} ${wo.vehicle?.model ?? ''} ${plate} — ${msg.body}`.trim(),
        url:   `/cliente/orden/${params.id}`,
        tag:   `order-${params.id}`,
      }).catch(console.error) // fire-and-forget, no bloquea la respuesta
    }

    console.log(`[admin/status] ${params.id}: ${wo.status} → ${newStatus}${reason ? ` (${reason})` : ''}`)
    return NextResponse.json({ ok: true, status: updated.status })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
