'use client'

import { useState } from 'react'

interface Workshop {
  id:       string
  name:     string
  address:  string
  city:     string
  province: string
  phone:    string
  email:    string
  cuit:     string | null
  score:    number
  npsAverage: number
  totalServices: number
  status:   string
}

export function WorkshopConfigForm({ initial }: { initial: Workshop }) {
  const [form, setForm] = useState({
    name:     initial.name,
    address:  initial.address,
    city:     initial.city,
    province: initial.province,
    phone:    initial.phone,
    email:    initial.email,
    cuit:     initial.cuit ?? '',
  })
  const [busy,    setBusy]    = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/admin/config', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-green-800 border border-green-600 text-green-100 px-4 py-3 rounded-xl text-sm font-medium shadow-xl">
          ✓ Cambios guardados
        </div>
      )}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-800 border border-red-600 text-red-100 px-4 py-3 rounded-xl text-sm font-medium shadow-xl">
          {error}
        </div>
      )}

      {/* Score cards — solo lectura */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Score del taller',  value: `${Math.round(initial.score)}/100`,     color: 'text-brand' },
          { label: 'NPS promedio',       value: initial.npsAverage.toFixed(1),          color: initial.npsAverage >= 8 ? 'text-green-400' : 'text-yellow-400' },
          { label: 'Servicios totales',  value: initial.totalServices,                  color: 'text-white' },
        ].map(k => (
          <div key={k.label} className="bg-steel-800 border border-steel-600 rounded-xl p-4">
            <p className="text-gray-600 text-xs uppercase tracking-wide mb-1">{k.label}</p>
            <p className={`font-display font-bold text-2xl ${k.color}`}>{k.value}</p>
            <p className="text-gray-700 text-xs mt-0.5">Solo lectura — calculado automáticamente</p>
          </div>
        ))}
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-steel-800 border border-steel-600 rounded-xl p-6 space-y-5">
        <h2 className="text-brand text-xs font-bold uppercase tracking-wider">Datos del taller</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nombre */}
          <div className="sm:col-span-2">
            <label className="text-gray-400 text-xs mb-1 block">Nombre del taller *</label>
            <input
              value={form.name}
              onChange={set('name')}
              required
              className="w-full bg-steel-700 border border-steel-500 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand"
            />
          </div>

          {/* Dirección */}
          <div className="sm:col-span-2">
            <label className="text-gray-400 text-xs mb-1 block">Dirección *</label>
            <input
              value={form.address}
              onChange={set('address')}
              required
              placeholder="Ej: Av. Corrientes 1234"
              className="w-full bg-steel-700 border border-steel-500 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand"
            />
          </div>

          {/* Ciudad */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Ciudad *</label>
            <input
              value={form.city}
              onChange={set('city')}
              required
              placeholder="Ej: Buenos Aires"
              className="w-full bg-steel-700 border border-steel-500 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand"
            />
          </div>

          {/* Provincia */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Provincia *</label>
            <input
              value={form.province}
              onChange={set('province')}
              required
              placeholder="Ej: Buenos Aires"
              className="w-full bg-steel-700 border border-steel-500 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Teléfono *</label>
            <input
              value={form.phone}
              onChange={set('phone')}
              required
              placeholder="Ej: 11 4455-6677"
              className="w-full bg-steel-700 border border-steel-500 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              required
              placeholder="taller@ejemplo.com"
              className="w-full bg-steel-700 border border-steel-500 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand"
            />
          </div>

          {/* CUIT */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">CUIT</label>
            <input
              value={form.cuit}
              onChange={set('cuit')}
              placeholder="Ej: 20-12345678-9"
              className="w-full bg-steel-700 border border-steel-500 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={busy}
            className="bg-brand text-black font-bold px-6 py-2.5 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50 text-sm"
          >
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
