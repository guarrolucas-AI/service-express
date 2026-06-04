/**
 * GET /api/pdf/monthly/[workshopId]/[month]
 * Reporte mensual del taller. month = "YYYY-MM"
 */
import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { startOfMonth, endOfMonth, eachWeekOfInterval, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { prisma } from '@/lib/db'
import { C, docToBuffer, fillBg, hr, sectionTitle, drawTable, fmt } from '@/lib/pdf/pdfkit-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { workshopId: string; month: string } },
) {
  try {
    const [year, mon] = params.month.split('-').map(Number)
    const monthStart  = startOfMonth(new Date(year, mon - 1, 1))
    const monthEnd    = endOfMonth(monthStart)

    const workshop = await prisma.workshop.findUnique({ where: { id: params.workshopId } })
    if (!workshop) return NextResponse.json({ error: 'Taller no encontrado' }, { status: 404 })

    const orders = await prisma.workOrder.findMany({
      where: {
        workshopId:  params.workshopId,
        completedAt: { gte: monthStart, lte: monthEnd },
      },
      include: { orderItems: true },
    })

    const completed = orders.filter(o => o.status === 'COMPLETED')
    const other     = orders.filter(o => o.status !== 'COMPLETED')
    const totalRev  = completed.reduce((s, o) => s + Number(o.totalAmount ?? 0), 0)
    const laborRev  = completed.reduce((s, o) => s + Number(o.laborAmount ?? 0), 0)
    const partsRev  = completed.reduce((s, o) => s + Number(o.partsAmount ?? 0), 0)

    const npsOrders = completed.filter(o => o.npsScore !== null)
    const npsAvg    = npsOrders.length > 0
      ? npsOrders.reduce((s, o) => s + (o.npsScore ?? 0), 0) / npsOrders.length
      : 0

    const svcMap: Record<string, { count: number; revenue: number }> = {}
    for (const o of completed) {
      for (const item of o.orderItems) {
        if (!svcMap[item.taskName]) svcMap[item.taskName] = { count: 0, revenue: 0 }
        svcMap[item.taskName].count++
        svcMap[item.taskName].revenue += Number(item.laborPrice ?? 0) + Number(item.partPrice ?? 0)
      }
    }
    const topSvcs = Object.entries(svcMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd })
    const weeklyRevenue = weeks.map((weekStart, i) => {
      const weekEnd = i < weeks.length - 1 ? weeks[i + 1] : monthEnd
      const amt = completed
        .filter(o => o.completedAt! >= weekStart && o.completedAt! < weekEnd)
        .reduce((s, o) => s + Number(o.totalAmount ?? 0), 0)
      return { week: `Sem. ${i + 1} (${format(weekStart, 'd/MM')})`, amount: amt }
    })

    const monthLabel = format(monthStart, 'yyyy-MM')

    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const bufPromise = docToBuffer(doc)
    fillBg(doc)
    doc.on('pageAdded', () => fillBg(doc))

    // ── Header ────────────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(26).fillColor(C.brand).text('EXPRESS SERVICE', 40, 50)
    doc.font('Helvetica').fontSize(9).fillColor(C.t3).text('REPORTE MENSUAL', 40, 82, { characterSpacing: 2 })
    doc.font('Helvetica-Bold').fontSize(18).fillColor(C.t1)
       .text(format(monthStart, 'MMMM yyyy', { locale: es }).toUpperCase(), 40, 94)

    doc.font('Helvetica').fontSize(8).fillColor(C.t3)
       .text(`Generado: ${format(new Date(), "d 'de' MMMM yyyy", { locale: es })}`,
             350, 60, { align: 'right', width: 165 })
    doc.font('Helvetica').fontSize(8).fillColor(C.t2)
       .text(workshop.name,    350, 74, { align: 'right', width: 165 })
       .text(workshop.address, 350, 86, { align: 'right', width: 165 })

    doc.y = 140
    hr(doc)

    // ── KPIs ──────────────────────────────────────────────────────────────────
    sectionTitle(doc, 'Resumen Ejecutivo')

    const kpiY = doc.y
    const kpiW = 120
    const kpis = [
      { label: 'Órdenes totales', value: String(orders.length),    color: C.t1    },
      { label: 'Completadas',     value: String(completed.length), color: C.green },
      { label: 'En proceso/otras', value: String(other.length),    color: C.t3    },
      { label: 'Revenue total',   value: fmt(totalRev),            color: C.brand },
    ]
    kpis.forEach(({ label, value, color }, i) => {
      const x = 40 + i * (kpiW + 6)
      doc.save().rect(x, kpiY, kpiW, 52).fill(C.card).restore()
      doc.font('Helvetica').fontSize(7).fillColor(C.t3)
         .text(label, x + 8, kpiY + 8, { width: kpiW - 16 })
      doc.font('Helvetica-Bold').fontSize(15).fillColor(color)
         .text(value, x + 8, kpiY + 22, { width: kpiW - 16 })
    })
    doc.y = kpiY + 62

    // ── Desglose ingresos ─────────────────────────────────────────────────────
    doc.moveDown(0.5)
    const revY = doc.y
    doc.save().rect(40, revY, 255, 38).fill(C.card).restore()
    doc.font('Helvetica').fontSize(8).fillColor(C.t2)
       .text('Mano de obra:', 50, revY + 8, { width: 110, lineBreak: false })
    doc.font('Helvetica-Bold').fillColor(C.t1)
       .text(fmt(laborRev), 50, revY + 8, { width: 235, align: 'right', lineBreak: false })
    doc.font('Helvetica').fontSize(8).fillColor(C.t2)
       .text('Repuestos:', 50, revY + 22, { width: 110, lineBreak: false })
    doc.font('Helvetica-Bold').fillColor(C.t1)
       .text(fmt(partsRev), 50, revY + 22, { width: 235, align: 'right', lineBreak: false })
    doc.y = revY + 46

    // ── NPS ───────────────────────────────────────────────────────────────────
    if (npsOrders.length > 0) {
      doc.moveDown(0.5)
      hr(doc)
      sectionTitle(doc, 'Satisfacción del Cliente (NPS)')
      const npsY = doc.y
      doc.save().rect(40, npsY, 155, 52).fill(C.card).restore()
      doc.font('Helvetica').fontSize(7).fillColor(C.t3)
         .text('NPS PROMEDIO', 50, npsY + 8)
      doc.font('Helvetica-Bold').fontSize(28).fillColor(C.brand)
         .text(npsAvg.toFixed(1), 50, npsY + 18)
      doc.font('Helvetica').fontSize(7).fillColor(C.t3)
         .text(`sobre ${npsOrders.length} respuestas`, 50, npsY + 43)
      doc.y = npsY + 62
    }

    // ── Top servicios ─────────────────────────────────────────────────────────
    if (topSvcs.length > 0) {
      doc.moveDown(0.5)
      hr(doc)
      sectionTitle(doc, 'Top Servicios')
      drawTable(doc, [
        { header: 'Servicio', width: 315 },
        { header: 'Cantidad', width: 80,  align: 'center' },
        { header: 'Revenue',  width: 120, align: 'right'  },
      ], topSvcs.map(s => [
        s.name,
        { text: String(s.count), align: 'center' } as { text: string },
        { text: fmt(s.revenue),  align: 'right', bold: true } as { text: string; bold: boolean },
      ]))
    }

    // ── Revenue semanal ───────────────────────────────────────────────────────
    if (weeklyRevenue.length > 0) {
      doc.moveDown(0.5)
      hr(doc)
      sectionTitle(doc, 'Revenue por Semana')
      drawTable(doc, [
        { header: 'Semana',  width: 250 },
        { header: 'Revenue', width: 265, align: 'right' },
      ], weeklyRevenue.map(w => [
        w.week,
        { text: fmt(w.amount), align: 'right', bold: true } as { text: string; bold: boolean },
      ]))
    }

    // ── Score taller ──────────────────────────────────────────────────────────
    doc.moveDown(1)
    hr(doc)
    doc.font('Helvetica').fontSize(8).fillColor(C.t3)
       .text(`Score del taller: ${Math.round(workshop.score)} / 100  ·  ${format(monthStart, 'MMMM yyyy', { locale: es })}`)

    doc.end()
    const buffer = await bufPromise

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="reporte-${monthLabel}-${workshop.name.replace(/\s+/g, '-')}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[pdf/monthly] Error:', err)
    return NextResponse.json({ error: 'Error generando PDF', detail: String(err) }, { status: 500 })
  }
}
