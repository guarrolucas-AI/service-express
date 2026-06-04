/**
 * Utilidades compartidas para generación de PDFs con pdfkit.
 * Reemplaza @react-pdf/renderer que no funciona en Vercel serverless.
 */
import PDFDocument from 'pdfkit'

export const C = {
  bg:     '#0C0C0E',
  card:   '#1A1A1D',
  alt:    '#242428',
  border: '#3E3E45',
  brand:  '#E8C547',
  t1:     '#F5F5F5',
  t2:     '#A0A0AA',
  t3:     '#606068',
  green:  '#22C55E',
  yellow: '#EAB308',
  red:    '#EF4444',
} as const

/** Ancho utilizable con márgenes 40pt en A4 */
export const W = 515.28

/** Convierte el documento pdfkit a Buffer */
export function docToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data',  (c: Buffer) => chunks.push(c))
    doc.on('end',   () => resolve(Buffer.concat(chunks)))
    doc.on('error', (e: Error) => reject(e))
  })
}

/** Rellena el fondo de la página actual */
export function fillBg(doc: PDFKit.PDFDocument, color = C.bg) {
  doc.save()
     .rect(0, 0, doc.page.width, doc.page.height)
     .fill(color)
     .restore()
}

/** Crea un nuevo documento dark con fondo negro */
export function darkDoc(opts?: PDFKit.PDFDocumentOptions): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 40, size: 'A4', ...opts })
  fillBg(doc)
  doc.on('pageAdded', () => fillBg(doc))
  return doc
}

/** Línea separadora horizontal */
export function hr(doc: PDFKit.PDFDocument, y?: number, color = C.border) {
  const yp = y ?? doc.y
  doc.save()
     .strokeColor(color).lineWidth(0.5)
     .moveTo(40, yp).lineTo(40 + W, yp)
     .stroke()
     .restore()
  doc.y = yp + 6
}

/** Título de sección en brand yellow */
export function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.font('Helvetica-Bold').fontSize(7).fillColor(C.brand)
     .text(title.toUpperCase(), { characterSpacing: 1.2 })
  doc.moveDown(0.4)
}

/** Línea de clave: valor */
export function kv(
  doc: PDFKit.PDFDocument,
  key: string,
  val: string,
  color = C.t1,
) {
  doc.font('Helvetica').fontSize(9).fillColor(C.t2).text(key + ': ', { continued: true })
  doc.font('Helvetica-Bold').fillColor(color).text(val)
}

interface ColDef {
  header: string
  width:  number
  align?: 'left' | 'right' | 'center'
  color?: string
}

/** Dibuja tabla con cabecera dark y filas alternadas */
export function drawTable(
  doc:     PDFKit.PDFDocument,
  cols:    ColDef[],
  rows:    (string | { text: string; bold?: boolean; color?: string })[][],
  opts?:   { headerBg?: string; altBg?: string },
) {
  const ROW_H     = 20
  const MARGIN    = 40
  const hBg  = opts?.headerBg ?? C.card
  const aBg  = opts?.altBg   ?? C.alt
  const totalW = cols.reduce((s, c) => s + c.width, 0)
  let y = doc.y

  // Header
  doc.save().rect(MARGIN, y, totalW, ROW_H).fill(hBg).restore()
  let cx = MARGIN
  cols.forEach(col => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.brand)
       .text(col.header, cx + 4, y + 6, { width: col.width - 8, align: col.align ?? 'left', lineBreak: false })
    cx += col.width
  })
  y += ROW_H

  // Body rows
  rows.forEach((row, ri) => {
    if (ri % 2 !== 0) {
      doc.save().rect(MARGIN, y, totalW, ROW_H).fill(aBg).restore()
    }
    cx = MARGIN
    row.forEach((cell, ci) => {
      const text  = typeof cell === 'string' ? cell : cell.text
      const bold  = typeof cell !== 'string' ? (cell.bold ?? false) : false
      const color = typeof cell !== 'string' ? (cell.color ?? C.t1)  : C.t1
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
         .fontSize(9).fillColor(color)
         .text(text, cx + 4, y + 6, {
           width: cols[ci].width - 8,
           align: cols[ci].align ?? 'left',
           lineBreak: false,
         })
      cx += cols[ci].width
    })
    y += ROW_H
  })

  // Border rect
  doc.save()
     .rect(MARGIN, doc.y, totalW, y - doc.y)
     .strokeColor(C.border).lineWidth(0.5).stroke()
     .restore()

  doc.y = y + 8
}

/** Formatea pesos argentinos */
export const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
