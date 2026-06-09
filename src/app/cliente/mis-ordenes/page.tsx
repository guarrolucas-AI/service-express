/**
 * /cliente/mis-ordenes?phone=XXXX
 * Portal del cliente — historial y órdenes activas
 */

import { prisma } from '@/lib/db'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { PushSubscribeButton } from '@/components/PushSubscribeButton'

export const dynamic = 'force-dynamic'

// ── Status config (desde la perspectiva del cliente) ──────────────────────
const STATUS: Record<string, { label: string; dot: string; short: string }> = {
  PENDING_QUOTE:         { label: 'Preparando tu presupuesto',  dot: 'bg-orange-400',  short: 'Presupuestando' },
  PENDING_PART:          { label: 'Esperando pago / repuestos', dot: 'bg-yellow-400',  short: 'Esperando pago' },
  READY_FOR_APPOINTMENT: { label: 'Turno confirmado',           dot: 'bg-sky-400',     short: 'Turno listo'    },
  VEHICLE_RECEIVED:      { label: 'Vehículo en el taller',      dot: 'bg-indigo-400',  short: 'En taller'      },
  IN_PROGRESS:           { label: 'En reparación ahora',        dot: 'bg-brand',       short: 'En reparación'  },
  QUALITY_CONTROL:       { label: 'Control de calidad final',   dot: 'bg-purple-400',  short: 'Finalizando'    },
  COMPLETED:             { label: 'Entregado ✓',                dot: 'bg-green-400',   short: 'Completado'     },
}

const ACTIVE_STATUSES = new Set([
  'PENDING_QUOTE','PENDING_PART','READY_FOR_APPOINTMENT',
  'VEHICLE_RECEIVED','IN_PROGRESS','QUALITY_CONTROL',
])

const PROGRESS: Record<string, number> = {
  PENDING_QUOTE: 10, PENDING_PART: 25, READY_FOR_APPOINTMENT: 40,
  VEHICLE_RECEIVED: 55, IN_PROGRESS: 70, QUALITY_CONTROL: 88, COMPLETED: 100,
}

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }

