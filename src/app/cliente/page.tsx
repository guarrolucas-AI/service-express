'use client'

/**
 * /cliente — Portal del cliente
 * Rastrear orden por teléfono · Reservar turno nuevo
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ClientePortalPage() {
  const [phone, setPhone] = useState('')
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const p = phone.trim().replace(/\D/g, '')
    if (p) router.push(`/cliente/mis-ordenes?phone=${p}`)
  }

  return (
    <div className="min-h-screen bg-steel-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-5xl text-brand tracking-widest leading-none mb-2">
            EXPRESS<br />SERVICE
          </h1>
          <p className="text-gray-500 text-sm">Portal del cliente</p>
        </div>

        {/* Rastrear orden */}
        <div className="bg-steel-800 border border-steel-600 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🔍</span>
            <div>
              <h2 className="text-white font-bold text-lg leading-none">Rastrear mi orden</h2>
              <p className="text-gray-500 text-sm mt-0.5">Ver el estado de tu vehículo en tiempo real</p>
            </div>
          </div>
          <form onSubmit={handleSearch} className="space-y-3">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Tu número de teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ej: 1144556677"
                className="input-field"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-brand text-black font-bold py-3 rounded-xl hover:bg-brand/90 transition-colors"
            >
              Ver mis órdenes →
            </button>
          </form>
        </div>

        {/* Reservar turno */}
        <Link
          href="/reservar"
          className="flex items-center gap-4 bg-steel-800 border border-steel-600 hover:border-brand rounded-2xl p-6 transition-all group"
        >
          <span className="text-4xl">📅</span>
          <div className="flex-1">
            <p className="text-white font-bold text-lg group-hover:text-brand transition-colors">
              Reservar turno nuevo
            </p>
            <p className="text-gray-500 text-sm">Agendá un servicio para tu vehículo</p>
          </div>
          <span className="text-gray-600 group-hover:text-brand transition-colors text-xl">→</span>
        </Link>

        <p className="text-center text-gray-700 text-xs pt-2">
          <Link href="/" className="hover:text-gray-500 transition-colors">← Volver al sistema</Link>
        </p>
      </div>
    </div>
  )
}
