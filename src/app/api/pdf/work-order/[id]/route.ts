/**
 * GET /api/pdf/work-order/[id]  — Informe técnico de una OT.
 */
import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { prisma } from '@/lib/db'
import { C, docToBuffer, fillBg, hr, sectionTitle, drawTable, fmt } from '@/lib/pdf/pdfkit-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function statusColor(s: 'GREEN' | 'YELLOW' | 'RED') {
  return s === 'GREEN' ? C.green : s === 'YELLOW' ? C.yellow : C.red
}
function statusLabel(s: 'GREEN' | 'YELLOW' | 'RED') {
  return s === 'GREEN' ? 'Bien' : s === 'YELLOW' ? 'Atención' : 'Crítico'
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
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
    if (!wo) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })

    const num   = wo.id.slice(-8).toUpperCase()
    const items = wo.orderItems

    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const bufPromise = docToBuffer(doc)
    fillBg(doc)
    doc.on('pageAdded', () => fillBg(doc))

    // ── Header ───────────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(26).fillColor(C.brand).text('EXPRESS SERVICE', 40, 50)
    doc.font('Helvetica').fontSize(9).fillColor(C.t3).text('INFORME TÉCNICO', 40, 82, { characterSpacing: 2 })
    doc.font('Helvetica-Bold').fontSize(22).fillColor(C.t1).text(`#${num}`, 40, 94)

    doc.font('Helvetica').fontSize(8).fillColor(C.t3)
       .text(`Emitido: ${format(wo.completedAt ?? new Date(), "d 'de' MMMM yyyy", { locale: es })}`,
             350, 60, { align: 'right', width: 165 })
    doc.font('Helvetica').fontSize(8).fillColor(C.t2)
       .text(`Ingreso: ${format(wo.checkInAt ?? new Date(), "d 'de' MMMM yyyy · HH:mm", { locale: es })}`,
             350, 74, { align: 'right', width: 165 })

    doc.y = 140
    hr(doc)

    // ── Cliente + Vehículo ───────────────────────────────────────────────────
    const infoY = doc.y
    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.brand)
       .text('CLIENTE', 40, infoY, { characterSpacing: 1.2 })
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.t1)
       .text(`${wo.user.firstName} ${wo.user.lastName}`, 40, infoY + 14)
    doc.font('Helvetica').fontSize(9).fillColor(C.t2)
       .text(wo.user.phone ?? '', 40, infoY + 28)
       .text(wo.user.email, 40, infoY + 40)

    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.brand)
       .text('VEHÍCULO', 320, infoY, { characterSpacing: 1.2 })
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.t1)
       .text(`${wo.vehicle.brand} ${wo.vehicle.model}`, 320, infoY + 14)
    doc.font('Helvetica').fontSize(9).fillColor(C.t2)
       .text(`Año ${wo.vehicle.year}  ·  KM ingreso: ${wo.checkInKm?.toLocaleString('es-AR') ?? '—'}`,
             320, infoY + 28)
    doc.font('Helvetica-Bold').fontSize(16).fillColor(C.brand)
       .text(wo.vehicle.plate, 320, infoY + 40)

    doc.y = infoY + 65
    hr(doc)

    // ── Trabajos realizados ──────────────────────────────────────────────────
    sectionTitle(doc, 'Trabajos Realizados')
    drawTable(doc, [
      { header: 'Descripción', width: 215 },
      { header: 'Tipo',        width: 80  },
      { header: 'Cant.',       width: 45, align: 'center' },
      { header: 'T.Est.',      width: 60, align: 'center' },
      { header: 'T.Real',      width: 60, align: 'center' },
      { header: 'Total',       width: 55, align: 'right'  },
    ], items.map(i => {
      const price = Number(i.taskType === 'LABOR' ? i.laborPrice : i.partPrice ?? 0)
      return [
        i.taskName,
        i.taskType === 'LABOR' ? 'Mano de obra' : 'Repuesto',
        { text: String(i.quantity),                              align: 'center' } as { text: string },
        { text: i.estimatedMinutes ? `${i.estimatedMinutes}m` : '—', align: 'center' } as { text: string },
        { text: i.realMinutes      ? `${i.realMinutes}m`      : '—', align: 'center' } as { text: string },
        { text: fmt(price * i.quantity), align: 'right', bold: true } as { text: string; bold: boolean },
      ]
    }))

    // ── Totales ──────────────────────────────────────────────────────────────
    doc.moveDown(0.5)
    const totalY = doc.y
    doc.save().rect(350, totalY, 205, 60).fill(C.card).restore()
    doc.font('Helvetica').fontSize(8).fillColor(C.t2)
       .text('Mano de obra:', 358, totalY + 8, { width: 95, lineBreak: false })
    doc.font('Helvetica-Bold').fillColor(C.t1)
       .text(fmt(Number(wo.laborAmount ?? 0)), 358, totalY + 8, { width: 187, align: 'right', lineBreak: false })
    doc.font('Helvetica').fontSize(8).fillColor(C.t2)
       .text('Repuestos:', 358, totalY + 22, { width: 95, lineBreak: false })
    doc.font('Helvetica-Bold').fillColor(C.t1)
       .text(fmt(Number(wo.partsAmount ?? 0)), 358, totalY + 22, { width: 187, align: 'right', lineBreak: false })
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.t2)
       .text('TOTAL', 358, totalY + 38, { width: 95, lineBreak: false })
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.brand)
       .text(fmt(Number(wo.totalAmount ?? 0)), 358, totalY + 35, { width: 187, align: 'right', lineBreak: false })
    doc.y = totalY + 70

    // ── Checklist ────────────────────────────────────────────────────────────
    const cl = wo.checklist
    if (cl) {
      hr(doc)
      sectionTitle(doc, 'Inspección Visual')

      const clY = doc.y
      // Frenos
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.t2).text('FRENOS', 40, clY, { characterSpacing: 0.8 })
      doc.font('Helvetica').fontSize(8).fillColor(C.t2)
         .text(`Pastillas delantera: ${cl.frontBrakePadPct ?? '—'}%`, 40, clY + 13)
         .text(`Pastillas trasera:   ${cl.rearBrakePadPct  ?? '—'}%`, 40, clY + 25)
      if (cl.brakeFluidStatus) {
        const s = cl.brakeFluidStatus as 'GREEN' | 'YELLOW' | 'RED'
        doc.font('Helvetica').fontSize(8).fillColor(statusColor(s))
           .text(`Líquido frenos: ${statusLabel(s)}`, 40, clY + 37)
      }

      // Fluidos
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.t2).text('FLUIDOS', 200, clY, { characterSpacing: 0.8 })
      if (cl.oilStatus) {
        const s = cl.oilStatus as 'GREEN' | 'YELLOW' | 'RED'
        doc.font('Helvetica').fontSize(8).fillColor(statusColor(s))
           .text(`Aceite: ${statusLabel(s)}`, 200, clY + 13)
      }
      if (cl.coolantStatus) {
        const s = cl.coolantStatus as 'GREEN' | 'YELLOW' | 'RED'
        doc.font('Helvetica').fontSize(8).fillColor(statusColor(s))
           .text(`Refrigerante: ${statusLabel(s)}`, 200, clY + 25)
      }

      // Neumáticos
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.t2).text('NEUMÁTICOS (mm)', 360, clY, { characterSpacing: 0.8 })
      doc.font('Helvetica').fontSize(8).fillColor(C.t2)
         .text(`Del.izq: ${cl.tireFrontLeftMm  ?? '—'}  Del.der: ${cl.tireFrontRightMm ?? '—'}`, 360, clY + 13)
         .text(`Tra.izq: ${cl.tireRearLeftMm   ?? '—'}  Tra.der: ${cl.tireRearRightMm  ?? '—'}`, 360, clY + 25)
      if (cl.tirePressureStatus) {
        const s = cl.tirePressureStatus as 'GREEN' | 'YELLOW' | 'RED'
        doc.font('Helvetica').fontSize(8).fillColor(statusColor(s))
           .text(`Presión: ${statusLabel(s)}`, 360, clY + 37)
      }

      doc.y = clY + 56

      if (cl.mechanicNotes) {
        doc.moveDown(0.5)
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.brand)
           .text('OBSERVACIONES DEL MECÁNICO', { characterSpacing: 1 })
        doc.moveDown(0.3)
        doc.font('Helvetica').fontSize(9).fillColor(C.t2).text(cl.mechanicNotes)
      }
    }

    // ── Taller ────────────────────────────────────────────────────────────────
    doc.moveDown(1)
    hr(doc)
    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.brand).text('TALLER RECEPTOR', { characterSpacing: 1.2 })
    doc.moveDown(0.3)
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.t1).text(wo.workshop.name)
    doc.font('Helvetica').fontSize(9).fillColor(C.t2).text(wo.workshop.address).text(wo.workshop.phone)

    doc.end()
    const buffer = await bufPromise

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="informe-OT-${num}.pdf"`,
        'Cache-Control':       'private, no-cache',
      },
    })
  } catch (err) {
    console.error('[pdf/work-order] Error:', err)
    return NextResponse.json({ error: 'Error generando PDF', detail: String(err) }, { status: 500 })
  }
}
