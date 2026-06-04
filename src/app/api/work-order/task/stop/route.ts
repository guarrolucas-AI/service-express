/**
 * POST /api/work-order/task/stop
 *
 * Detiene el cronómetro de una tarea y registra los minutos reales.
 * Si era la última tarea de mano de obra → dispara trigger 80% (QUALITY_CONTROL + WhatsApp).
 *
 * Body: { orderItemId: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/errors'
import { stopTask } from '@/services/order.service'

const bodySchema = z.object({
  orderItemId: z.string().cuid(),
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { orderItemId } = bodySchema.parse(await req.json())
  const result = await stopTask(orderItemId)
  return NextResponse.json({ ok: true, data: result })
})
