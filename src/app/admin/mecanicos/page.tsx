/**
 * /admin/mecanicos — Gestión de mecánicos del taller
 */

import { prisma } from '@/lib/db'
import Link from 'next/link'
import { MecanicosManager } from './MecanicosManager'

export const dynamic = 'force-dynamic'

export default async function AdminMecanicosPage() {
  const mechanics = await prisma.user.findMany({
    where:   { role: 'MECHANIC' },
    select:  {
      id:           true,
      firstName:    true,
      lastName:     true,
      phone:        true,
      passwordHash: true,
      createdAt:    true,
    },
    orderBy: { firstName: 'asc' },
  })

  const data = mechanics.map(m => ({
    id:        m.id,
    firstName: m.firstName,
    lastName:  m.lastName,
    phone:     m.phone,
    active:    !!m.passwordHash,
    createdAt: m.createdAt.toISOString(),
  }))

  return (
    <div className="min-h-screen bg-steel-900 text-gray-100 font-body">
      {/* Header */}
      <header className="bg-steel-800 border-b border-steel-600 px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Backoffice
        </Link>
        <div className="flex-1">
          <p className="text-gray-500 text-[10px] uppercase tracking-widest">Gestión</p>
          <h1 className="font-display text-2xl font-bold text-brand leading-none">MECÁNICOS</h1>
        </div>
        <div className="text-gray-600 text-xs">
          <span className="text-green-400 font-bold">{data.filter(m => m.active).length}</span> activos ·{' '}
          <span className="text-red-400 font-bold">{data.filter(m => !m.active).length}</span> inactivos
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        {/* Info card */}
        <div className="bg-steel-800/50 border border-steel-700 rounded-xl px-5 py-4 mb-6 text-sm text-gray-400 space-y-1">
          <p>👷 <strong className="text-gray-300">Mecánicos</strong> usan un <strong className="text-brand">PIN de 4 dígitos</strong> para iniciar sesión en <code className="bg-steel-700 px-1 rounded text-xs">/mecanico</code>.</p>
          <p>🔒 Desactivar un mecánico le impide iniciar sesión. Podés reactivarlo asignando un nuevo PIN.</p>
          <p>📋 Las órdenes asignadas a un mecánico inactivo quedan visibles en el admin pero no aparecen en su panel.</p>
        </div>

        <MecanicosManager initial={data} />
      </main>
    </div>
  )
}
