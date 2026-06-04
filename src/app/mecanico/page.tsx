/**
 * /mecanico — Panel del mecánico (mobile-first)
 * Lista las órdenes activas del día y permite navegar a cada una.
 */

import { prisma } from '@/lib/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  VEHICLE_RECEIVED: 'Recibido',
  IN_PROGRESS:      'En progreso',
  QUALITY_CONTROL:  'Control calidad',
  READY_FOR_APPOINTMENT: 'Esperando',
}
const STATUS_COLOR: Record<string, string> = {
  VEHICLE_RECEIVED: 'badge-pending',
  IN_PROGRESS:      'badge-progress',
  QUALITY_CONTROL:  'badge-quality',
  READY_FOR_APPOINTMENT: 'bg-steel-600 text-gray-300 border border-steel-400',
}

export default async function MecanicoPage() {
  const orders = await prisma.workOrder.findMany({
    where: {
      status: { in: ['READY_FOR_APPOINTMENT', 'VEHICLE_RECEIVED', 'IN_PROGRESS', 'QUALITY_CONTROL'] },
    },
    include: {
      user:       { select: { firstName: true, lastName: true, phone: true } },
      vehicle:    { select: { brand: true, model: true, year: true, plate: true } },
      orderItems: { select: { status: true, taskType: true, taskName: true } },
    },
    orderBy: { checkInAt: 'asc' },
  })

  const now = new Date()
  const dateLabel = now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-steel-900 text-gray-100 font-body pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-steel-800 border-b border-steel-600 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Express Service</p>
          <h1 className="font-display text-xl font-bold text-brand leading-none">PANEL MECÁNICO</h1>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-400 capitalize">{dateLabel}</p>
          <p className="text-brand font-bold text-sm">{orders.length} activas</p>
        </div>
      </header>

      {/* Órdenes */}
      <main className="px-4 py-4 space-y-3">
        {orders.length === 0 && (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">✅</p>
            <p className="text-gray-400 text-lg">No hay órdenes activas</p>
            <p className="text-gray-600 text-sm mt-1">Todas las tareas del día están completas</p>
          </div>
        )}

        {orders.map((wo) => {
          const laborItems  = wo.orderItems.filter(i => i.taskType === 'LABOR')
          const completedLb = laborItems.filter(i => i.status === 'COMPLETED').length
          const progress    = laborItems.length > 0 ? (completedLb / laborItems.length) * 100 : 0
          const inProgress  = wo.orderItems.find(i => i.status === 'IN_PROGRESS')

          return (
            <Link key={wo.id} href={`/mecanico/${wo.id}`}
              className="block bg-steel-800 border border-steel-600 rounded-xl p-4 active:scale-[0.98] transition-transform">

              {/* Status + plate */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_COLOR[wo.status] ?? ''}`}>
                  {STATUS_LABEL[wo.status] ?? wo.status}
                </span>
                <span className="font-display font-bold text-brand text-lg tracking-widest">
                  {wo.vehicle.plate}
                </span>
              </div>

              {/* Vehicle */}
              <p className="font-display font-bold text-xl text-white leading-none">
                {wo.vehicle.brand} {wo.vehicle.model}
              </p>
              <p className="text-gray-500 text-sm">{wo.vehicle.year} · {wo.checkInKm?.toLocaleString('es-AR')} km</p>

              {/* Client */}
              <p className="text-gray-300 text-sm mt-2">
                {wo.user.firstName} {wo.user.lastName}
              </p>

              {/* Task en progreso */}
              {inProgress && (
                <div className="mt-3 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
                  <span className="text-blue-300 text-xs font-medium truncate">{inProgress.taskName}</span>
                </div>
              )}

              {/* Progress bar */}
              {laborItems.length > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Progreso</span>
                    <span>{completedLb}/{laborItems.length} tareas</span>
                  </div>
                  <div className="h-1.5 bg-steel-600 rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full transition-all"
                      style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center justify-end">
                <span className="text-gray-500 text-xs">Ver detalle →</span>
              </div>
            </Link>
          )
        })}
      </main>

      {/* Nav bottom */}
      <nav className="fixed bottom-0 left-0 right-0 bg-steel-800 border-t border-steel-600 flex">
        <Link href="/mecanico" className="flex-1 py-3 text-center text-brand text-xs font-bold">
          📋 Órdenes
        </Link>
        <Link href="/admin" className="flex-1 py-3 text-center text-gray-500 text-xs">
          ⚙️ Admin
        </Link>
      </nav>
    </div>
  )
}
