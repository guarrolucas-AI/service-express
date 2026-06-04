/**
 * GET /api/pdf/checkin/[id]
 * Remito de recepción de vehículo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { prisma } from '@/lib/db'
import { CheckinReceiptPDF } from '@/lib/pdf/checkin-receipt'
import { NotFoundError, withErrorHandler } from '@/lib/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withErrorHandler(async (
  _req: NextRequest,
  { params }: { params: { id: string } },
) => {
  const wo = await prisma.workOrder.findUnique({
    where:   { id: params.id },
    include: { user: true, vehicle: true, workshop: true, orderItems: true },
  })
  if (!wo) throw new NotFoundError('Orden de trabajo')

  // Buscar mecánico asignado (primer item en progreso o completado)
  const firstItem = wo.orderItems[0]
  const mechanic = firstItem?.mechanicUserId
    ? await prisma.user.findUnique({ where: { id: firstItem.mechanicUserId } })
    : null

  const data = {
    orderNumber:     wo.id.slice(-8).toUpperCase(),
    checkInAt:       wo.checkInAt ?? new Date(),
    clientName:      `${wo.user.firstName} ${wo.user.lastName}`,
    clientPhone:     wo.user.phone ?? '',
    clientDni:       '',
    vehicleBrand:    wo.vehicle.brand,
    vehicleModel:    wo.vehicle.model,
    vehicleYear:     wo.vehicle.year,
    vehiclePlate:    wo.vehicle.plate,
    vehicleColor:    '',
    checkInKm:       wo.checkInKm ?? 0,
    fuelLevel:       '1/2',
    workshopName:    wo.workshop.name,
    workshopAddress: wo.workshop.address,
    mechanicName:    mechanic ? `${mechanic.firstName} ${mechanic.lastName}` : 'Mecánico Express Service',
    services:        wo.orderItems.map(i => i.taskName),
    observations:    '',
    damages:         [],
  }

  const buffer = await renderToBuffer(React.createElement(CheckinReceiptPDF, { d: data }))

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `inline; filename="recepcion-${data.orderNumber}.pdf"`,
    },
  })
})
