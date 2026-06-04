/**
 * /admin — Backoffice de órdenes y score del taller
 */

import { prisma } from '@/lib/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  PENDING_QUOTE:         'Pendiente cotización',
  PENDING_PART:          'Pendiente pago',
  READY_FOR_APPOINTMENT: 'Turno confirmado',
  VEHICLE_RECEIVED:      'Vehículo recibido',
  IN_PROGRESS:           'En progreso',
  QUALITY_CONTROL:       'Control de calidad',
  COMPLETED:             'Completado',
  CANCELLED:             'Cancelado',
}
const STATUS_DOT: Record<string, string> = {
  PENDING_QUOTE:         'bg-orange-400',
  PENDING_PART:          'bg-yellow-400',
  READY_FOR_APPOINTMENT: 'bg-sky-400',
  VEHICLE_RECEIVED:      'bg-indigo-400',
  IN_PROGRESS:           'bg-blue-400 animate-pulse',
  QUALITY_CONTROL:       'bg-purple-400',
  COMPLETED:             'bg-green-400',
  CANCELLED:             'bg-red-400',
}

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }

export default async function AdminPage() {
  const [workshop, orders] = await Promise.all([
    prisma.workshop.findFirst({ where: { isActive: true } }),
    prisma.workOrder.findMany({
      include: {
        user:    { select: { firstName: true, lastName: true, phone: true } },
        vehicle: { select: { brand: true, model: true, year: true, plate: true } },
        orderItems: { select: { status: true, taskType: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayOrders = orders.filter(o =>
    o.createdAt >= today || o.checkInAt && o.checkInAt >= today
  )
  const completedToday = todayOrders.filter(o => o.status === 'COMPLETED')
  const revenueToday   = completedToday.reduce((s, o) => s + Number(o.totalAmount ?? 0), 0)
  const pending        = orders.filter(o => ['PENDING_QUOTE', 'PENDING_PART'].includes(o.status))

  return (
    <div className="min-h-screen bg-steel-900 text-gray-100 font-body">
      {/* Header */}
      <header className="bg-steel-800 border-b border-steel-600 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Express Service</p>
          <h1 className="font-display text-2xl font-bold text-brand leading-none">BACKOFFICE</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/mecanico"
            className="text-xs border border-steel-500 text-gray-300 rounded-lg px-3 py-2 hover:border-brand hover:text-brand transition-colors">
            Panel Mecánico →
          </Link>
          {workshop && (
            <a href={`/api/pdf/monthly/${workshop.id}/2026-06`} target="_blank"
              className="text-xs bg-brand text-black font-bold rounded-lg px-3 py-2">
              PDF Reporte Mensual
            </a>
          )}
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {/* KPIs */}
        {workshop && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Score del taller',     value: `${Math.round(workshop.score)}/100`, sub: 'Algoritmo Uber', color: 'text-brand' },
              { label: 'Servicios hoy',         value: completedToday.length,              sub: `de ${todayOrders.length} totales` },
              { label: 'Facturación hoy',       value: fmt(revenueToday),                  sub: 'completados' },
              { label: 'NPS promedio',          value: workshop.npsAverage.toFixed(1),     sub: 'último trimestre', color: workshop.npsAverage >= 8 ? 'text-green-400' : 'text-yellow-400' },
              { label: 'Pendientes atención',   value: pending.length,                     sub: 'cotizaciones / pagos', color: pending.length > 0 ? 'text-orange-400' : '' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-steel-800 border border-steel-600 rounded-xl p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">{kpi.label}</p>
                <p className={`font-display font-bold text-2xl leading-none ${kpi.color ?? 'text-white'}`}>{kpi.value}</p>
                <p className="text-gray-600 text-xs mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabla de órdenes */}
        <div className="bg-steel-800 border border-steel-600 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-steel-600 flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-white">Órdenes de trabajo</h2>
            <span className="text-gray-500 text-sm">{orders.length} registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-steel-700">
                  <th className="text-left px-6 py-3">OT</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Vehículo</th>
                  <th className="text-left px-4 py-3">Patente</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-center px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((wo, i) => (
                  <tr key={wo.id}
                    className={`border-b border-steel-700/50 hover:bg-steel-700/30 transition-colors ${i % 2 !== 0 ? 'bg-steel-900/30' : ''}`}>
                    <td className="px-6 py-3 font-mono text-xs text-gray-400">
                      #{wo.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[wo.status] ?? 'bg-gray-400'}`} />
                        <span className="text-xs whitespace-nowrap">{STATUS_LABEL[wo.status] ?? wo.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white">{wo.user.firstName} {wo.user.lastName}</td>
                    <td className="px-4 py-3 text-gray-300">{wo.vehicle.brand} {wo.vehicle.model} {wo.vehicle.year}</td>
                    <td className="px-4 py-3">
                      <span className="font-display font-bold text-brand tracking-widest text-sm">{wo.vehicle.plate}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {wo.totalAmount ? fmt(Number(wo.totalAmount)) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/admin/orden/${wo.id}`}
                          className="text-xs bg-steel-600 hover:bg-steel-500 text-gray-300 px-2 py-1 rounded transition-colors">
                          Ver
                        </Link>
                        {wo.status === 'COMPLETED' && (
                          <a href={`/api/pdf/work-order/${wo.id}`} target="_blank"
                            className="text-xs bg-brand/20 hover:bg-brand/30 text-brand px-2 py-1 rounded transition-colors">
                            PDF
                          </a>
                        )}
                        {wo.status === 'QUALITY_CONTROL' && (
                          <Link href={`/mecanico/${wo.id}`}
                            className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                            QC
                          </Link>
                        )}
                        {wo.status === 'PENDING_QUOTE' && (
                          <Link href={`/admin/orden/${wo.id}?tab=quote`}
                            className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded font-bold">
                            ¡Cotizar!
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
