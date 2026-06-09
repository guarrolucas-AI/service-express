/**
 * /admin/config — Configuración del taller
 */

import { prisma } from '@/lib/db'
import Link from 'next/link'
import { WorkshopConfigForm } from './WorkshopConfigForm'

export const dynamic = 'force-dynamic'

export default async function AdminConfigPage() {
  const workshop = await prisma.workshop.findFirst({
    where: { isActive: true },
    select: {
      id:            true,
      name:          true,
      address:       true,
      city:          true,
      province:      true,
      phone:         true,
      email:         true,
      cuit:          true,
      score:         true,
      npsAverage:    true,
      totalServices: true,
      status:        true,
    },
  })

  if (!workshop) {
    return (
      <div className="min-h-screen bg-steel-900 text-gray-100 font-body flex items-center justify-center">
        <p className="text-gray-500">No se encontró un taller activo.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-steel-900 text-gray-100 font-body">
      <header className="bg-steel-800 border-b border-steel-600 px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Backoffice
        </Link>
        <div className="flex-1">
          <p className="text-gray-500 text-[10px] uppercase tracking-widest">Ajustes</p>
          <h1 className="font-display text-2xl font-bold text-brand leading-none">CONFIGURACIÓN</h1>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-bold ${
          workshop.status === 'ACTIVE'
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
        }`}>
          {workshop.status}
        </span>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        <WorkshopConfigForm initial={workshop} />
      </main>
    </div>
  )
}
