/**
 * PDF: Remito de recepción del vehículo (Check-in)
 * Se genera al recibir el auto y se puede imprimir / firmar.
 */

import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { C } from './theme'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export interface CheckinReceiptData {
  orderNumber:    string
  checkInAt:      Date
  clientName:     string
  clientPhone:    string
  clientDni:      string
  vehicleBrand:   string
  vehicleModel:   string
  vehicleYear:    number
  vehiclePlate:   string
  vehicleColor:   string
  checkInKm:      number
  fuelLevel:      string  // 'FULL' | '3/4' | '1/2' | '1/4' | 'RESERVE'
  workshopName:   string
  workshopAddress: string
  mechanicName:   string
  services: string[]
  observations?: string
  // Daños pre-existentes
  damages?: string[]
}

const s = StyleSheet.create({
  page:     { backgroundColor: C.white, color: '#1A1A1D', fontFamily: 'Helvetica', fontSize: 9, padding: 32 },
  header:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: '#E8C547' },
  logo:     { fontFamily: 'Helvetica-Bold', fontSize: 20, color: '#0C0C0E', letterSpacing: 2 },
  logoSub:  { fontSize: 7, color: '#606068', letterSpacing: 1 },
  right:    { alignItems: 'flex-end' },
  docTitle: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: '#0C0C0E' },
  docNum:   { fontSize: 10, color: '#3E3E45' },
  docDate:  { fontSize: 8, color: '#606068', marginTop: 2 },
  section:  { marginBottom: 14 },
  secTitle: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: '#606068', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6, paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: '#D0D0D8' },
  grid2:    { flexDirection: 'row', gap: 12 },
  card:     { flex: 1, backgroundColor: '#F8F8FA', borderRadius: 3, padding: 10, gap: 5, borderWidth: 0.5, borderColor: '#D0D0D8' },
  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  lbl:      { color: '#606068', fontSize: 8 },
  val:      { color: '#1A1A1D', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  kmBox:    { backgroundColor: '#E8C547', borderRadius: 3, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  kmNum:    { fontFamily: 'Helvetica-Bold', fontSize: 18, color: '#0C0C0E' },
  kmLbl:    { fontSize: 7, color: '#3E3E45', letterSpacing: 0.8 },
  svcItem:  { flexDirection: 'row', gap: 5, paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#E0E0E8', alignItems: 'center' },
  svcDot:   { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#E8C547' },
  svcText:  { color: '#1A1A1D', fontSize: 9 },
  obsBox:   { backgroundColor: '#FFF9E6', borderRadius: 3, padding: 10, borderLeftWidth: 3, borderLeftColor: '#E8C547' },
  obsText:  { color: '#3E3E45', lineHeight: 1.5 },
  signArea: { flexDirection: 'row', gap: 20, marginTop: 20 },
  signBox:  { flex: 1, paddingTop: 30, borderTopWidth: 1, borderTopColor: '#1A1A1D', alignItems: 'center' },
  signLbl:  { color: '#606068', fontSize: 8 },
  footer:   { position: 'absolute', bottom: 24, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#D0D0D8' },
  footText: { color: '#A0A0AA', fontSize: 7 },
})

const FUEL_ICON: Record<string, string> = {
  FULL: '█████', '3/4': '████░', '1/2': '███░░', '1/4': '██░░░', RESERVE: '█░░░░',
}

export function CheckinReceiptPDF({ d }: { d: CheckinReceiptData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.logo}>EXPRESS SERVICE</Text>
            <Text style={s.logoSub}>Remito de recepción de vehículo</Text>
          </View>
          <View style={s.right}>
            <Text style={s.docTitle}>RECEPCIÓN #{d.orderNumber}</Text>
            <Text style={s.docNum}>{d.workshopName}</Text>
            <Text style={s.docDate}>{format(d.checkInAt, "d 'de' MMMM 'de' yyyy — HH:mm", { locale: es })}</Text>
          </View>
        </View>

        {/* Cliente + Vehículo */}
        <View style={[s.section, s.grid2]}>
          <View style={s.card}>
            <Text style={s.secTitle}>Datos del cliente</Text>
            <View style={s.row}><Text style={s.lbl}>Apellido y nombre</Text><Text style={s.val}>{d.clientName}</Text></View>
            <View style={s.row}><Text style={s.lbl}>DNI</Text><Text style={s.val}>{d.clientDni || '—'}</Text></View>
            <View style={s.row}><Text style={s.lbl}>Teléfono</Text><Text style={s.val}>{d.clientPhone}</Text></View>
          </View>
          <View style={s.card}>
            <Text style={s.secTitle}>Vehículo</Text>
            <View style={s.row}><Text style={s.lbl}>Marca / Modelo</Text><Text style={s.val}>{d.vehicleBrand} {d.vehicleModel}</Text></View>
            <View style={s.row}><Text style={s.lbl}>Año</Text><Text style={s.val}>{d.vehicleYear}</Text></View>
            <View style={s.row}><Text style={s.lbl}>Patente</Text><Text style={s.val}>{d.vehiclePlate}</Text></View>
            <View style={s.row}><Text style={s.lbl}>Color</Text><Text style={s.val}>{d.vehicleColor || '—'}</Text></View>
          </View>
        </View>

        {/* Km + Combustible */}
        <View style={[s.section, s.grid2]}>
          <View style={[s.card, { alignItems: 'center' }]}>
            <Text style={s.secTitle}>Kilometraje al ingreso</Text>
            <View style={s.kmBox}>
              <Text style={s.kmNum}>{d.checkInKm.toLocaleString('es-AR')}</Text>
              <Text style={s.kmLbl}>KILÓMETROS</Text>
            </View>
          </View>
          <View style={[s.card, { alignItems: 'center' }]}>
            <Text style={s.secTitle}>Nivel de combustible</Text>
            <Text style={{ fontFamily: 'Courier', fontSize: 14, color: '#E8C547', marginTop: 8, letterSpacing: 2 }}>
              {FUEL_ICON[d.fuelLevel] ?? '░░░░░'}
            </Text>
            <Text style={{ color: '#606068', fontSize: 9, marginTop: 4 }}>{d.fuelLevel}</Text>
          </View>
        </View>

        {/* Servicios */}
        <View style={s.section}>
          <Text style={s.secTitle}>Servicios a realizar</Text>
          {d.services.map((svc, i) => (
            <View key={i} style={s.svcItem}>
              <View style={s.svcDot} />
              <Text style={s.svcText}>{svc}</Text>
            </View>
          ))}
        </View>

        {/* Daños pre-existentes */}
        {d.damages && d.damages.length > 0 && (
          <View style={s.section}>
            <Text style={s.secTitle}>Daños pre-existentes declarados</Text>
            <View style={s.obsBox}>
              {d.damages.map((dmg, i) => (
                <Text key={i} style={[s.obsText, { marginBottom: 2 }]}>• {dmg}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Observaciones */}
        {d.observations && (
          <View style={[s.section, s.obsBox]}>
            <Text style={[s.secTitle, { marginBottom: 3 }]}>Observaciones</Text>
            <Text style={s.obsText}>{d.observations}</Text>
          </View>
        )}

        {/* Firmas */}
        <View style={s.signArea}>
          <View style={s.signBox}>
            <Text style={s.signLbl}>Firma del cliente</Text>
            <Text style={[s.signLbl, { marginTop: 4 }]}>{d.clientName}</Text>
          </View>
          <View style={s.signBox}>
            <Text style={s.signLbl}>Firma del mecánico</Text>
            <Text style={[s.signLbl, { marginTop: 4 }]}>{d.mechanicName}</Text>
          </View>
          <View style={s.signBox}>
            <Text style={s.signLbl}>Sello del taller</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footText}>{d.workshopName} · {d.workshopAddress}</Text>
          <Text style={{ color: '#E8C547', fontSize: 7, fontFamily: 'Helvetica-Bold' }}>EXPRESS SERVICE</Text>
          <Text style={s.footText}>Este remito es comprobante de ingreso del vehículo.</Text>
        </View>
      </Page>
    </Document>
  )
}
