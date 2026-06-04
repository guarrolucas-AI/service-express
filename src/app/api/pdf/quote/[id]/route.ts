/**
 * GET /api/pdf/quote/[id]  — Presupuesto.
 */
import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { prisma } from '@/lib/db'
import { C, W, docToBuffer, fillBg, hr, sectionTitle, drawTable, fmt } from '@/lib/pdf/pdfkit-utils'

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
    if (!wo) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const num      = wo.id.slice(-8).toUpperCase()
    const today    = new Date()
    const validUntil = addDays(today, 7)
    const items    = wo.orderItems
    const total    = items.reduce((s, i) => s + Number(i.taskType === 'LABOR' ? i.laborPrice : i.partPrice ?? 0) * i.quantity, 0)

    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const bufPromise = docToBuffer(doc)
    fillBg(doc)
    doc.on('pageAdded', () => fillBg(doc))

    // ── Header ──────────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(26).fillColor(C.brand).text('EXPRESS SERVICE', 40, 50)
    doc.font('Helvetica').fontSize(9).fillColor(C.t3).text('PRESUPUESTO', 40, 82, { characterSpacing: 2 })
    doc.font('Helvetica-Bold').fontSize(22).fillColor(C.t1).text(`#${num}`, 40, 94)

    // Top-right: date / validity
    doc.font('Helvetica').fontSize(8).fillColor(C.t3)
       .text(`Emitido: ${format(today, "d 'de' MMMM yyyy", { locale: es })}`, 350, 60, { align: 'right', width: 165 })
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.brand)
       .text(`Válido hasta: ${format(validUntil, "d 'de' MMMM yyyy", { locale: es })}`, 350, 74, { align: 'right', width: 165 })

    doc.y = 140
    hr(doc)

    // ── Info: cliente + vehículo ──────────────────────────────────────────
    const infoY = doc.y
    // Left col — cliente
    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.brand)
       .text('CLIENTE', 40, infoY, { characterSpacing: 1.2 })
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.t1)
       .text(`${wo.user.firstName} ${wo.user.lastName}`, 40, infoY + 14)
    doc.font('Helvetica').fontSize(9).fillColor(C.t2)
       .text(wo.user.phone ?? '', 40, infoY + 28)
       .text(wo.workshop.name, 40, infoY + 40)
       .text(wo.workshop.phone, 40, infoY + 52)

    // Right col — vehículo
    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.brand)
       .text('VEHÍCULO', 320, infoY, { characterSpacing: 1.2 })
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.t1)
       .text(`${wo.vehicle.brand} ${wo.vehicle.model}`, 320, infoY + 14)
    doc.font('Helvetica').fontSize(9).fillColor(C.t2)
       .text(String(wo.vehicle.year), 320, infoY + 28)
    doc.font('Helvetica-Bold').fontSize(16).fillColor(C.brand)
       .text(wo.vehicle.plate, 320, infoY + 40)

    doc.y = infoY + 75
    hr(doc)

    // ── Tabla de items ────────────────────────────────────────────────────
    sectionTitle(doc, 'Servicios y Repuestos')
    drawTable(doc, [
      { header: 'Descripción', width: 275 },
      { header: 'Tipo',        width: 80  },
      { header: 'Cant.',       width: 60, align: 'center' },
      { header: 'Total',       width: 100, align: 'right' },
    ], items.map(i => {
      const price = Number(i.taskType === 'LABOR' ? i.laborPrice : i.partPrice ?? 0)
      return [
        i.taskName,
        i.taskType === 'LABOR' ? 'Mano de obra' : 'Repuesto',
        { text: String(i.quantity), align: 'center' } as { text: string },
        { text: fmt(price * i.quantity), align: 'right', bold: true } as { text: string; bold: boolean },
      ]
    }))

    // ── Total ─────────────────────────────────────────────────────────────
    doc.moveDown(0.5)
    doc.save().rect(350, doc.y, 205, 26).fill(C.card).restore()
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.t2)
       .text('TOTAL ESTIMADO', 355, doc.y + 7, { width: 90, lineBreak: false })
    doc.font('Helvetica-Bold').fontSize(14).fillColor(C.brand)
       .text(fmt(total), 355, doc.y - 7 + 4, { width: 195, align: 'right', lineBreak: false })
    doc.y = doc.y + 20

    // ── Nota al pie ───────────────────────────────────────────────────────
    doc.moveDown(1)
    hr(doc)
    doc.font('Helvetica').fontSize(7).fillColor(C.t3)
       .text('Presupuesto válido por 7 días. Los precios de repuestos pueden variar según disponibilidad de stock.\nMano de obra sujeta a diagnóstico definitivo.')

    doc.end()
    const buffer = await bufPromise

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="presupuesto-${num}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[pdf/quote]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
