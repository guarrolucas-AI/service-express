/**
 * / — Landing del sistema interno Express Service
 */

import Link from 'next/link'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Obtener IDs reales de la DB para los links de demo
  const [completedWO, workshop] = await Promise.all([
    prisma.workOrder.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      select: { id: true, completedAt: true },
    }),
    prisma.workshop.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, score: true, npsAverage: true },
    }),
  ])

  const now = new Date()
  const monthStr = format(now, 'yyyy-MM')
  const dateLabel = format(now, "EEEE d 'de' MMMM", { locale: es })

  return (
    <div className="min-h-screen bg-steel-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-display font-bold text-5xl text-brand tracking-widest leading-none mb-2">
            EXPRESS<br />SERVICE
          </h1>
          <p className="text-gray-600 text-xs uppercase tracking-widest">Sistema de gestión · Alpha</p>
          <p className="text-gray-700 text-xs mt-1 capitalize">{dateLabel}</p>
        </div>

        {/* Score del taller */}
        {workshop && (
          <div className="bg-steel-800 border border-steel-600 rounded-xl p-4 mb-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full border-2 border-brand flex items-center justify-center shrink-0">
              <span className="font-display font-bold text-brand text-xl">{Math.round(workshop.score)}</span>
            </div>
            <div>
              <p className="text-white font-bold">{workshop.name}</p>
              <p className="text-gray-500 text-xs">Score Uber-style · NPS {workshop.npsAverage.toFixed(1)}/10</p>
            </div>
          </div>
        )}

        {/* Accesos por rol */}
        <div className="space-y-3 mb-8">
          <Link href="/mecanico"
            className="flex items-center gap-4 bg-steel-800 border border-steel-600 hover:border-brand rounded-xl p-5 text-left transition-all group">
            <span className="text-3xl">🔧</span>
            <div className="flex-1">
              <p className="text-white font-bold group-hover:text-brand transition-colors">Panel Mecánico</p>
              <p className="text-gray-500 text-sm">Órdenes activas · cronómetro · checklist</p>
            </div>
            <span className="text-gray-600 group-hover:text-brand transition-colors text-lg">→</span>
          </Link>

          <Link href="/admin"
            className="flex items-center gap-4 bg-steel-800 border border-steel-600 hover:border-brand rounded-xl p-5 text-left transition-all group">
            <span className="text-3xl">⚙️</span>
            <div className="flex-1">
              <p className="text-white font-bold group-hover:text-brand transition-colors">Backoffice Admin</p>
              <p className="text-gray-500 text-sm">Órdenes · finanzas · score del taller</p>
            </div>
            <span className="text-gray-600 group-hover:text-brand transition-colors text-lg">→</span>
          </Link>

          <Link href="/cliente"
            className="flex items-center gap-4 bg-steel-800 border border-steel-600 hover:border-brand rounded-xl p-5 text-left transition-all group">
            <span className="text-3xl">🌐</span>
            <div className="flex-1">
              <p className="text-white font-bold group-hover:text-brand transition-colors">Portal del Cliente</p>
              <p className="text-gray-500 text-sm">Rastreo de orden · Reserva de turnos</p>
            </div>
            <span className="text-gray-600 group-hover:text-brand transition-colors text-lg">→</span>
          </Link>
        </div>

        {/* PDFs de demo */}
        <div className="border-t border-steel-700 pt-6">
          <p className="text-gray-600 text-xs uppercase tracking-wider mb-3 text-center">PDFs generados con datos reales</p>
          <div className="grid grid-cols-2 gap-2">
            {completedWO && (
              <>
                <a href={`/api/pdf/work-order/${completedWO.id}`} target="_blank"
                  className="flex items-center gap-2 bg-brand/10 text-brand border border-brand/30 rounded-lg px-3 py-2.5 hover:bg-brand/20 transition-colors text-xs font-bold">
                  <span>📄</span> Informe técnico
                </a>
                <a href={`/api/pdf/checkin/${completedWO.id}`} target="_blank"
                  className="flex items-center gap-2 bg-steel-800 text-gray-300 border border-steel-600 rounded-lg px-3 py-2.5 hover:border-brand transition-colors text-xs">
                  <span>📄</span> Remito recepción
                </a>
                <a href={`/api/pdf/quote/${completedWO.id}`} target="_blank"
                  className="flex items-center gap-2 bg-steel-800 text-gray-300 border border-steel-600 rounded-lg px-3 py-2.5 hover:border-brand transition-colors text-xs">
                  <span>📄</span> Presupuesto
                </a>
              </>
            )}
            {workshop && (
              <a href={`/api/pdf/monthly/${workshop.id}/${monthStr}`} target="_blank"
                className="flex items-center gap-2 bg-steel-800 text-gray-300 border border-steel-600 rounded-lg px-3 py-2.5 hover:border-brand transition-colors text-xs">
                <span>📄</span> Reporte mensual
              </a>
            )}
          </div>
          {!completedWO && (
            <p className="text-gray-700 text-xs text-center mt-2">Ejecutá npm run db:seed para cargar datos demo</p>
          )}
        </div>

        <p className="text-gray-800 text-xs text-center mt-6">Express Service Alpha v2.0 · {now.getFullYear()}</p>
      </div>
    </div>
  )
}
