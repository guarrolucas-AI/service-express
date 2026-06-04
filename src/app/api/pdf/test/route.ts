/**
 * GET /api/pdf/test  — verifica que pdfkit funciona en Vercel.
 */
import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { docToBuffer } from '@/lib/pdf/pdfkit-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  try {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const bufPromise = docToBuffer(doc)

    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0C0C0E')
    doc.font('Helvetica-Bold').fontSize(28).fillColor('#E8C547')
       .text('EXPRESS SERVICE', 40, 60)
    doc.font('Helvetica').fontSize(14).fillColor('#F5F5F5')
       .text('PDF generado con pdfkit ✓', 40, 110)
    doc.font('Helvetica').fontSize(10).fillColor('#A0A0AA')
       .text(`Fecha: ${new Date().toISOString()}`, 40, 140)
    doc.font('Helvetica').fontSize(10).fillColor('#606068')
       .text('Si ves este PDF, el generador funciona correctamente en Vercel.', 40, 165)
    doc.end()

    const buffer = await bufPromise
    const ms = Date.now() - start
    console.log(`[pdf/test] OK — ${buffer.length} bytes en ${ms}ms`)

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'inline; filename="test.pdf"',
        'X-Render-Ms':         String(ms),
      },
    })
  } catch (err) {
    console.error('[pdf/test] ERROR:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
