/**
 * /cliente/mis-ordenes?phone=XXXX
 * Lista de órdenes para un teléfono dado (sin auth — prototipo)
 */

import { prisma } from '@/lib/db'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

const STATUS_MAP: Record<string, { label: string; dot: string }> = {
  PENDING_QUOTE:         { label: 'Presupuesto en preparación', dot: 'bg-yellow-400' },
  PENDING_PART:          { label: 'Esperando repuestos',         dot: 'bg-orange-400' },
  READY_FOR_APPOINTMENT: { label: 'Listo para turno',           dot: 'bg-blue-400'   },
  VEHICLE_RECEIVED:      { label: 'Vehículo recibido',           dot: 'bg-blue-400'   },
  IN_PROGRESS:           { label: 'En reparación',               dot: 'bg-brand'      },
  QUALITY_CONTROL:       { label: 'Control de calidad',          dot: 'bg-purple-400' },
  COMPLETED:             { label: 'Completado',                  dot: 'bg-green-400'  },
}

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
              vehicle:    true,
              workshop:   true,
              orderItems: { select: { taskName: true }, take: 3 },
            },
          },
        },
      })
    : null

  return (
    <div className="min-h-screen bg-steel-900 p-4">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 py-4 mb-4">
          <Link href="/cliente" className="text-gray-500 hover:text-brand transition-colors text-xl leading-none">←</Link>
          <div>
            <h1 className="text-white font-bold font-display text-xl">Mis órdenes</h1>
            {user && (
              <p className="text-gray-500 text-sm">{user.firstName} {user.lastName} · {phone}</p>
            )}
          </div>
        </div>

        {/* No phone */}
        {!phone && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📱</p>
            <p className="text-gray-400">Ingresá tu teléfono para ver tus órdenes</p>
            <Link href="/cliente" className="mt-4 inline-block text-brand text-sm">← Volver</Link>
          </div>
        )}

        {/* Not found */}
        {phone && !user && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-gray-300 font-bold mb-2">No encontramos órdenes</p>
            <p className="text-gray-500 text-sm mb-6">
              No hay registros para el teléfono <span className="text-white">{phone}</span>
            </p>
            <Link href="/reservar"
              className="inline-block bg-brand text-black font-bold px-6 py-3 rounded-xl hover:bg-brand/90 transition-colors">
              Reservar un turno →
            </Link>
          </div>
        )}

        {/* Empty orders */}
        {user && user.workOrders.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-gray-400">Aún no tenés órdenes registradas</p>
            <Link href="/reservar"
              className="mt-4 inline-block bg-brand text-black font-bold px-6 py-3 rounded-xl hover:bg-brand/90 transition-colors">
              Reservar turno →
            </Link>
          </div>
        )}

        {/* Orders list */}
        {user && user.workOrders.length > 0 && (
          <div className="space-y-3">
            {user.workOrders.map(wo => {
              const st  = STATUS_MAP[wo.status] ?? { label: wo.status, dot: 'bg-gray-400' }
              const date = wo.createdAt
                ? format(new Date(wo.createdAt), "d 'de' MMMM yyyy", { locale: es })
                : ''
              return (
                <Link
                  key={wo.id}
                  href={`/cliente/orden/${wo.id}`}
                  className="block bg-steel-800 border border-steel-600 hover:border-brand rounded-2xl p-5 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white font-display font-bold text-lg leading-none">
                        {wo.vehicle.brand} {wo.vehicle.model}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {wo.vehicle.plate} · {wo.vehicle.year}
                      </p>
                    </div>
                    <span className="text-gray-600 text-xs font-mono bg-steel-700 px-2 py-1 rounded">
                      #{wo.id.slice(-6).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${st.dot} shrink-0`} />
                    <span className="text-sm font-bold text-white">{st.label}</span>
                  </div>

                  {wo.orderItems.length > 0 && (
                    <p className="text-gray-500 text-xs">
                      {wo.orderItems.map(i => i.taskName).join(' · ')}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <p className="text-gray-600 text-xs">{wo.workshop.name}</p>
                    <span className="text-gray-600 text-xs group-hover:text-brand transition-colors">
                      Ver detalle →
                    </span>
                  </div>

                  {date && <p className="text-gray-700 text-xs mt-1">{date}</p>}
                </Link>
              )
            })}

            <div className="pt-2 pb-6 text-center">
              <Link href="/reservar"
                className="inline-block border border-brand text-brand font-bold px-6 py-2.5 rounded-xl hover:bg-brand/10 transition-colors text-sm">
                + Reservar nuevo turno
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
