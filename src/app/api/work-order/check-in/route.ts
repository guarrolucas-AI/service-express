/**
 * POST /api/work-order/check-in
 *
 * Inicia la recepción del vehículo.
 * Requiere 3 URLs de fotos (ya subidas a Vercel Blob / S3) y el km actual.
 *
 * Body: CheckInPayload
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/errors'
import { checkIn } from '@/services/order.service'

const bodySchema = z.object({
  workOrderId:        z.string().cuid(),
  currentKm:          z.number().int().positive(),
  photoFrontUrl:      z.string().url(),
  photoRearUrl:       z.string().url(),
  photoOdometerUrl:   z.string().url(),
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const result = await checkIn(body)
  return NextResponse.json({ ok: true, data: result })
})
