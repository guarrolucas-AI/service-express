/**
 * PDF: Presupuesto / Cotización
 */

import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { C } from './theme'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export interface QuoteData {
  quoteNumber:    string
  createdAt:      Date
  validUntil:     Date
  clientName:     string
  clientPhone:    string
  vehicleBrand:   string
  vehicleModel:   string
  vehicleYear:    number
  vehiclePlate:   string
  workshopName:   string
  workshopPhone:  string
  items: Array<{
    description: string
    type:        'LABOR' | 'PART'
    quantity:    number
    unitPrice:   number
  }>
  notes?: string
}

const s = StyleSheet.create({
  page:      { backgroundColor: C.black, color: C.t1, fontFamily: 'Helvetica', fontSize: 9, padding: 32 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  logo:      { fontFamily: 'Helvetica-Bold', fontSize: 22, color: C.brand, letterSpacing: 2 },
  logoSub:   { fontSize: 8, color: C.t3, letterSpacing: 1 },
  right:     { alignItems: 'flex-end' },
  label:     { fontSize: 7, color: C.t3, textTransform: 'uppercase', letterSpacing: 1 },
  docNum:    { fontFamily: 'Helvetica-Bold', fontSize: 14, color: C.white },
  validBox:  { backgroundColor: C.brand, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3, marginTop: 3 },
  validText: { color: C.black, fontFamily: 'Helvetica-Bold', fontSize: 7 },
  section:   { marginBottom: 16 },
  secTitle:  { fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.brand, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  infoGrid:  { flexDirection: 'row', gap: 12 },
  infoCard:  { flex: 1, backgroundColor: C.dark, borderRadius: 4, padding: 10, gap: 5 },
  row:       { flexDirection: 'row', justifyContent: 'space-between' },
  lbl:       { color: C.t3, fontSize: 8 },
  val:       { color: C.t1, fontSize: 8, fontFamily: 'Helvetica-Bold', textAlign: 'right', flex: 1, marginLeft: 8 },
  table:     { borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  thead:     { flexDirection: 'row', backgroundColor: C.card, paddingVertical: 6, paddingHorizontal: 10 },
  trow:      { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: C.border },
  trowAlt:   { backgroundColor: '#16161A' },
  c1:        { flex: 4 }, c2: { flex: 1, textAlign: 'center' }, c3: { flex: 1, textAlign: 'right' }, c4: { flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  htext:     { color: C.t3, fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.8 },
  totals:    { alignItems: 'flex-end', marginTop: 8 },
  totRow:    { flexDirection: 'row', justifyContent: 'space-between', width: 180, paddingVertical: 3 },
  totFinal:  { flexDirection: 'row', justifyContent: 'space-between', width: 180, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: C.brand, borderRadius: 3, marginTop: 4 },
  notesBox:  { backgroundColor: C.dark, borderRadius: 4, padding: 12, borderLeftWidth: 3, borderLeftColor: C.brand },
  footer:    { position: 'absolute', bottom: 24, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  footText:  { color: C.t3, fontSize: 7 },
  footBrand: { color: C.brand, fontSize: 7, fontFamily: 'Helvetica-Bold' },
})

function fmt(n: number) { return `$${n.toLocaleString('es-AR')}` }

export function QuotePDF({ d }: { d: QuoteData }) {
  const total = d.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const labor = d.items.filter(i => i.type === 'LABOR').reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const parts = d.items.filter(i => i.type === 'PART').reduce((s,  i) => s + i.unitPrice * i.quantity, 0)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.logo}>EXPRESS SERVICE</Text>
            <Text style={s.logoSub}>Presupuesto de servicio</Text>
          </View>
          <View style={s.right}>
            <Text style={s.label}>Presupuesto N°</Text>
            <Text style={s.docNum}>#{d.quoteNumber}</Text>
            <Text style={[s.label, { marginTop: 2 }]}>Emitido: {format(d.createdAt, 'd/MM/yyyy')}</Text>
            <View style={s.validBox}>
              <Text style={s.validText}>VÁLIDO HASTA: {format(d.validUntil, "d 'de' MMMM", { locale: es }).toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={[s.section, s.infoGrid]}>
          <View style={s.infoCard}>
            <Text style={s.secTitle}>Cliente</Text>
            <View style={s.row}><Text style={s.lbl}>Nombre</Text><Text style={s.val}>{d.clientName}</Text></View>
            <View style={s.row}><Text style={s.lbl}>Teléfono</Text><Text style={s.val}>{d.clientPhone}</Text></View>
          </View>
          <View style={s.infoCard}>
            <Text style={s.secTitle}>Vehículo</Text>
            <View style={s.row}><Text style={s.lbl}>Auto</Text><Text style={s.val}>{d.vehicleBrand} {d.vehicleModel} {d.vehicleYear}</Text></View>
            <View style={s.row}><Text style={s.lbl}>Patente</Text><Text style={s.val}>{d.vehiclePlate}</Text></View>
          </View>
        </View>

        {/* Tabla */}
        <View style={s.section}>
          <Text style={s.secTitle}>Detalle del presupuesto</Text>
          <View style={s.table}>
            <View style={s.thead}>
              <Text style={[s.c1, s.htext]}>Descripción</Text>
              <Text style={[s.c2, s.htext]}>Tipo</Text>
              <Text style={[s.c3, s.htext]}>Cant.</Text>
              <Text style={[s.c3, s.htext]}>Unitario</Text>
              <Text style={[s.c4, s.htext]}>Total</Text>
            </View>
            {d.items.map((item, i) => (
              <View key={i} style={[s.trow, ...(i % 2 !== 0 ? [s.trowAlt] : [])]}>
                <Text style={[s.c1, { color: C.t1 }]}>{item.description}</Text>
                <Text style={[s.c2, { color: C.t3 }]}>{item.type === 'LABOR' ? 'M.O.' : 'Repuesto'}</Text>
                <Text style={[s.c3, { color: C.t2 }]}>{item.quantity}</Text>
                <Text style={[s.c3, { color: C.t2 }]}>{fmt(item.unitPrice)}</Text>
                <Text style={s.c4}>{fmt(item.unitPrice * item.quantity)}</Text>
              </View>
            ))}
          </View>
          <View style={s.totals}>
            <View style={s.totRow}><Text style={{ color: C.t2, fontSize: 9 }}>Mano de obra</Text><Text style={{ color: C.t1, fontSize: 9, fontFamily: 'Helvetica-Bold' }}>{fmt(labor)}</Text></View>
            <View style={s.totRow}><Text style={{ color: C.t2, fontSize: 9 }}>Repuestos</Text><Text style={{ color: C.t1, fontSize: 9, fontFamily: 'Helvetica-Bold' }}>{fmt(parts)}</Text></View>
            <View style={s.totFinal}><Text style={{ color: C.black, fontSize: 10, fontFamily: 'Helvetica-Bold' }}>TOTAL</Text><Text style={{ color: C.black, fontSize: 10, fontFamily: 'Helvetica-Bold' }}>{fmt(total)}</Text></View>
          </View>
        </View>

        {d.notes && (
          <View style={[s.section, s.notesBox]}>
            <Text style={[s.secTitle, { marginBottom: 4 }]}>Notas y condiciones</Text>
            <Text style={{ color: C.t2, lineHeight: 1.5 }}>{d.notes}</Text>
          </View>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footText}>{d.workshopName} · {d.workshopPhone}</Text>
          <Text style={s.footBrand}>EXPRESS SERVICE</Text>
          <Text style={s.footText}>Presupuesto #{d.quoteNumber}</Text>
        </View>
      </Page>
    </Document>
  )
}
