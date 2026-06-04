/**
 * GET /api/pdf/checkin/[id]
 * Remito de recepción de vehículo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { prisma } from '@/lib/db'
import { CheckinReceiptPDF } from '@/lib/pdf/checkin-receipt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const wo = await prisma.workOrder.findUnique({
      where:   { id: params.id },
      include: { user: true, vehicle: true, workshop: true, orderItems: true },
    })
    if (!wo) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

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

    console.log('[pdf/checkin] Iniciando renderToBuffer...')
    const buffer = await renderToBuffer(
      React.createElement(CheckinReceiptPDF, { d: data }) as React.ReactElement<DocumentProps>,
    )
    console.log('[pdf/checkin] Buffer generado, tamaño:', buffer.length)

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="recepcion-${data.orderNumber}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[pdf/checkin] Error:', err)
    return NextResponse.json(
      { error: 'Error generando PDF', detail: String(err) },
      { status: 500 },
    )
  }
}
