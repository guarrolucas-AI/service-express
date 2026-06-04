/**
 * POST /api/work-order/task/start
 *
 * Inicia el cronómetro de una tarea (OrderItem).
 * Transiciona la OT a IN_PROGRESS si es la primera tarea.
 *
 * Body: { orderItemId: string; mechanicUserId: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/errors'
import { startTask } from '@/services/order.service'

const bodySchema = z.object({
  orderItemId:    z.string().cuid(),
  mechanicUserId: z.string().cuid(),
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { orderItemId, mechanicUserId } = bodySchema.parse(await req.json())
  const result = await startTask(orderItemId, mechanicUserId)
  return NextResponse.json({ ok: true, data: result })
})
