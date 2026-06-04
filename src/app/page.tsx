/**
 * / — Landing del sistema interno Express Service
 * Redirige al rol correcto (mecánico / admin / cliente)
 */

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-steel-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <h1 className="font-display font-bold text-5xl text-brand tracking-widest mb-2">
          EXPRESS<br />SERVICE
        </h1>
        <p className="text-gray-500 text-sm mb-10 uppercase tracking-widest">Sistema de gestión</p>

        {/* Opciones */}
        <div className="space-y-3">
          <Link href="/mecanico"
            className="flex items-center gap-4 bg-steel-800 border border-steel-600 hover:border-brand rounded-xl p-5 text-left transition-all group">
            <span className="text-3xl">🔧</span>
            <div>
              <p className="text-white font-bold group-hover:text-brand transition-colors">Panel Mecánico</p>
              <p className="text-gray-500 text-sm">Órdenes activas, cronómetro y checklist</p>
            </div>
            <span className="ml-auto text-gray-600 group-hover:text-brand transition-colors">→</span>
          </Link>

          <Link href="/admin"
            className="flex items-center gap-4 bg-steel-800 border border-steel-600 hover:border-brand rounded-xl p-5 text-left transition-all group">
            <span className="text-3xl">⚙️</span>
            <div>
              <p className="text-white font-bold group-hover:text-brand transition-colors">Backoffice Admin</p>
              <p className="text-gray-500 text-sm">Órdenes, finanzas, score del taller</p>
            </div>
            <span className="ml-auto text-gray-600 group-hover:text-brand transition-colors">→</span>
          </Link>

          <a href="/" target="_blank"
            className="flex items-center gap-4 bg-steel-800 border border-steel-600 hover:border-brand rounded-xl p-5 text-left transition-all group">
            <span className="text-3xl">🌐</span>
            <div>
              <p className="text-white font-bold group-hover:text-brand transition-colors">Portal del Cliente</p>
              <p className="text-gray-500 text-sm">Reserva de turnos (index.html)</p>
            </div>
            <span className="ml-auto text-gray-600 group-hover:text-brand transition-colors">→</span>
          </a>
        </div>

        {/* PDFs de demo */}
        <div className="mt-8 pt-6 border-t border-steel-700">
          <p className="text-gray-600 text-xs uppercase tracking-wider mb-3">PDFs de ejemplo (con datos seed)</p>
          <div className="flex flex-wrap justify-center gap-2">
            <a href="/api/pdf/work-order/demo" target="_blank"
              className="text-xs bg-brand/10 text-brand border border-brand/30 rounded-lg px-3 py-2 hover:bg-brand/20 transition-colors">
              📄 Informe técnico
            </a>
            <a href="/api/pdf/checkin/demo" target="_blank"
              className="text-xs bg-steel-700 text-gray-300 border border-steel-600 rounded-lg px-3 py-2 hover:border-brand transition-colors">
              📄 Remito recepción
            </a>
            <a href="/api/pdf/monthly/demo/2026-06" target="_blank"
              className="text-xs bg-steel-700 text-gray-300 border border-steel-600 rounded-lg px-3 py-2 hover:border-brand transition-colors">
              📄 Reporte mensual
            </a>
          </div>
        </div>

        <p className="text-gray-700 text-xs mt-8">
          Express Service Alpha v2.0 · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
