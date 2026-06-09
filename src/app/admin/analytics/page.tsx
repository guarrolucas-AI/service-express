/**
 * /admin/analytics — Dashboard de métricas del taller
 */

import { prisma } from '@/lib/db'
import Link from 'next/link'
import { format, subMonths, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { AnalyticsCharts } from './AnalyticsCharts'
import type { MonthlyRevenue, DailyOrders, TopService, StatusDist, MechanicStat } from './AnalyticsCharts'

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
  IN_PROGRESS:           'bg-blue-400',
  QUALITY_CONTROL:       'bg-purple-400',
  COMPLETED:             'bg-green-400',
  CANCELLED:             'bg-red-400',
}

export default async function AnalyticsPage() {
  const now = new Date()
  const sixMonthsAgo  = startOfMonth(subMonths(now, 5))   // incluye el mes actual
  const thirtyDaysAgo = startOfDay(subDays(now, 29))

  const [completedOrders, allOrders, orderItems, mechanics] = await Promise.all([
    // Órdenes completadas últimos 6 meses (para revenue)
    prisma.workOrder.findMany({
      where:  { status: 'COMPLETED', completedAt: { gte: sixMonthsAgo } },
      select: { completedAt: true, totalAmount: true },
    }),
    // Todas las órdenes (para estado + diario)
    prisma.workOrder.findMany({
      select: {
        status:              true,
        createdAt:           true,
        assignedMechanicId:  true,
        npsScore:            true,
        totalAmount:         true,
        completedAt:         true,
      },
    }),
    // Items para top servicios
    prisma.orderItem.findMany({
      select: { taskName: true, taskType: true, laborPrice: true, partPrice: true, quantity: true },
    }),
    // Mecánicos activos
    prisma.user.findMany({
      where:  { role: 'MECHANIC' },
      select: { id: true, firstName: true, lastName: true },
      orderBy:{ firstName: 'asc' },
    }),
  ])

  // ── Revenue mensual ────────────────────────────────────────────────────
  const monthBuckets = new Map<string, { revenue: number; count: number }>()
  for (let i = 5; i >= 0; i--) {
    const m = subMonths(now, i)
    monthBuckets.set(format(m, 'yyyy-MM'), { revenue: 0, count: 0 })
  }
  for (const o of completedOrders) {
    if (!o.completedAt) continue
    const key = format(o.completedAt, 'yyyy-MM')
    const bucket = monthBuckets.get(key)
    if (bucket) {
      bucket.revenue += Number(o.totalAmount ?? 0)
      bucket.count   += 1
    }
  }
  const monthly: MonthlyRevenue[] = [...monthBuckets.entries()].map(([month, v]) => ({
    month,
    label:   format(new Date(month + '-01'), 'MMM', { locale: es }).replace(/^\w/, c => c.toUpperCase()),
    revenue: Math.round(v.revenue),
    count:   v.count,
  }))

  // ── KPIs globales ──────────────────────────────────────────────────────
  const totalRevenue   = monthly.reduce((s, m) => s + m.revenue, 0)
  const totalCompleted = monthly.reduce((s, m) => s + m.count,   0)
  const avgTicket      = totalCompleted > 0 ? Math.round(totalRevenue / totalCompleted) : 0

  // ── Órdenes por día (últimos 30) ───────────────────────────────────────
  const dayBuckets = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    dayBuckets.set(format(subDays(now, i), 'yyyy-MM-dd'), 0)
  }
  for (const o of allOrders) {
    const key = format(o.createdAt, 'yyyy-MM-dd')
    if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1)
  }
  const daily: DailyOrders[] = [...dayBuckets.entries()].map(([date, count]) => ({
    date,
    label: format(new Date(date), 'd/M'),
    count,
  }))

  // ── Top 8 servicios ────────────────────────────────────────────────────
  const serviceMap = new Map<string, { count: number; revenue: number }>()
  for (const item of orderItems) {
    const key = item.taskName
    const cur = serviceMap.get(key) ?? { count: 0, revenue: 0 }
    const price = item.taskType === 'LABOR'
      ? Number(item.laborPrice ?? 0) * item.quantity
      : Number(item.partPrice  ?? 0) * item.quantity
    serviceMap.set(key, { count: cur.count + item.quantity, revenue: cur.revenue + price })
  }
  const services: TopService[] = [...serviceMap.entries()]
    .map(([name, v]) => ({ name, count: v.count, revenue: Math.round(v.revenue) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // ── Distribución de estados ────────────────────────────────────────────
  const statusCount = new Map<string, number>()
  for (const o of allOrders) {
    statusCount.set(o.status, (statusCount.get(o.status) ?? 0) + 1)
  }
  const statuses: StatusDist[] = Object.entries(STATUS_LABEL).map(([status, label]) => ({
    status,
    label,
    count: statusCount.get(status) ?? 0,
    color: STATUS_DOT[status] ?? 'bg-gray-400',
  }))

  // ── Performance mecánicos ──────────────────────────────────────────────
  const mechanicStats: MechanicStat[] = mechanics.map(m => {
    const assigned  = allOrders.filter(o => o.assignedMechanicId === m.id)
    const completed = assigned.filter(o => o.status === 'COMPLETED')
    const npsScores = completed.map(o => o.npsScore).filter((n): n is number => n !== null)
    const avgNps    = npsScores.length > 0 ? npsScores.reduce((a, b) => a + b, 0) / npsScores.length : null
    return {
      id:        m.id,
      name:      `${m.firstName} ${m.lastName}`,
      assigned:  assigned.length,
      completed: completed.length,
      avgNps:    avgNps !== null ? Math.round(avgNps * 10) / 10 : null,
    }
  })

  return (
    <div className="min-h-screen bg-steel-900 text-gray-100 font-body">
      {/* Header */}
      <header className="bg-steel-800 border-b border-steel-600 px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Backoffice
        </Link>
        <div className="flex-1">
          <p className="text-gray-500 text-[10px] uppercase tracking-widest">Estadísticas</p>
          <h1 className="font-display text-2xl font-bold text-brand leading-none">ANALYTICS</h1>
        </div>
        <Link href="/admin/agenda"
          className="text-xs border border-steel-500 text-gray-300 rounded-lg px-3 py-2 hover:border-brand hover:text-brand transition-colors">
          📅 Ver agenda
        </Link>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        <AnalyticsCharts
          monthly={monthly}
          daily={daily}
          services={services}
          statuses={statuses}
          mechanics={mechanicStats}
          totalRevenue={totalRevenue}
          totalCompleted={totalCompleted}
          avgTicket={avgTicket}
        />
      </main>
    </div>
  )
}
