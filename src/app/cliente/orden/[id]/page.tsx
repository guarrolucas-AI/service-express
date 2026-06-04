/**
 * /cliente/orden/[id] — Estado de orden para el cliente
 * Timeline de progreso · Tareas · Resumen de inspección · NPS
 */

import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { NpsForm } from './nps-form'

export const dynamic = 'force-dynamic'

// ── Status timeline ─────────────────────────────────────────────────────────

const STEPS = [
  { key: 'PENDING_QUOTE',         label: 'Recibido',       icon: '📋' },
  { key: 'PENDING_PART',          label: 'Presupuestado',  icon: '💰' },
  { key: 'READY_FOR_APPOINTMENT', label: 'Aprobado',       icon: '✅' },
  { key: 'VEHICLE_RECEIVED',      label: 'En taller',      icon: '🚗' },
  { key: 'IN_PROGRESS',           label: 'En reparación',  icon: '🔧' },
  { key: 'QUALITY_CONTROL',       label: 'Control final',  icon: '🔍' },
  { key: 'COMPLETED',             label: 'Entregado',      icon: '🎉' },
]

const STATUS_INDEX: Record<string, number> = Object.fromEntries(STEPS.map((s, i) => [s.key, i]))

const SEMA: Record<string, string> = { GREEN: '🟢', YELLOW: '🟡', RED: '🔴' }

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }

