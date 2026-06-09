/**
 * /admin — Backoffice de órdenes y score del taller
 * Soporte de búsqueda (?q=) y filtro de estado (?status=)
 */

import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import Link from 'next/link'
import { AdminLogoutButton } from './AdminLogoutButton'

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

const STATUS_FILTERS = [
  { value: '',                      label: 'Todos' },
  { value: 'PENDING_QUOTE',         label: 'Cotizar' },
  { value: 'PENDING_PART',          label: 'Pago' },
  { value: 'READY_FOR_APPOINTMENT', label: 'Turno' },
  { value: 'VEHICLE_RECEIVED',      label: 'Recibido' },
  { value: 'IN_PROGRESS',           label: 'En progreso' },
  { value: 'QUALITY_CONTROL',       label: 'QC' },
  { value: 'COMPLETED',             label: 'Completados' },
]

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string }
}) {
  const q      = (searchParams.q ?? '').trim()
  const status = searchParams.status ?? ''

  // ── Filtros de búsqueda ──────────────────────────────────────────────────
  const where: Prisma.WorkOrderWhereInput = {}

  if (status) {
    where.status = status as never
  }

  if (q) {
    const plate = q.toUpperCase().replace(/\s/g, '')
    where.OR = [
      { vehicle: { plate: { contains: plate, mode: 'insensitive' } } },
      { user:    { firstName: { contains: q,   mode: 'insensitive' } } },
      { user:    { lastName:  { contains: q,   mode: 'insensitive' } } },
      { user:    { phone:     { contains: q } } },
    ]
  }

  const [workshop, orders, mechanics] = await Promise.all([
    prisma.workshop.findFirst({ where: { isActive: true } }),
    prisma.workOrder.findMany({
      where,
      include: {
        user:       { select: { firstName: true, lastName: true, phone: true } },
        vehicle:    { select: { brand: true, model: true, year: true, plate: true } },
        orderItems: { select: { status: true, taskType: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.user.findMany({
      where:   { role: 'MECHANIC', passwordHash: { not: null } },
      select:  { id: true, firstName: true, lastName: true },
      orderBy: { firstName: 'asc' },
    }),
  ])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // KPIs usan todos los datos (sin filtro de búsqueda)
  const allOrders = q || status
    ? await prisma.workOrder.findMany({
        select: { status: true, totalAmount: true, createdAt: true, checkInAt: true },
        orderBy: { createdAt: 'desc' }, take: 50,
      })
    : orders

  const todayOrders    = allOrders.filter(o => o.createdAt >= today || (o.checkInAt && o.checkInAt >= today))
  const completedToday = todayOrders.filter(o => o.status === 'COMPLETED')
  const revenueToday   = completedToday.reduce((s, o) => s + Number(o.totalAmount ?? 0), 0)
  const pending        = allOrders.filter(o => ['PENDING_QUOTE', 'PENDING_PART'].includes(o.status))

  // Mapa de mecánicos para mostrar nombre en tabla
  const mechanicMap = Object.fromEntries(mechanics.map(m => [m.id, `${m.firstName} ${m.lastName[0]}.`]))

  return (
    <div className="min-h-screen bg-steel-900 text-gray-100 font-body">
      {/* Header */}
      <header className="bg-steel-800 border-b border-steel-600 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Express Service</p>
          <h1 className="font-display text-2xl font-bold text-brand leading-none">BACKOFFICE</h1>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-end">
          <Link href="/admin/analytics"
            className="text-xs border border-steel-500 text-gray-300 rounded-lg px-3 py-2 hover:border-brand hover:text-brand transition-colors">
            📊 Analytics
          </Link>
          <Link href="/admin/agenda"
            className="text-xs border border-steel-500 text-gray-300 rounded-lg px-3 py-2 hover:border-brand hover:text-brand transition-colors">
            📅 Agenda
          </Link>
          <Link href="/admin/mecanicos"
            className="text-xs border border-steel-500 text-gray-300 rounded-lg px-3 py-2 hover:border-brand hover:text-brand transition-colors">
            👷 Mecánicos
          </Link>
          <Link href="/mecanico"
            className="text-xs border border-steel-500 text-gray-300 rounded-lg px-3 py-2 hover:border-brand hover:text-brand transition-colors">
            Panel Mecánico →
          </Link>
          {workshop && (
            <a href={`/api/pdf/monthly/${workshop.id}/${new Date().toISOString().slice(0,7)}`} target="_blank"
              className="text-xs bg-brand text-black font-bold rounded-lg px-3 py-2">
              PDF Mensual
            </a>
          )}
          <AdminLogoutButton />
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {/* KPIs */}
        {workshop && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Score del taller',   value: `${Math.round(workshop.score)}/100`,   sub: 'Algoritmo Uber',                                                 color: 'text-brand' },
              { label: 'Servicios hoy',       value: completedToday.length,                 sub: `de ${todayOrders.length} totales` },
              { label: 'Facturación hoy',     value: fmt(revenueToday),                     sub: 'completados' },
              { label: 'NPS promedio',        value: workshop.npsAverage.toFixed(1),        sub: 'último trimestre',                                              color: workshop.npsAverage >= 8 ? 'text-green-400' : 'text-yellow-400' },
              { label: 'Pendientes',          value: pending.length,                        sub: 'cotizaciones / pagos',                                          color: pending.length > 0 ? 'text-orange-400' : '' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-steel-800 border border-steel-600 rounded-xl p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">{kpi.label}</p>
                <p className={`font-display font-bold text-2xl leading-none ${kpi.color ?? 'text-white'}`}>{kpi.value}</p>
                <p className="text-gray-600 text-xs mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Búsqueda + filtros ─────────────────────────────────────────────── */}
        <div className="bg-steel-800 border border-steel-600 rounded-xl overflow-hidden mb-0">
          <div className="px-5 py-4 border-b border-steel-700 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Search form */}
            <form method="GET" action="/admin" className="flex gap-2 flex-1">
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar por patente, cliente o teléfono…"
                className="flex-1 min-w-0 bg-steel-700 border border-steel-500 text-white text-sm rounded-lg px-3 py-2 placeholder:text-gray-600 focus:outline-none focus:border-brand"
              />
              {status && <input type="hidden" name="status" value={status} />}
              <button type="submit"
                className="bg-brand text-black font-bold text-xs px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors shrink-0">
                Buscar
              </button>
              {(q || status) && (
                <a href="/admin"
                  className="text-xs text-gray-500 hover:text-gray-300 border border-steel-600 px-3 py-2 rounded-lg transition-colors shrink-0">
                  Limpiar
                </a>
              )}
            </form>

            <span className="text-gray-600 text-xs shrink-0">{orders.length} resultado{orders.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Filtros de estado */}
          <div className="px-5 py-3 border-b border-steel-700 flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <a
                key={f.value}
                href={`/admin?status=${f.value}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  status === f.value
                    ? 'bg-brand text-black'
                    : 'bg-steel-700 text-gray-400 hover:text-white hover:bg-steel-600'
                }`}
              >
                {f.label}
              </a>
            ))}
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-steel-700">
                  <th className="text-left px-5 py-3">OT</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Vehículo · Patente</th>
                  <th className="text-left px-4 py-3">Mecánico</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-center px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-600">
                      No se encontraron órdenes con los filtros actuales.
                    </td>
                  </tr>
                ) : orders.map((wo, i) => {
                  const mName = wo.assignedMechanicId ? (mechanicMap[wo.assignedMechanicId] ?? '?') : null
                  return (
                    <tr key={wo.id}
                      className={`border-b border-steel-700/50 hover:bg-steel-700/30 transition-colors ${i % 2 !== 0 ? 'bg-steel-900/30' : ''}`}>
                      <td className="px-5 py-3 font-mono text-xs text-gray-400">
                        #{wo.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[wo.status] ?? 'bg-gray-400'}`} />
                          <span className="text-xs whitespace-nowrap">{STATUS_LABEL[wo.status] ?? wo.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white">{wo.user.firstName} {wo.user.lastName}</td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300">{wo.vehicle.brand} {wo.vehicle.model} {wo.vehicle.year}</span>
                        <span className="ml-2 font-display font-bold text-brand tracking-widest text-xs">{wo.vehicle.plate}</span>
                      </td>
                      <td className="px-4 py-3">
                        {mName ? (
                          <span className="text-xs bg-brand/10 text-brand border border-brand/20 px-2 py-0.5 rounded-full">
                            {mName}
                          </span>
                        ) : (
                          <span className="text-gray-700 text-xs">—</span>
                        )}
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
                          {wo.status === 'PENDING_QUOTE' && (
                            <Link href={`/admin/orden/${wo.id}`}
                              className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded font-bold">
                              ¡Cotizar!
                            </Link>
                          )}
                          {wo.status === 'PENDING_PART' && (
                            <Link href={`/admin/orden/${wo.id}`}
                              className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded font-bold">
                              ¡Avanzar!
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