export default async function MisOrdenesPage({
  searchParams,
}: {
  searchParams: { phone?: string }
}) {
  const phone = searchParams.phone?.trim() ?? ''

  const user = phone
    ? await prisma.user.findFirst({
        where: { phone },
        include: {
          workOrders: {
            orderBy: { createdAt: 'desc' },
            include: {
              vehicle:    { select: { brand: true, model: true, year: true, plate: true } },
              workshop:   { select: { name: true } },
              orderItems: { select: { taskName: true }, take: 3 },
            },
          },
          vehicles: {
            select: { brand: true, model: true, year: true, plate: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      })
    : null

  // ── Cálculos ──────────────────────────────────────────────────────────
  const active    = user?.workOrders.filter(o => ACTIVE_STATUSES.has(o.status)) ?? []
  const completed = user?.workOrders.filter(o => o.status === 'COMPLETED')      ?? []
  const totalSpent = completed.reduce((s, o) => s + Number(o.totalAmount ?? 0), 0)

  return (
    <div className="min-h-screen bg-steel-900 pb-12">
      {/* Header */}
      <div className="bg-steel-800 border-b border-steel-600 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link href="/cliente" className="text-gray-500 hover:text-brand transition-colors text-xl leading-none">←</Link>
          <div className="flex-1">
            <h1 className="text-white font-bold font-display text-xl leading-none">Mis órdenes</h1>
            {user && (
              <p className="text-gray-500 text-xs mt-0.5">{user.firstName} {user.lastName}</p>
            )}
          </div>
          {user && (
            <Link
              href={`/cliente/perfil?phone=${phone}`}
              className="w-9 h-9 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold hover:bg-brand/30 transition-colors"
              title="Editar perfil"
            >
              {user.firstName[0]?.toUpperCase()}
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-5">

        {/* ── Sin teléfono ─────────────────────────────────────────────── */}
        {!phone && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📱</p>
            <p className="text-gray-400">Ingresá tu teléfono para ver tus órdenes</p>
            <Link href="/cliente" className="mt-4 inline-block text-brand text-sm">← Volver</Link>
          </div>
        )}

        {/* ── No encontrado ─────────────────────────────────────────────── */}
        {phone && !user && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-gray-300 font-bold mb-2">No encontramos tu cuenta</p>
            <p className="text-gray-500 text-sm mb-6">
              No hay registros para <span className="text-white">{phone}</span>
            </p>
            <Link href="/reservar"
              className="inline-block bg-brand text-black font-bold px-6 py-3 rounded-xl hover:bg-brand/90 transition-colors">
              Reservar un turno →
            </Link>
          </div>
        )}

        {user && (
          <>
            {/* ── Notificaciones push ──────────────────────────────────────── */}
            <PushSubscribeButton phone={phone} />

            {/* ── KPI banner ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total gastado',   value: fmt(totalSpent),        color: 'text-brand' },
                { label: 'Servicios',        value: completed.length,       color: 'text-white' },
                { label: 'Vehículos',        value: user.vehicles.length,   color: 'text-white' },
              ].map(k => (
                <div key={k.label} className="bg-steel-800 border border-steel-600 rounded-2xl p-3 text-center">
                  <p className={`font-display font-bold text-xl leading-none ${k.color}`}>{k.value}</p>
                  <p className="text-gray-600 text-[10px] mt-1 uppercase tracking-wide">{k.label}</p>
                </div>
              ))}
            </div>

            {/* ── Órdenes activas ──────────────────────────────────────────── */}
            {active.length > 0 && (
              <div>
                <p className="text-brand text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand animate-pulse inline-block" />
                  En curso ({active.length})
                </p>
                <div className="space-y-3">
                  {active.map(wo => {
                    const st   = STATUS[wo.status] ?? STATUS['PENDING_QUOTE']
                    const prog = PROGRESS[wo.status] ?? 0
                    return (
                      <Link
                        key={wo.id}
                        href={`/cliente/orden/${wo.id}`}
                        className="block bg-steel-800 border border-brand/20 hover:border-brand/50 rounded-2xl p-5 transition-all group"
                      >
                        {/* Vehículo + OT */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-white font-display font-bold text-base leading-none">
                              {wo.vehicle.brand} {wo.vehicle.model}
                            </p>
                            <p className="text-gray-500 text-xs mt-0.5">{wo.vehicle.year}</p>
                          </div>
                          <span className="font-display font-bold text-brand text-sm tracking-widest">
                            {wo.vehicle.plate}
                          </span>
                        </div>

                        {/* Estado + dot */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot} ${wo.status === 'IN_PROGRESS' ? 'animate-pulse' : ''}`} />
                          <span className="text-white text-sm font-bold">{st.label}</span>
                        </div>

                        {/* Barra de progreso */}
                        <div className="h-1.5 bg-steel-700 rounded-full overflow-hidden mb-3">
                          <div
                            className="h-full rounded-full bg-brand transition-all"
                            style={{ width: `${prog}%` }}
                          />
                        </div>

                        {wo.orderItems.length > 0 && (
                          <p className="text-gray-600 text-xs truncate">
                            {wo.orderItems.map(i => i.taskName).join(' · ')}
                          </p>
                        )}

                        <p className="text-brand text-xs mt-2 group-hover:underline">
                          Ver detalle →
                        </p>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Sin órdenes ──────────────────────────────────────────── */}
            {user.workOrders.length === 0 && (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-gray-400 mb-5">Todavía no tenés órdenes registradas</p>
                <Link href="/reservar"
                  className="inline-block bg-brand text-black font-bold px-6 py-3 rounded-xl hover:bg-brand/90 transition-colors">
                  Reservar turno →
                </Link>
              </div>
            )}

            {/* ── Historial ───────────────────────────────────────────────── */}
            {completed.length > 0 && (
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">
                  Historial ({completed.length})
                </p>
                <div className="space-y-2">
                  {completed.map(wo => {
                    const date = format(new Date(wo.createdAt), "d 'de' MMMM yyyy", { locale: es })
                    return (
                      <Link
                        key={wo.id}
                        href={`/cliente/orden/${wo.id}`}
                        className="flex items-center gap-4 bg-steel-800/60 border border-steel-700 hover:border-steel-500 rounded-2xl px-4 py-3.5 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
                          <span className="text-green-400 text-sm">✓</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-bold leading-none">
                            {wo.vehicle.brand} {wo.vehicle.model}
                          </p>
                          <p className="text-gray-600 text-xs mt-0.5">{date}</p>
                          {wo.orderItems.length > 0 && (
                            <p className="text-gray-600 text-xs truncate mt-0.5">
                              {wo.orderItems.map(i => i.taskName).join(' · ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {wo.totalAmount && Number(wo.totalAmount) > 0 && (
                            <p className="text-white text-sm font-bold">{fmt(Number(wo.totalAmount))}</p>
                          )}
                          <span className="text-gray-600 text-xs group-hover:text-gray-400 transition-colors">→</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── CTA nuevo turno ─────────────────────────────────────────── */}
            <div className="pt-2 pb-4 text-center">
              <Link href="/reservar"
                className="inline-block border border-brand text-brand font-bold px-6 py-2.5 rounded-xl hover:bg-brand/10 transition-colors text-sm">
                + Reservar nuevo turno
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
