/**
 * /admin/agenda — Calendario semanal de turnos y trabajos activos
 */

import { prisma } from '@/lib/db'
import Link from 'next/link'
import {
  startOfWeek, endOfWeek, addDays, addWeeks, subWeeks,
  format, isSameDay, isToday, parseISO
} from 'date-fns'
import { es } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

// ── Status config ─────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; dot: string }> = {
  READY_FOR_APPOINTMENT: { label: 'Turno confirmado', bg: 'bg-sky-900/40 border-sky-600/40',   dot: 'bg-sky-400' },
  VEHICLE_RECEIVED:      { label: 'Recibido',         bg: 'bg-indigo-900/40 border-indigo-600/40', dot: 'bg-indigo-400' },
  IN_PROGRESS:           { label: 'En progreso',      bg: 'bg-blue-900/40 border-blue-600/40', dot: 'bg-blue-400 animate-pulse' },
  QUALITY_CONTROL:       { label: 'Control calidad',  bg: 'bg-purple-900/40 border-purple-600/40', dot: 'bg-purple-400' },
  COMPLETED:             { label: 'Completado',       bg: 'bg-green-900/30 border-green-700/40', dot: 'bg-green-400' },
  CANCELLED:             { label: 'Cancelado',        bg: 'bg-red-900/20 border-red-700/30 opacity-50', dot: 'bg-red-400' },
  PENDING_QUOTE:         { label: 'Sin cotizar',      bg: 'bg-orange-900/30 border-orange-700/40', dot: 'bg-orange-400' },
  PENDING_PART:          { label: 'Pendiente pago',   bg: 'bg-yellow-900/30 border-yellow-700/40', dot: 'bg-yellow-400' },
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { week?: string }
}) {
  // ── Semana activa ──────────────────────────────────────────────────────
  const weekStart = searchParams.week
    ? startOfWeek(parseISO(searchParams.week), { weekStartsOn: 1 })
    : startOfWeek(new Date(), { weekStartsOn: 1 })

  const weekEnd  = endOfWeek(weekStart, { weekStartsOn: 1 })
  const prevWeek = format(subWeeks(weekStart, 1), 'yyyy-MM-dd')
  const nextWeek = format(addWeeks(weekStart, 1), 'yyyy-MM-dd')
  const days     = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // ── Queries paralelas ──────────────────────────────────────────────────
  // 1. Turnos agendados para esta semana (appointment.scheduledAt en rango)
  // 2. Órdenes activas con checkInAt en esta semana
  // 3. Mecánicos para mostrar badges
  const [appointments, activeOrders, mechanics] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: weekStart, lte: weekEnd },
        status:      { not: 'CANCELLED' },
      },
      include: {
        workOrder: { select: { id: true, status: true, assignedMechanicId: true } },
        user:      { select: { firstName: true, lastName: true } },
        vehicle:   { select: { brand: true, model: true, plate: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    }),
    // Órdenes con checkInAt en la semana (vehículos que ingresaron)
    prisma.workOrder.findMany({
      where: {
        checkInAt: { gte: weekStart, lte: weekEnd },
      },
      include: {
        user:    { select: { firstName: true, lastName: true } },
        vehicle: { select: { brand: true, model: true, plate: true } },
      },
      orderBy: { checkInAt: 'asc' },
    }),
    prisma.user.findMany({
      where:  { role: 'MECHANIC', passwordHash: { not: null } },
      select: { id: true, firstName: true, lastName: true },
    }),
  ])

  const mechanicMap = Object.fromEntries(mechanics.map(m => [m.id, m.firstName]))

  // ── Estructura por día ─────────────────────────────────────────────────
  type DayEvent =
    | { kind: 'appointment'; id: string; time: string; clientName: string; plate: string; vehicle: string; status: string; mechanicId: string | null; workOrderId: string | null; durationMin: number }
    | { kind: 'active';      id: string; time: string; clientName: string; plate: string; vehicle: string; status: string; mechanicId: string | null }

  const eventsByDay: Map<string, DayEvent[]> = new Map(
    days.map(d => [format(d, 'yyyy-MM-dd'), []])
  )

  // Agregar turnos agendados
  for (const apt of appointments) {
    const dayKey = format(apt.scheduledAt, 'yyyy-MM-dd')
    const list   = eventsByDay.get(dayKey)
    if (!list) continue

    // Si ya tiene workOrder con checkIn, no duplicar (se mostrará como active)
    const hasCheckIn = apt.workOrder?.status &&
      ['VEHICLE_RECEIVED', 'IN_PROGRESS', 'QUALITY_CONTROL', 'COMPLETED'].includes(apt.workOrder.status)
    if (hasCheckIn) continue

    list.push({
      kind:        'appointment',
      id:          apt.id,
      time:        format(apt.scheduledAt, 'HH:mm'),
      clientName:  `${apt.user.firstName} ${apt.user.lastName}`,
      plate:       apt.vehicle.plate,
      vehicle:     `${apt.vehicle.brand} ${apt.vehicle.model}`,
      status:      apt.workOrder?.status ?? 'READY_FOR_APPOINTMENT',
      mechanicId:  apt.workOrder?.assignedMechanicId ?? null,
      workOrderId: apt.workOrder?.id ?? null,
      durationMin: apt.durationMin,
    })
  }

  // Agregar órdenes activas (checkIn esta semana)
  for (const wo of activeOrders) {
    if (!wo.checkInAt) continue
    const dayKey = format(wo.checkInAt, 'yyyy-MM-dd')
    const list   = eventsByDay.get(dayKey)
    if (!list) continue

    list.push({
      kind:       'active',
      id:         wo.id,
      time:       format(wo.checkInAt, 'HH:mm'),
      clientName: `${wo.user.firstName} ${wo.user.lastName}`,
      plate:      wo.vehicle.plate,
      vehicle:    `${wo.vehicle.brand} ${wo.vehicle.model}`,
      status:     wo.status,
      mechanicId: wo.assignedMechanicId,
    })
  }

  // Ordenar por hora dentro de cada día
  for (const list of eventsByDay.values()) {
    list.sort((a, b) => a.time.localeCompare(b.time))
  }

  const totalEvents = [...eventsByDay.values()].reduce((s, l) => s + l.length, 0)

  return (
    <div className="min-h-screen bg-steel-900 text-gray-100 font-body">
      {/* Header */}
      <header className="bg-steel-800 border-b border-steel-600 px-6 py-4 flex items-center gap-4 flex-wrap">
        <Link href="/admin" className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Backoffice
        </Link>
        <div className="flex-1">
          <p className="text-gray-500 text-[10px] uppercase tracking-widest">Calendario</p>
          <h1 className="font-display text-2xl font-bold text-brand leading-none">AGENDA</h1>
        </div>

        {/* Navegación de semana */}
        <div className="flex items-center gap-2">
          <a href={`/admin/agenda?week=${prevWeek}`}
            className="border border-steel-500 text-gray-400 hover:text-white hover:border-steel-400 rounded-lg px-3 py-2 text-sm transition-colors">
            ‹ Anterior
          </a>
          <div className="text-center px-3">
            <p className="text-white font-bold text-sm">
              {format(weekStart, "d 'de' MMMM", { locale: es })} — {format(weekEnd, "d 'de' MMMM", { locale: es })}
            </p>
            <p className="text-gray-600 text-xs">{format(weekStart, 'yyyy')}</p>
          </div>
          <a href={`/admin/agenda?week=${nextWeek}`}
            className="border border-steel-500 text-gray-400 hover:text-white hover:border-steel-400 rounded-lg px-3 py-2 text-sm transition-colors">
            Siguiente ›
          </a>
          <a href="/admin/agenda"
            className="ml-2 bg-brand text-black font-bold text-xs px-3 py-2 rounded-lg hover:bg-yellow-400 transition-colors">
            Hoy
          </a>
        </div>

        <Link href="/admin/analytics"
          className="text-xs border border-steel-500 text-gray-300 rounded-lg px-3 py-2 hover:border-brand hover:text-brand transition-colors">
          📊 Analytics
        </Link>
      </header>

      <main className="p-4 max-w-[1400px] mx-auto">

        {/* Leyenda rápida */}
        <div className="flex gap-4 mb-4 flex-wrap">
          {[
            { color: 'bg-sky-400',    label: 'Turno confirmado' },
            { color: 'bg-blue-400',   label: 'En progreso' },
            { color: 'bg-purple-400', label: 'Control calidad' },
            { color: 'bg-green-400',  label: 'Completado' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2 h-2 rounded-full ${l.color}`} />
              {l.label}
            </div>
          ))}
          <span className="text-gray-700 text-xs ml-auto">
            {totalEvents} evento{totalEvents !== 1 ? 's' : ''} esta semana
          </span>
        </div>

        {/* ── Grid de la semana ──────────────────────────────────────────── */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, dayIdx) => {
            const dayKey   = format(day, 'yyyy-MM-dd')
            const events   = eventsByDay.get(dayKey) ?? []
            const todayDay = isToday(day)

            return (
              <div key={dayKey}
                className={`min-h-[300px] rounded-xl border flex flex-col transition-colors ${
                  todayDay
                    ? 'bg-brand/5 border-brand/40'
                    : 'bg-steel-800/50 border-steel-700'
                }`}>
                {/* Cabecera del día */}
                <div className={`px-3 pt-3 pb-2 border-b ${todayDay ? 'border-brand/20' : 'border-steel-700'}`}>
                  <p className={`text-xs font-bold uppercase tracking-wider ${todayDay ? 'text-brand' : 'text-gray-500'}`}>
                    {DAY_NAMES[dayIdx]}
                  </p>
                  <p className={`font-display font-bold text-2xl leading-none mt-0.5 ${todayDay ? 'text-brand' : 'text-gray-400'}`}>
                    {format(day, 'd')}
                  </p>
                  {events.length > 0 && (
                    <p className="text-gray-600 text-[10px] mt-1">
                      {events.length} evento{events.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* Eventos del día */}
                <div className="flex-1 p-2 space-y-2">
                  {events.length === 0 ? (
                    <p className="text-gray-800 text-xs text-center mt-6">—</p>
                  ) : events.map(ev => {
                    const cfg   = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG['PENDING_QUOTE']
                    const href  = ev.kind === 'active'
                      ? `/admin/orden/${ev.id}`
                      : ev.workOrderId
                        ? `/admin/orden/${ev.workOrderId}`
                        : '#'
                    const mName = ev.mechanicId ? (mechanicMap[ev.mechanicId] ?? null) : null

                    return (
                      <Link key={`${ev.kind}-${ev.id}`} href={href}
                        className={`block border rounded-lg p-2 hover:opacity-90 transition-opacity cursor-pointer ${cfg.bg}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                          <span className="text-[10px] text-gray-400 font-mono">{ev.time}</span>
                          {ev.kind === 'appointment' && (
                            <span className="text-[10px] text-gray-600 ml-auto">{ev.durationMin}'</span>
                          )}
                        </div>
                        <p className="text-white text-xs font-bold leading-tight">{ev.plate}</p>
                        <p className="text-gray-400 text-[10px] leading-tight truncate">{ev.vehicle}</p>
                        <p className="text-gray-500 text-[10px] truncate mt-0.5">{ev.clientName}</p>
                        {mName && (
                          <p className="text-brand text-[10px] mt-1 font-medium">👷 {mName}</p>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Vista compacta: próximos 7 días si semana vacía ──────────────── */}
        {totalEvents === 0 && (
          <div className="mt-8 text-center py-16">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-gray-500">No hay turnos ni ingresos para esta semana.</p>
            <Link href="/admin" className="text-brand text-sm mt-2 inline-block hover:underline">
              Ver todas las órdenes →
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
