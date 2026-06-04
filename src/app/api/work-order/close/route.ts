/**
 * POST /api/work-order/close
 *
 * Cierra la orden de trabajo:
 *   - Marca la OT como COMPLETED
 *   - Envía WhatsApp 100% con link al informe
 *   - Dispara motor predictivo y recálculo de score en background
 *
 * Body: { workOrderId: string; reportUrl: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/errors'
import { closeWorkOrder } from '@/services/order.service'

const bodySchema = z.object({
  workOrderId: z.string().cuid(),
  reportUrl:   z.string().url(),
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { workOrderId, reportUrl } = bodySchema.parse(await req.json())
  const result = await closeWorkOrder(workOrderId, reportUrl)
  return NextResponse.json({ ok: true, data: result })
})
