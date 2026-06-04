/**
 * POST /api/work-order/checklist
 *
 * Guarda o actualiza el checklist de inspección de una OT.
 * Solo puede ejecutarse cuando la OT está en QUALITY_CONTROL.
 *
 * Body: ChecklistPayload
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/errors'
import { submitChecklist } from '@/services/order.service'

const semaphoreStatus = z.enum(['GREEN', 'YELLOW', 'RED'])

const bodySchema = z.object({
  workOrderId:          z.string().cuid(),
  frontBrakePadPct:     z.number().min(0).max(100),
  rearBrakePadPct:      z.number().min(0).max(100),
  brakeFluidStatus:     semaphoreStatus,
  frontShockStatus:     semaphoreStatus,
  rearShockStatus:      semaphoreStatus,
  oilStatus:            semaphoreStatus,
  coolantStatus:        semaphoreStatus,
  transmissionStatus:   semaphoreStatus,
  tireFrontLeftMm:      z.number().min(0).max(15),
  tireFrontRightMm:     z.number().min(0).max(15),
  tireRearLeftMm:       z.number().min(0).max(15),
  tireRearRightMm:      z.number().min(0).max(15),
  tirePressureStatus:   semaphoreStatus,
  mechanicNotes:        z.string().max(1000).optional(),
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const result = await submitChecklist(body)
  return NextResponse.json({ ok: true, data: result })
})
