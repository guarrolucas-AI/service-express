/**
 * GET /api/pdf/checkin/[id]  — Remito de recepción (fondo blanco para imprimir).
 */
import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { prisma } from '@/lib/db'
import { docToBuffer } from '@/lib/pdf/pdfkit-utils'

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

    const num = wo.id.slice(-8).toUpperCase()

    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const bufPromise = docToBuffer(doc)
    // White background (for printing)

    // ── Header ──────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 90).fill('#0C0C0E')
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#E8C547')
       .text('EXPRESS SERVICE', 40, 20)
    doc.font('Helvetica').fontSize(8).fillColor('#A0A0AA')
       .text('REMITO DE RECEPCIÓN DE VEHÍCULO', 40, 50, { characterSpacing: 1.5 })
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF')
       .text(`#${num}`, 40, 64)
    doc.font('Helvetica').fontSize(9).fillColor('#A0A0AA')
       .text(format(wo.checkInAt ?? new Date(), "d 'de' MMMM yyyy · HH:mm", { locale: es }), 300, 64, { align: 'right', width: 215 })

    doc.y = 110

    // ── Info grid ────────────────────────────────────────────────────────
    // Cliente
    doc.save().rect(40, doc.y, 245, 100).fill('#F8F8F8').restore()
    doc.save().rect(40, doc.y, 245, 100).stroke('#E0E0E0').restore()
    const clientY = doc.y
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#E8C547')
       .text('CLIENTE', 50, clientY + 8, { characterSpacing: 1 })
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1A1A1A')
       .text(`${wo.user.firstName} ${wo.user.lastName}`, 50, clientY + 22)
    doc.font('Helvetica').fontSize(9).fillColor('#606060')
       .text(wo.user.phone ?? '', 50, clientY + 42)
       .text(wo.user.email, 50, clientY + 56)

    // Vehículo
    doc.save().rect(295, clientY, 260, 100).fill('#F8F8F8').restore()
    doc.save().rect(295, clientY, 260, 100).stroke('#E0E0E0').restore()
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#E8C547')
       .text('VEHÍCULO', 305, clientY + 8, { characterSpacing: 1 })
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1A1A1A')
       .text(`${wo.vehicle.brand} ${wo.vehicle.model}`, 305, clientY + 22)
    doc.font('Helvetica').fontSize(9).fillColor('#606060')
       .text(`Año: ${wo.vehicle.year}`, 305, clientY + 42)
       .text(`KM ingreso: ${wo.checkInKm?.toLocaleString('es-AR') ?? '—'}`, 305, clientY + 56)
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#E8C547')
       .text(wo.vehicle.plate, 305, clientY + 72)

    doc.y = clientY + 115

    // ── Servicios ────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#E8C547')
       .text('SERVICIOS SOLICITADOS', { characterSpacing: 1 })
    doc.moveDown(0.3)

    wo.orderItems.forEach((item, i) => {
      doc.save().rect(40, doc.y, 515, 18)
         .fill(i % 2 === 0 ? '#FFFFFF' : '#F5F5F5').restore()
      doc.font('Helvetica').fontSize(9).fillColor('#1A1A1A')
         .text(`• ${item.taskName}`, 48, doc.y + 4)
      doc.y = doc.y + 18
    })

    doc.moveDown(1)

    // ── Taller ───────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#E8C547')
       .text('TALLER RECEPTOR', { characterSpacing: 1 })
    doc.moveDown(0.3)
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1A1A1A')
       .text(wo.workshop.name)
    doc.font('Helvetica').fontSize(9).fillColor('#606060')
       .text(wo.workshop.address)
       .text(wo.workshop.phone)

    doc.moveDown(1.5)

    // ── Firmas ───────────────────────────────────────────────────────────
    const sigY = Math.min(doc.y, 680)
    const sigW = 155
    const sigH = 60

    ;[
      { x: 40,  label: 'Firma cliente' },
      { x: 210, label: 'DNI / CUIT' },
      { x: 380, label: 'Firma mecánico' },
    ].forEach(({ x, label }) => {
      doc.save().rect(x, sigY, sigW, sigH).stroke('#C0C0C0').restore()
      doc.font('Helvetica').fontSize(7).fillColor('#999999')
         .text(label, x, sigY + sigH + 4, { width: sigW, align: 'center' })
    })

    doc.end()
    const buffer = await bufPromise

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="recepcion-${num}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[pdf/checkin]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
