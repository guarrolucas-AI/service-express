/**
 * PDF: Informe Técnico de Orden de Trabajo
 * Enviado al cliente al cerrar la OT via WhatsApp y email.
 */

import React from 'react'
import {
  Document, Page, View, Text, Image,
  StyleSheet, Font,
} from '@react-pdf/renderer'
import { C } from './theme'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface WorkOrderReportData {
  // Orden
  orderNumber:    string
  completedAt:    Date
  checkInAt:      Date
  checkInKm:      number
  // Cliente
  clientName:     string
  clientPhone:    string
  clientEmail:    string
  // Vehículo
  vehicleBrand:   string
  vehicleModel:   string
  vehicleYear:    number
  vehiclePlate:   string
  // Taller
  workshopName:   string
  workshopAddress: string
  workshopPhone:  string
  // Tareas realizadas
  items: Array<{
    taskName:         string
    taskType:         'LABOR' | 'PART'
    estimatedMinutes: number
    realMinutes?:     number
    laborPrice:       number
    partPrice:        number
    quantity:         number
  }>
  // Checklist
  checklist?: {
    frontBrakePadPct:   number
    rearBrakePadPct:    number
    brakeFluidStatus:   'GREEN' | 'YELLOW' | 'RED'
    oilStatus:          'GREEN' | 'YELLOW' | 'RED'
    coolantStatus:      'GREEN' | 'YELLOW' | 'RED'
    tireFrontLeftMm:    number
    tireFrontRightMm:   number
    tireRearLeftMm:     number
    tireRearRightMm:    number
    tirePressureStatus: 'GREEN' | 'YELLOW' | 'RED'
    mechanicNotes?:     string
  }
  // Totales
  totalAmount:    number
  laborAmount:    number
  partsAmount:    number
  // Fotos recepción
  photoFrontUrl?:    string
  photoRearUrl?:     string
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    backgroundColor: C.black,
    color: C.t1,
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 32,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  logoArea: { flexDirection: 'column', gap: 2 },
  logoTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 22,
    color: C.brand,
    letterSpacing: 2,
    lineHeight: 1,
  },
  logoSub: { fontSize: 8, color: C.t3, letterSpacing: 1, textTransform: 'uppercase' },
  headerRight: { alignItems: 'flex-end', gap: 2 },
  docLabel: { fontSize: 8, color: C.t3, textTransform: 'uppercase', letterSpacing: 1 },
  docNum: { fontFamily: 'Helvetica-Bold', fontSize: 14, color: C.white },
  docDate: { fontSize: 8, color: C.t2 },
  // Sección con título
  section: { marginBottom: 16 },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: C.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  // Grid de info (2 columnas)
  infoGrid: { flexDirection: 'row', gap: 12 },
  infoCard: {
    flex: 1,
    backgroundColor: C.dark,
    borderRadius: 4,
    padding: 12,
    gap: 6,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  infoLabel: { color: C.t3, fontSize: 8 },
  infoValue: { color: C.t1, fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'right', flex: 1, marginLeft: 8 },
  // Tabla de tareas
  table: {
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: C.card,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  tableRowAlt: { backgroundColor: '#16161A' },
  colTask:  { flex: 3, color: C.t1 },
  colMin:   { flex: 1, color: C.t2, textAlign: 'center' },
  colPrice: { flex: 1, color: C.t1, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  headText: { color: C.t3, fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.8 },
  // Totales
  totalsArea: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    paddingVertical: 3,
  },
  totalLabel: { color: C.t2, fontSize: 9 },
  totalVal:   { color: C.t1, fontSize: 9, fontFamily: 'Helvetica-Bold' },
  totalFinalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: C.brand,
    borderRadius: 3,
    marginTop: 4,
  },
  totalFinalLabel: { color: C.black, fontSize: 10, fontFamily: 'Helvetica-Bold' },
  totalFinalVal:   { color: C.black, fontSize: 10, fontFamily: 'Helvetica-Bold' },
  // Checklist semáforo
  semaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  semaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.dark,
    borderRadius: 3,
    padding: 6,
    minWidth: 110,
    gap: 5,
  },
  semaDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  semaLabel: { color: C.t2, fontSize: 8 },
  semaVal:   { color: C.t1, fontSize: 8, fontFamily: 'Helvetica-Bold', marginLeft: 'auto' },
  // Tires
  tireGrid: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tireCard: {
    backgroundColor: C.dark,
    borderRadius: 3,
    padding: 8,
    alignItems: 'center',
    minWidth: 70,
  },
  tireLabel: { color: C.t3, fontSize: 7, textTransform: 'uppercase', marginBottom: 3 },
  tireMm:    { fontFamily: 'Helvetica-Bold', fontSize: 14 },
  tireOk:    { color: C.green },
  tireWarn:  { color: C.yellow },
  tireCrit:  { color: C.red },
  // Notas
  notesBox: {
    backgroundColor: C.dark,
    borderRadius: 4,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: C.brand,
  },
  notesText: { color: C.t2, lineHeight: 1.5 },
  // Fotos
  photoGrid: { flexDirection: 'row', gap: 8 },
  photoWrap: { flex: 1, borderRadius: 4, overflow: 'hidden', height: 80 },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerText: { color: C.t3, fontSize: 7 },
  footerBrand: { color: C.brand, fontSize: 7, fontFamily: 'Helvetica-Bold' },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEMA_COLOR: Record<string, string> = {
  GREEN: C.green, YELLOW: C.yellow, RED: C.red,
}
const SEMA_LABEL: Record<string, string> = {
  GREEN: 'OK', YELLOW: 'Atención', RED: 'Crítico',
}

