/**
 * GET /api/pdf/quote/[id]
 * Genera el PDF de cotización de una OT.
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { prisma } from '@/lib/db'
import { QuotePDF } from '@/lib/pdf/quote'
import { addDays } from 'date-fns'

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

    console.log('[pdf/quote] Iniciando renderToBuffer...')
    const buffer = await renderToBuffer(
      React.createElement(QuotePDF, { d: data }) as React.ReactElement<DocumentProps>,
    )
    console.log('[pdf/quote] Buffer generado, tamaño:', buffer.length)

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="presupuesto-${data.quoteNumber}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[pdf/quote] Error:', err)
    return NextResponse.json(
      { error: 'Error generando PDF', detail: String(err) },
      { status: 500 },
    )
  }
}