export default async function ClienteOrdenPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { nueva?: string }
}) {
  const wo = await prisma.workOrder.findUnique({
    where: { id: params.id },
    include: {
      user:       true,
      vehicle:    true,
      workshop:   true,
      checklist:  true,
      orderItems: { orderBy: { sortOrder: 'asc' } },
      appointment: true,
    },
  })
  if (!wo) notFound()

  const currentStep = STATUS_INDEX[wo.status] ?? 0
  const isCompleted = wo.status === 'COMPLETED'
  const needsNps    = isCompleted && wo.npsScore === null
  const isNew       = searchParams.nueva === '1'

  const scheduledAt = wo.appointment?.scheduledAt
    ? format(new Date(wo.appointment.scheduledAt), "EEEE d 'de' MMMM · HH:mm'hs'", { locale: es })
    : null

  return (
    <div className="min-h-screen bg-steel-900 pb-10">
      {/* Header */}
      <div className="bg-steel-800 border-b border-steel-600 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link href={`/cliente/mis-ordenes?phone=${wo.user.phone ?? ''}`}
            className="text-gray-500 hover:text-brand transition-colors text-xl">←</Link>
          <div className="flex-1">
            <p className="text-gray-500 text-xs">Orden #{wo.id.slice(-8).toUpperCase()}</p>
            <h1 className="text-white font-display font-bold text-xl leading-none">
              {wo.vehicle.brand} {wo.vehicle.model}
            </h1>
          </div>
          <span className="font-display font-bold text-brand text-xl tracking-widest">
            {wo.vehicle.plate}
          </span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-5">

        {/* Nueva reserva banner */}
        {isNew && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-green-400 font-bold">¡Turno reservado con éxito!</p>
              <p className="text-gray-400 text-sm">
                Te contactaremos para confirmar los detalles.
              </p>
            </div>
          </div>
        )}

        {/* Turno */}
        {scheduledAt && (
          <div className="bg-steel-800 border border-steel-600 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Turno agendado</p>
              <p className="text-white font-bold capitalize">{scheduledAt}</p>
              <p className="text-gray-500 text-xs">{wo.workshop.name}</p>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-steel-800 border border-steel-600 rounded-2xl p-5">
          <p className="text-brand text-xs font-bold uppercase tracking-wider mb-5">Estado del servicio</p>
          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const isDone    = i < currentStep
              const isCurrent = i === currentStep
              const isPending = i > currentStep
              return (
                <div key={step.key} className="flex items-start gap-3">
                  {/* Line + dot */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                      isDone    ? 'bg-green-500/20 text-green-400 border border-green-500/40' :
                      isCurrent ? 'bg-brand text-black border border-brand font-bold' :
                                  'bg-steel-700 text-gray-600 border border-steel-600'
                    }`}>
                      {isDone ? '✓' : step.icon}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`w-0.5 h-5 mt-1 ${i < currentStep ? 'bg-green-500/40' : 'bg-steel-600'}`} />
                    )}
                  </div>
                  {/* Label */}
                  <div className="pb-3">
                    <p className={`font-bold text-sm leading-none mt-1.5 ${
                      isDone    ? 'text-green-400' :
                      isCurrent ? 'text-white' :
                                  'text-gray-600'
                    }`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-gray-400 text-xs mt-0.5">Estado actual</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Servicios */}
        {wo.orderItems.length > 0 && (
          <div className="bg-steel-800 border border-steel-600 rounded-2xl p-5">
            <p className="text-brand text-xs font-bold uppercase tracking-wider mb-4">Servicios</p>
            <div className="space-y-3">
              {wo.orderItems.map(item => {
                const statusColors: Record<string, string> = {
                  COMPLETED:   'text-green-400',
                  IN_PROGRESS: 'text-brand',
                  PENDING:     'text-gray-500',
                  SKIPPED:     'text-gray-600',
                }
                const statusLabels: Record<string, string> = {
                  COMPLETED:   'Completado',
                  IN_PROGRESS: 'En progreso',
                  PENDING:     'Pendiente',
                  SKIPPED:     'Omitido',
                }
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs ${statusColors[item.status] ?? 'text-gray-500'}`}>
                        {item.status === 'COMPLETED' ? '✓' : item.status === 'IN_PROGRESS' ? '●' : '○'}
                      </span>
                      <span className="text-white text-sm truncate">{item.taskName}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-bold ${statusColors[item.status] ?? 'text-gray-500'}`}>
                        {statusLabels[item.status] ?? item.status}
                      </p>
                      {item.estimatedMinutes && (
                        <p className="text-gray-600 text-xs">{item.estimatedMinutes} min</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Total */}
            {wo.totalAmount && Number(wo.totalAmount) > 0 && (
              <div className="border-t border-steel-600 mt-4 pt-4 flex items-center justify-between">
                <span className="text-gray-400 text-sm">Total estimado</span>
                <span className="text-brand font-display font-bold text-xl">
                  {fmt(Number(wo.totalAmount))}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Checklist resumido (solo si hay) */}
        {wo.checklist && (
          <div className="bg-steel-800 border border-steel-600 rounded-2xl p-5">
            <p className="text-brand text-xs font-bold uppercase tracking-wider mb-4">Inspección visual</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { label: 'Aceite',       val: wo.checklist.oilStatus },
                { label: 'Refrigerante', val: wo.checklist.coolantStatus },
                { label: 'Líq. frenos',  val: wo.checklist.brakeFluidStatus },
                { label: 'Transmisión',  val: wo.checklist.transmissionStatus },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-center gap-2">
                  <span>{SEMA[val]}</span>
                  <span className="text-gray-400 text-xs">{label}</span>
                </div>
              ))}
            </div>

            {/* Pastillas */}
            <div className="mt-3 space-y-2">
              {[
                { label: 'Frenos del.',  val: wo.checklist.frontBrakePadPct },
                { label: 'Frenos tra.', val: wo.checklist.rearBrakePadPct  },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{label}</span>
                    <span className={`font-bold ${val < 15 ? 'text-red-400' : val < 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {val}% restante
                    </span>
                  </div>
                  <div className="h-1.5 bg-steel-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${val < 15 ? 'bg-red-500' : val < 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {wo.checklist.mechanicNotes && (
              <div className="mt-4 bg-steel-700 rounded-xl p-3">
                <p className="text-gray-500 text-xs mb-1">Nota del mecánico</p>
                <p className="text-gray-300 text-sm">{wo.checklist.mechanicNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* NPS */}
        {needsNps && <NpsForm workOrderId={wo.id} />}

        {/* NPS ya enviado */}
        {isCompleted && wo.npsScore !== null && (
          <div className="bg-steel-800 border border-steel-600 rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 font-display font-bold text-2xl shrink-0 ${
              wo.npsScore >= 9 ? 'border-green-500 text-green-400' :
              wo.npsScore >= 7 ? 'border-yellow-500 text-yellow-400' :
                                  'border-red-500 text-red-400'
            }`}>
              {wo.npsScore}
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider">Tu valoración</p>
              <p className="text-white font-bold">
                {wo.npsScore >= 9 ? '¡Gracias! Promotor 🎉' : wo.npsScore >= 7 ? 'Gracias — Pasivo 🙂' : 'Gracias — Detractor 😞'}
              </p>
              {wo.npsComment && <p className="text-gray-400 text-sm mt-1">"{wo.npsComment}"</p>}
            </div>
          </div>
        )}

        {/* Taller info */}
        <div className="bg-steel-800 border border-steel-600 rounded-2xl p-5">
          <p className="text-brand text-xs font-bold uppercase tracking-wider mb-3">Taller</p>
          <p className="text-white font-bold">{wo.workshop.name}</p>
          <p className="text-gray-400 text-sm">{wo.workshop.address}</p>
          {wo.workshop.phone && (
            <a href={`tel:${wo.workshop.phone}`}
              className="inline-block mt-2 text-brand text-sm hover:underline">
              📞 {wo.workshop.phone}
            </a>
          )}
        </div>

      </div>
    </div>
  )
}