function fmt(n: number) {
  return `$${n.toLocaleString('es-AR')}`
}

function mmColor(mm: number) {
  if (mm >= 4) return s.tireOk
  if (mm >= 2) return s.tireWarn
  return s.tireCrit
}

// ─── Documento PDF ────────────────────────────────────────────────────────────

export function WorkOrderReportPDF({ d }: { d: WorkOrderReportData }) {
  const laborItems = d.items.filter(i => i.taskType === 'LABOR')
  const partItems  = d.items.filter(i => i.taskType === 'PART')

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.logoArea}>
            <Text style={s.logoTitle}>EXPRESS SERVICE</Text>
            <Text style={s.logoSub}>Informe técnico de servicio</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docLabel}>Orden de trabajo</Text>
            <Text style={s.docNum}>#{d.orderNumber}</Text>
            <Text style={s.docDate}>
              Completado: {format(d.completedAt, "d 'de' MMMM 'de' yyyy", { locale: es })}
            </Text>
          </View>
        </View>

        {/* ── Info cliente + vehículo ── */}
        <View style={[s.section, s.infoGrid]}>
          <View style={s.infoCard}>
            <Text style={s.sectionTitle}>Cliente</Text>
            <View style={s.infoRow}><Text style={s.infoLabel}>Nombre</Text><Text style={s.infoValue}>{d.clientName}</Text></View>
            <View style={s.infoRow}><Text style={s.infoLabel}>Teléfono</Text><Text style={s.infoValue}>{d.clientPhone}</Text></View>
            <View style={s.infoRow}><Text style={s.infoLabel}>Email</Text><Text style={s.infoValue}>{d.clientEmail}</Text></View>
          </View>
          <View style={s.infoCard}>
            <Text style={s.sectionTitle}>Vehículo</Text>
            <View style={s.infoRow}><Text style={s.infoLabel}>Marca / Modelo</Text><Text style={s.infoValue}>{d.vehicleBrand} {d.vehicleModel} {d.vehicleYear}</Text></View>
            <View style={s.infoRow}><Text style={s.infoLabel}>Patente</Text><Text style={s.infoValue}>{d.vehiclePlate}</Text></View>
            <View style={s.infoRow}><Text style={s.infoLabel}>Kilómetros recibidos</Text><Text style={s.infoValue}>{d.checkInKm.toLocaleString('es-AR')} km</Text></View>
          </View>
          <View style={s.infoCard}>
            <Text style={s.sectionTitle}>Taller</Text>
            <View style={s.infoRow}><Text style={s.infoLabel}>Nombre</Text><Text style={s.infoValue}>{d.workshopName}</Text></View>
            <View style={s.infoRow}><Text style={s.infoLabel}>Dirección</Text><Text style={s.infoValue}>{d.workshopAddress}</Text></View>
            <View style={s.infoRow}><Text style={s.infoLabel}>Recibido</Text><Text style={s.infoValue}>{format(d.checkInAt, "d/MM/yyyy HH:mm")}</Text></View>
          </View>
        </View>

        {/* ── Mano de obra ── */}
        {laborItems.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Trabajos realizados</Text>
            <View style={s.table}>
              <View style={s.tableHead}>
                <Text style={[s.colTask, s.headText]}>Tarea</Text>
                <Text style={[s.colMin, s.headText]}>Min. real</Text>
                <Text style={[s.colMin, s.headText]}>Min. est.</Text>
                <Text style={[s.colPrice, s.headText]}>Total</Text>
              </View>
              {laborItems.map((item, i) => (
                <View key={i} style={[s.tableRow, i % 2 !== 0 && s.tableRowAlt]}>
                  <Text style={s.colTask}>{item.taskName}</Text>
                  <Text style={s.colMin}>{item.realMinutes ?? '—'}</Text>
                  <Text style={s.colMin}>{item.estimatedMinutes}</Text>
                  <Text style={s.colPrice}>{fmt(item.laborPrice * item.quantity)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Repuestos ── */}
        {partItems.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Repuestos utilizados</Text>
            <View style={s.table}>
              <View style={s.tableHead}>
                <Text style={[s.colTask, s.headText]}>Repuesto</Text>
                <Text style={[s.colMin, s.headText]}>Cant.</Text>
                <Text style={[s.colPrice, s.headText]}>Total</Text>
              </View>
              {partItems.map((item, i) => (
                <View key={i} style={[s.tableRow, i % 2 !== 0 && s.tableRowAlt]}>
                  <Text style={s.colTask}>{item.taskName}</Text>
                  <Text style={s.colMin}>{item.quantity}</Text>
                  <Text style={s.colPrice}>{fmt(item.partPrice * item.quantity)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Totales ── */}
        <View style={s.totalsArea}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Mano de obra</Text>
            <Text style={s.totalVal}>{fmt(d.laborAmount)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Repuestos</Text>
            <Text style={s.totalVal}>{fmt(d.partsAmount)}</Text>
          </View>
          <View style={s.totalFinalRow}>
            <Text style={s.totalFinalLabel}>TOTAL</Text>
            <Text style={s.totalFinalVal}>{fmt(d.totalAmount)}</Text>
          </View>
        </View>

        {/* ── Checklist ── */}
        {d.checklist && (
          <View style={[s.section, { marginTop: 20 }]}>
            <Text style={s.sectionTitle}>Inspección visual — estado al momento del servicio</Text>

            {/* Semáforos de fluidos */}
            <View style={[s.semaGrid, { marginBottom: 10 }]}>
              {[
                { label: 'Freno líquido', val: d.checklist.brakeFluidStatus },
                { label: 'Aceite motor',  val: d.checklist.oilStatus },
                { label: 'Refrigerante', val: d.checklist.coolantStatus },
                { label: 'Presión cubiertas', val: d.checklist.tirePressureStatus },
                { label: 'Frenos delanteros', val: d.checklist.frontBrakePadPct >= 15 ? 'GREEN' : 'RED', extra: `${d.checklist.frontBrakePadPct}%` },
                { label: 'Frenos traseros',  val: d.checklist.rearBrakePadPct  >= 15 ? 'GREEN' : 'RED', extra: `${d.checklist.rearBrakePadPct}%` },
              ].map((item) => (
                <View key={item.label} style={s.semaItem}>
                  <View style={[s.semaDot, { backgroundColor: SEMA_COLOR[item.val] }]} />
                  <Text style={s.semaLabel}>{item.label}</Text>
                  <Text style={s.semaVal}>{item.extra ?? SEMA_LABEL[item.val]}</Text>
                </View>
              ))}
            </View>

            {/* Neumáticos */}
            <Text style={[s.sectionTitle, { marginBottom: 6 }]}>Profundidad de dibujo (neumáticos)</Text>
            <View style={s.tireGrid}>
              {[
                { label: 'Del. Izq.',  mm: d.checklist.tireFrontLeftMm },
                { label: 'Del. Der.', mm: d.checklist.tireFrontRightMm },
                { label: 'Tra. Izq.', mm: d.checklist.tireRearLeftMm },
                { label: 'Tra. Der.', mm: d.checklist.tireRearRightMm },
              ].map((t) => (
                <View key={t.label} style={s.tireCard}>
                  <Text style={s.tireLabel}>{t.label}</Text>
                  <Text style={[s.tireMm, mmColor(t.mm)]}>{t.mm.toFixed(1)}</Text>
                  <Text style={[s.semaLabel, { marginTop: 2 }]}>mm</Text>
                </View>
              ))}
            </View>

            {/* Notas del mecánico */}
            {d.checklist.mechanicNotes && (
              <View style={[s.notesBox, { marginTop: 10 }]}>
                <Text style={[s.sectionTitle, { marginBottom: 4 }]}>Observaciones del mecánico</Text>
                <Text style={s.notesText}>{d.checklist.mechanicNotes}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Fotos recepción ── */}
        {(d.photoFrontUrl || d.photoRearUrl) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Fotografías de recepción</Text>
            <View style={s.photoGrid}>
              {d.photoFrontUrl && (
                <View style={s.photoWrap}>
                  <Image src={d.photoFrontUrl} />
                </View>
              )}
              {d.photoRearUrl && (
                <View style={s.photoWrap}>
                  <Image src={d.photoRearUrl} />
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{d.workshopName} · {d.workshopAddress}</Text>
          <Text style={s.footerBrand}>EXPRESS SERVICE</Text>
          <Text style={s.footerText}>OT #{d.orderNumber}</Text>
        </View>

      </Page>
    </Document>
  )
}
