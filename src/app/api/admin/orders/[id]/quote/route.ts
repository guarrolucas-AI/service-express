/**
 * POST /api/admin/orders/[id]/quote
 *
 * Backoffice: activa una cotización manual para una OT en PENDING_QUOTE.
 * El admin ingresa los montos de repuestos y mano de obra.
 * El sistema recalcula el split, crea la preferencia MP y envía el link al cliente.
 *
 * Body: { partsAmount: number; laborAmount: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/errors'
import { activateManualQuote } from '@/services/payment.service'

const bodySchema = z.object({
  partsAmount:  z.number().nonnegative(),
  laborAmount:  z.number().positive(),
})

export const POST = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: { id: string } },
) => {
  const workOrderId = params.id
  const body = bodySchema.parse(await req.json())
  const result = await activateManualQuote(workOrderId, body)
  return NextResponse.json({ ok: true, data: result })
})
