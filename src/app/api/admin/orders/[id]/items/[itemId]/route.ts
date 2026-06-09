/**
 * DELETE /api/admin/orders/[id]/items/[itemId] — elimina un item
 * PATCH  /api/admin/orders/[id]/items/[itemId] — edita precio de un item
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const patchSchema = z.object({
  laborPrice:  z.number().nonnegative().optional(),
  partPrice:   z.number().nonnegative().optional(),
  quantity:    z.number().int().positive().optional(),
  taskName:    z.string().min(2).max(120).optional(),
})

type RouteContext = { params: { id: string; itemId: string } }

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    // Verificar que la OT esté en PENDING_QUOTE
    const item = await prisma.orderItem.findUnique({
      where: { id: params.itemId },
      select: { workOrderId: true, workOrder: { select: { status: true } } },
    })
    if (!item) return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })
    if (item.workOrder.status !== 'PENDING_QUOTE') {
      return NextResponse.json({ error: 'Solo editable en PENDING_QUOTE' }, { status: 400 })
    }

    await prisma.orderItem.delete({ where: { id: params.itemId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const body = patchSchema.parse(await req.json())
    const item = await prisma.orderItem.update({
      where: { id: params.itemId },
      data: body,
    })
    return NextResponse.json({ item })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
