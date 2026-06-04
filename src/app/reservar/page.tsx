'use client'

/**
 * /reservar — Formulario de reserva de turno
 * Crea User + Vehicle + Appointment + WorkOrder desde el portal del cliente
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const SERVICES = [
  { id: 'oil',         label: 'Cambio de aceite y filtro',   price: '$15.000',  mins: '45 min' },
  { id: 'brakes',      label: 'Revisión y cambio de frenos', price: 'desde $35.000', mins: '90 min' },
  { id: 'service_a',   label: 'Service tipo A  (30.000 km)', price: '$45.000',  mins: '2 hs'   },
  { id: 'service_b',   label: 'Service tipo B  (60.000 km)', price: '$80.000',  mins: '3 hs'   },
  { id: 'alignment',   label: 'Alineación y balanceo',        price: '$12.000',  mins: '1 hs'   },
  { id: 'diagnostics', label: 'Diagnóstico electrónico',      price: '$10.000',  mins: '1 hs'   },
  { id: 'suspension',  label: 'Revisión de suspensión',       price: 'desde $25.000', mins: '90 min' },
  { id: 'timing',      label: 'Correa de distribución',       price: 'desde $65.000', mins: '4 hs'   },
  { id: 'general',     label: 'Revisión general',             price: '$8.000',   mins: '1 hs'   },
]

interface FormData {
  firstName:    string
  lastName:     string
  phone:        string
  email:        string
  vehicleBrand: string
  vehicleModel: string
  vehicleYear:  string
  vehiclePlate: string
  vehicleKm:    string
  services:     string[]
  notes:        string
  scheduledAt:  string
}

export default function ReservarPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormData>({
    firstName: '', lastName: '', phone: '', email: '',
    vehicleBrand: '', vehicleModel: '', vehicleYear: '',
    vehiclePlate: '', vehicleKm: '',
    services: [], notes: '', scheduledAt: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function set(key: keyof FormData, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function toggleService(id: string) {
    setForm(f => ({
      ...f,
      services: f.services.includes(id)
        ? f.services.filter(s => s !== id)
        : [...f.services, id],
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (form.services.length === 0) {
      setError('Seleccioná al menos un servicio')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/reservar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          vehicleYear: parseInt(form.vehicleYear) || 2020,
          vehicleKm:   parseInt(form.vehicleKm)   || 0,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Error al crear el turno')
      router.push(`/cliente/orden/${data.data.workOrderId}?nueva=1`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado')
    } finally {
      setLoading(false)
    }
  }

  // Mínimo: mañana
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(8, 0, 0, 0)
  const minDate = tomorrow.toISOString().slice(0, 16)

  return (
    <div className="min-h-screen bg-steel-900 pb-10">

      {/* Header fijo */}
      <div className="bg-steel-800 border-b border-steel-600 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/cliente" className="text-gray-500 hover:text-brand transition-colors text-xl leading-none">←</Link>
          <div>
            <h1 className="text-white font-display font-bold text-xl leading-none">Reservar turno</h1>
            <p className="text-gray-500 text-xs">Express Service · Completá el formulario</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5">
        <form onSubmit={submit} className="space-y-5">

          {/* ── Datos personales ── */}
          <section className="bg-steel-800 border border-steel-600 rounded-2xl p-5">
            <p className="text-brand text-xs font-bold uppercase tracking-wider mb-4">Tus datos</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Nombre *</label>
                <input
                  value={form.firstName}
                  onChange={e => set('firstName', e.target.value)}
                  placeholder="Juan"
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Apellido *</label>
                <input
                  value={form.lastName}
                  onChange={e => set('lastName', e.target.value)}
                  placeholder="García"
                  required
                  className="input-field"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-gray-400 text-xs mb-1.5 block">Teléfono WhatsApp *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="1144556677"
                required
                className="input-field"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="juan@gmail.com"
                required
                className="input-field"
              />
            </div>
          </section>

          {/* ── Vehículo ── */}
          <section className="bg-steel-800 border border-steel-600 rounded-2xl p-5">
            <p className="text-brand text-xs font-bold uppercase tracking-wider mb-4">Tu vehículo</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Marca *</label>
                <input
                  value={form.vehicleBrand}
                  onChange={e => set('vehicleBrand', e.target.value)}
                  placeholder="Volkswagen"
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Modelo *</label>
                <input
                  value={form.vehicleModel}
                  onChange={e => set('vehicleModel', e.target.value)}
                  placeholder="Gol Trend"
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Año *</label>
                <input
                  type="number"
                  value={form.vehicleYear}
                  onChange={e => set('vehicleYear', e.target.value)}
                  placeholder="2019"
                  min="1980"
                  max={new Date().getFullYear() + 1}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Kilometraje</label>
                <input
                  type="number"
                  value={form.vehicleKm}
                  onChange={e => set('vehicleKm', e.target.value)}
                  placeholder="85000"
                  min="0"
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Patente *</label>
              <input
                value={form.vehiclePlate}
                onChange={e => set('vehiclePlate', e.target.value.toUpperCase().replace(/\s/g, ''))}
                placeholder="AB123CD"
                required
                className="input-field font-display tracking-widest text-lg"
              />
            </div>
          </section>

          {/* ── Servicios ── */}
          <section className="bg-steel-800 border border-steel-600 rounded-2xl p-5">
            <p className="text-brand text-xs font-bold uppercase tracking-wider mb-1">Servicios requeridos *</p>
            <p className="text-gray-600 text-xs mb-4">Podés seleccionar más de uno</p>
            <div className="space-y-2">
              {SERVICES.map(svc => {
                const selected = form.services.includes(svc.id)
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => toggleService(svc.id)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      selected
                        ? 'border-brand bg-brand/10'
                        : 'border-steel-600 hover:border-steel-400 bg-steel-700/30'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      selected ? 'border-brand bg-brand' : 'border-steel-500'
                    }`}>
                      {selected && <span className="text-black text-xs font-bold leading-none">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-tight ${selected ? 'text-white' : 'text-gray-300'}`}>
                        {svc.label}
                      </p>
                      <p className="text-gray-600 text-xs">{svc.mins}</p>
                    </div>
                    <span className={`text-xs shrink-0 ${selected ? 'text-brand' : 'text-gray-500'}`}>
                      {svc.price}
                    </span>
                  </button>
                )
              })}
            </div>

            {form.services.length > 0 && (
              <p className="text-gray-500 text-xs mt-3 text-center">
                {form.services.length} servicio{form.services.length > 1 ? 's' : ''} seleccionado{form.services.length > 1 ? 's' : ''}
              </p>
            )}
          </section>

          {/* ── Fecha y notas ── */}
          <section className="bg-steel-800 border border-steel-600 rounded-2xl p-5">
            <p className="text-brand text-xs font-bold uppercase tracking-wider mb-4">Fecha preferida *</p>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={e => set('scheduledAt', e.target.value)}
              min={minDate}
              required
              className="input-field"
            />
            <p className="text-gray-600 text-xs mt-1">
              Mínimo 24 hs de anticipación. Te confirmaremos disponibilidad.
            </p>
            <div className="mt-4">
              <label className="text-gray-400 text-xs mb-1.5 block">Observaciones (opcional)</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={3}
                placeholder="Síntomas, ruidos, luces del tablero, o cualquier detalle que nos ayude..."
                className="input-field resize-none"
                maxLength={500}
              />
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-black font-bold py-4 rounded-2xl text-lg hover:bg-brand/90 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Reservando...' : 'Confirmar turno →'}
          </button>

          <p className="text-gray-700 text-xs text-center pb-4">
            Los precios son estimados. El presupuesto final se confirma con el mecánico antes de comenzar.
          </p>
        </form>
      </div>
    </div>
  )
}
