/**
 * GET  /api/admin/orders/[id]/items  — lista items de la OT
 * POST /api/admin/orders/[id]/items  — agrega un item a la OT
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const addSchema = z.object({
  taskName:  z.string().min(2).max(120),
  taskType:  z.enum(['LABOR', 'PART']),
  laborPrice: z.number().nonnegative().default(0),
  partPrice:  z.number().nonnegative().default(0),
  quantity:   z.number().int().positive().default(1),
  estimatedMinutes: z.number().int().nonnegative().optional(),
  notes:     z.string().max(300).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const items = await prisma.orderItem.findMany({
    where:   { workOrderId: params.id },
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json({ items })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = addSchema.parse(await req.json())

    // Sólo se pueden agregar ítems si la OT está en PENDING_QUOTE
    const wo = await prisma.workOrder.findUnique({
      where:  { id: params.id },
      select: { status: true },
    })
    if (!wo) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    if (wo.status !== 'PENDING_QUOTE') {
      return NextResponse.json({ error: 'Solo se pueden editar órdenes en PENDING_QUOTE' }, { status: 400 })
    }

    const count = await prisma.orderItem.count({ where: { workOrderId: params.id } })

    const item = await prisma.orderItem.create({
      data: {
        workOrderId:      params.id,
        taskName:         body.taskName,
        taskType:         body.taskType,
        laborPrice:       body.taskType === 'LABOR' ? body.laborPrice : 0,
        partPrice:        body.taskType === 'PART'  ? body.partPrice  : 0,
        quantity:         body.quantity,
        estimatedMinutes: body.estimatedMinutes,
        notes:            body.notes,
        sortOrder:        count,
      },
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
