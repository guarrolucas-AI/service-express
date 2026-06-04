/**
 * GET /api/pdf/quote/[id]
 * Genera el PDF de cotización de una OT en PENDING_QUOTE.
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { prisma } from '@/lib/db'
import { QuotePDF } from '@/lib/pdf/quote'
import { NotFoundError, withErrorHandler } from '@/lib/errors'
import { addDays } from 'date-fns'

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

  const data = {
    quoteNumber:   wo.id.slice(-8).toUpperCase(),
    createdAt:     new Date(),
    validUntil:    addDays(new Date(), 7),
    clientName:    `${wo.user.firstName} ${wo.user.lastName}`,
    clientPhone:   wo.user.phone ?? '',
    vehicleBrand:  wo.vehicle.brand,
    vehicleModel:  wo.vehicle.model,
    vehicleYear:   wo.vehicle.year,
    vehiclePlate:  wo.vehicle.plate,
    workshopName:  wo.workshop.name,
    workshopPhone: wo.workshop.phone,
    items: wo.orderItems.map(i => ({
      description: i.taskName,
      type:        i.taskType as 'LABOR' | 'PART',
      quantity:    i.quantity,
      unitPrice:   Number(i.taskType === 'LABOR' ? (i.laborPrice ?? 0) : (i.partPrice ?? 0)),
    })),
    notes: 'Presupuesto válido por 7 días. Los precios de repuestos pueden variar según disponibilidad de stock. Mano de obra sujeta a diagnóstico definitivo.',
  }

  const buffer = await renderToBuffer(
    React.createElement(QuotePDF, { d: data }) as React.ReactElement<DocumentProps>,
  )

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `inline; filename="presupuesto-${data.quoteNumber}.pdf"`,
    },
  })
})
