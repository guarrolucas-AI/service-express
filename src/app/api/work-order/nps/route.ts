/**
 * POST /api/work-order/nps
 *
 * Recibe la valoración NPS post-servicio del cliente (0–10).
 * Dispara recálculo de score del taller.
 *
 * Body: { workOrderId: string; score: number; comment?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/errors'
import { submitNps } from '@/services/order.service'

const bodySchema = z.object({
  workOrderId: z.string().cuid(),
  score:       z.number().int().min(0).max(10),
  comment:     z.string().max(500).optional(),
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { workOrderId, score, comment } = bodySchema.parse(await req.json())
  const result = await submitNps(workOrderId, score, comment)
  return NextResponse.json({ ok: true, data: result })
})
