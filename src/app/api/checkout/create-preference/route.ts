/**
 * POST /api/checkout/create-preference
 *
 * Resuelve los ítems del checkout contra el catálogo de repuestos.
 * Si todos tienen mapeo → crea preferencia de pago MP con split.
 * Si alguno falta     → suspende la orden en PENDING_QUOTE y alerta al backoffice.
 *
 * Body: { workOrderId: string; vehicleId: string; items: CheckoutItem[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/errors'
import {
  resolveItems,
  createPaymentPreference,
  suspendForManualQuote,
} from '@/services/payment.service'

const bodySchema = z.object({
  workOrderId: z.string().cuid(),
  vehicleId:   z.string().cuid(),
  items: z.array(z.object({
    taskName:          z.string().min(1),
    sparePartSku:      z.string().optional(),
    estimatedMinutes:  z.number().int().positive().optional(),
    quantity:          z.number().int().positive().default(1),
  })).min(1),
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { workOrderId, vehicleId, items } = body

  const { resolved, allResolved } = await resolveItems(items, vehicleId)

  if (!allResolved) {
    const missingSkus = items
      .filter((i) => i.sparePartSku)
      .filter((_, idx) => !resolved[idx]?.hasCompatiblePart)
      .map((i) => i.sparePartSku!)

    await suspendForManualQuote(workOrderId, missingSkus)

    return NextResponse.json({
      ok: false,
      code: 'PENDING_QUOTE',
      error: 'Algunos repuestos requieren cotización manual. El equipo te contactará pronto.',
      missingSkus,
    }, { status: 202 })
  }

  const preference = await createPaymentPreference(workOrderId)

  return NextResponse.json({
    ok: true,
    data: preference,
  })
})
