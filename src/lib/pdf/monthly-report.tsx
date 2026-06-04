/**
 * PDF: Reporte mensual del taller
 * Para el dueño: ingresos, servicios, NPS, score evolutivo.
 */

import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { C } from './theme'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export interface MonthlyReportData {
  workshopName:   string
  workshopAddress: string
  month:          Date  // primer día del mes reportado
  generatedAt:    Date
  // KPIs principales
  totalOrders:    number
  completedOrders: number
  cancelledOrders: number
  totalRevenue:   number
  laborRevenue:   number
  partsRevenue:   number
  // Tiempos
  avgCompletionHours: number
  avgTimeDeviationPct: number
  // NPS
  npsAverage:     number
  npsCount:       number
  npsDistribution: number[]  // [0..10] cantidad de respuestas por puntaje
  // Score
  currentScore:   number
  prevScore:      number
  // Top servicios
  topServices: Array<{ name: string; count: number; revenue: number }>
  // Evolución semanal
  weeklyRevenue: Array<{ week: string; amount: number }>
}

const s = StyleSheet.create({
  page:     { backgroundColor: C.black, color: C.t1, fontFamily: 'Helvetica', fontSize: 9, padding: 32 },
  header:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  logo:     { fontFamily: 'Helvetica-Bold', fontSize: 22, color: C.brand, letterSpacing: 2 },
  logoSub:  { fontSize: 8, color: C.t3, letterSpacing: 1 },
  right:    { alignItems: 'flex-end' },
  period:   { fontFamily: 'Helvetica-Bold', fontSize: 16, color: C.white },
  subPer:   { color: C.t3, fontSize: 8, marginTop: 2 },
  section:  { marginBottom: 18 },
  secTitle: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.brand, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 },
  kpiGrid:  { flexDirection: 'row', gap: 8 },
  kpiCard:  { flex: 1, backgroundColor: C.dark, borderRadius: 4, padding: 12, alignItems: 'center' },
  kpiNum:   { fontFamily: 'Helvetica-Bold', fontSize: 20, color: C.white, lineHeight: 1.1 },
  kpiLbl:   { color: C.t3, fontSize: 7, textAlign: 'center', marginTop: 3 },
  kpiSub:   { color: C.t2, fontSize: 8, marginTop: 2 },
  scoreRing: { alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: C.brand, backgroundColor: C.dark, margin: 'auto' },
  scoreNum:  { fontFamily: 'Helvetica-Bold', fontSize: 24, color: C.brand },
  scoreLbl:  { color: C.t3, fontSize: 7 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  barRow:    { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 4 },
  bar:       { height: 8, borderRadius: 2, backgroundColor: C.brand },
  barBg:     { flex: 1, height: 8, borderRadius: 2, backgroundColor: C.card },
  barLabel:  { width: 60, color: C.t2, fontSize: 8 },
  barAmt:    { width: 70, color: C.t1, fontSize: 8, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  npsBar:    { flexDirection: 'row', alignItems: 'center', marginBottom: 3, gap: 4 },
  footer:    { position: 'absolute', bottom: 24, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  footText:  { color: C.t3, fontSize: 7 },
})

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }

export function MonthlyReportPDF({ d }: { d: MonthlyReportData }) {
  const monthName = format(d.month, "MMMM yyyy", { locale: es }).toUpperCase()
  const maxWeekly = Math.max(...d.weeklyRevenue.map(w => w.amount), 1)
  const maxSvc    = Math.max(...d.topServices.map(s => s.count), 1)
  const maxNps    = Math.max(...d.npsDistribution, 1)
  const scoreDiff = d.currentScore - d.prevScore

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.logo}>EXPRESS SERVICE</Text>
            <Text style={s.logoSub}>Reporte mensual de gestión</Text>
          </View>
          <View style={s.right}>
            <Text style={s.period}>{monthName}</Text>
            <Text style={s.subPer}>{d.workshopName}</Text>
            <Text style={{ color: C.t3, fontSize: 7, marginTop: 2 }}>Generado: {format(d.generatedAt, "d/MM/yyyy HH:mm")}</Text>
          </View>
        </View>

        {/* KPIs */}
        <View style={s.section}>
          <Text style={s.secTitle}>Resumen del mes</Text>
          <View style={s.kpiGrid}>
            <View style={s.kpiCard}>
              <Text style={s.kpiNum}>{d.completedOrders}</Text>
              <Text style={s.kpiLbl}>Servicios completados</Text>
              <Text style={[s.kpiSub, { color: C.t3 }]}>de {d.totalOrders} totales</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={[s.kpiNum, { color: C.brand }]}>{fmt(d.totalRevenue)}</Text>
              <Text style={s.kpiLbl}>Facturación total</Text>
              <Text style={[s.kpiSub, { color: C.t3 }]}>M.O. + Repuestos</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={[s.kpiNum, { color: d.npsAverage >= 8 ? C.green : d.npsAverage >= 6 ? C.yellow : C.red }]}>
                {d.npsAverage.toFixed(1)}
              </Text>
              <Text style={s.kpiLbl}>NPS promedio</Text>
              <Text style={[s.kpiSub, { color: C.t3 }]}>{d.npsCount} respuestas</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={[s.kpiNum, { color: d.avgTimeDeviationPct <= 10 ? C.green : d.avgTimeDeviationPct <= 25 ? C.yellow : C.red }]}>
                {d.avgTimeDeviationPct}%
              </Text>
              <Text style={s.kpiLbl}>Desvío de tiempo</Text>
              <Text style={[s.kpiSub, { color: C.t3 }]}>vs. estimado</Text>
            </View>
            <View style={s.kpiCard}>
              <View style={s.scoreRing}>
                <Text style={s.scoreNum}>{d.currentScore}</Text>
              </View>
              <Text style={s.kpiLbl}>Score del taller</Text>
              <Text style={[s.kpiSub, { color: scoreDiff >= 0 ? C.green : C.red }]}>
                {scoreDiff >= 0 ? '+' : ''}{scoreDiff} vs mes anterior
              </Text>
            </View>
          </View>
        </View>

        {/* Ingresos por semana */}
        <View style={s.section}>
          <Text style={s.secTitle}>Evolución de ingresos — semana a semana</Text>
          {d.weeklyRevenue.map((w, i) => (
            <View key={i} style={s.barRow}>
              <Text style={s.barLabel}>{w.week}</Text>
              <View style={[s.barBg]}>
                <View style={[s.bar, { width: `${(w.amount / maxWeekly) * 100}%` }]} />
              </View>
              <Text style={s.barAmt}>{fmt(w.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Desglose facturación */}
        <View style={[s.section, { flexDirection: 'row', gap: 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.secTitle}>Desglose de facturación</Text>
            <View style={s.row}><Text style={{ color: C.t2 }}>Mano de obra</Text><Text style={{ color: C.t1, fontFamily: 'Helvetica-Bold' }}>{fmt(d.laborRevenue)}</Text></View>
            <View style={s.row}><Text style={{ color: C.t2 }}>Repuestos</Text><Text style={{ color: C.t1, fontFamily: 'Helvetica-Bold' }}>{fmt(d.partsRevenue)}</Text></View>
            <View style={[s.row, { paddingTop: 8 }]}>
              <Text style={{ color: C.brand, fontFamily: 'Helvetica-Bold' }}>TOTAL</Text>
              <Text style={{ color: C.brand, fontFamily: 'Helvetica-Bold', fontSize: 12 }}>{fmt(d.totalRevenue)}</Text>
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.secTitle}>Top servicios</Text>
            {d.topServices.slice(0, 5).map((svc, i) => (
              <View key={i} style={s.barRow}>
                <Text style={{ color: C.t2, fontSize: 8, width: 80 }}>{svc.name}</Text>
                <View style={s.barBg}>
                  <View style={[s.bar, { width: `${(svc.count / maxSvc) * 100}%`, backgroundColor: i === 0 ? C.brand : C.blue }]} />
                </View>
                <Text style={{ color: C.t1, fontSize: 8, width: 20, textAlign: 'right' }}>{svc.count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* NPS distribución */}
        {d.npsCount > 0 && (
          <View style={s.section}>
            <Text style={s.secTitle}>Distribución NPS (0 = peor, 10 = mejor)</Text>
            <View style={{ flexDirection: 'row', gap: 3, alignItems: 'flex-end', height: 50 }}>
              {d.npsDistribution.map((count, score) => {
                const h = count > 0 ? Math.max(4, (count / maxNps) * 44) : 2
                const col = score >= 9 ? C.green : score >= 7 ? C.yellow : C.red
                return (
                  <View key={score} style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ width: '100%', height: h, backgroundColor: col, borderRadius: 2 }} />
                    <Text style={{ color: C.t3, fontSize: 7, marginTop: 2 }}>{score}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footText}>{d.workshopName} · {d.workshopAddress}</Text>
          <Text style={{ color: C.brand, fontSize: 7, fontFamily: 'Helvetica-Bold' }}>EXPRESS SERVICE</Text>
          <Text style={s.footText}>Reporte {monthName}</Text>
        </View>
      </Page>
    </Document>
  )
}
