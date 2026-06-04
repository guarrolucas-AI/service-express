/**
 * GET /api/pdf/work-order/[id]
 * Genera y devuelve el PDF del informe técnico de una OT.
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { prisma } from '@/lib/db'
import { WorkOrderReportPDF } from '@/lib/pdf/work-order-report'
import { NotFoundError, withErrorHandler } from '@/lib/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withErrorHandler(async (
  _req: NextRequest,
  { params }: { params: { id: string } },
) => {
  const wo = await prisma.workOrder.findUnique({
    where:   { id: params.id },
    include: {
      user:       true,
      workshop:   true,
      vehicle:    true,
      checklist:  true,
      orderItems: { include: { sparePart: true } },
    },
  })
  if (!wo) throw new NotFoundError('Orden de trabajo')

  const data = {
    orderNumber:     wo.id.slice(-8).toUpperCase(),
    completedAt:     wo.completedAt ?? new Date(),
    checkInAt:       wo.checkInAt  ?? new Date(),
    checkInKm:       wo.checkInKm  ?? 0,
    clientName:      `${wo.user.firstName} ${wo.user.lastName}`,
    clientPhone:     wo.user.phone ?? '',
    clientEmail:     wo.user.email,
    vehicleBrand:    wo.vehicle.brand,
    vehicleModel:    wo.vehicle.model,
    vehicleYear:     wo.vehicle.year,
    vehiclePlate:    wo.vehicle.plate,
    workshopName:    wo.workshop.name,
    workshopAddress: wo.workshop.address,
    workshopPhone:   wo.workshop.phone,
    items: wo.orderItems.map(i => ({
      taskName:         i.taskName,
      taskType:         i.taskType as 'LABOR' | 'PART',
      estimatedMinutes: i.estimatedMinutes ?? 60,
      realMinutes:      i.realMinutes ?? undefined,
      laborPrice:       Number(i.laborPrice ?? 0),
      partPrice:        Number(i.partPrice  ?? 0),
      quantity:         i.quantity,
    })),
    checklist: wo.checklist ? {
      frontBrakePadPct:   wo.checklist.frontBrakePadPct,
      rearBrakePadPct:    wo.checklist.rearBrakePadPct,
      brakeFluidStatus:   wo.checklist.brakeFluidStatus as 'GREEN' | 'YELLOW' | 'RED',
      oilStatus:          wo.checklist.oilStatus as 'GREEN' | 'YELLOW' | 'RED',
      coolantStatus:      wo.checklist.coolantStatus as 'GREEN' | 'YELLOW' | 'RED',
      tireFrontLeftMm:    wo.checklist.tireFrontLeftMm,
      tireFrontRightMm:   wo.checklist.tireFrontRightMm,
      tireRearLeftMm:     wo.checklist.tireRearLeftMm,
      tireRearRightMm:    wo.checklist.tireRearRightMm,
      tirePressureStatus: wo.checklist.tirePressureStatus as 'GREEN' | 'YELLOW' | 'RED',
      mechanicNotes:      wo.checklist.mechanicNotes ?? undefined,
    } : undefined,
    totalAmount:  Number(wo.totalAmount  ?? 0),
    laborAmount:  Number(wo.laborAmount  ?? 0),
    partsAmount:  Number(wo.partsAmount  ?? 0),
    photoFrontUrl: wo.checkInPhotoFront ?? undefined,
    photoRearUrl:  wo.checkInPhotoRear  ?? undefined,
  }

  const buffer = await renderToBuffer(
    React.createElement(WorkOrderReportPDF, { d: data }) as React.ReactElement<DocumentProps>,
  )

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `inline; filename="informe-OT-${data.orderNumber}.pdf"`,
      'Cache-Control':       'private, no-cache',
    },
  })
})
