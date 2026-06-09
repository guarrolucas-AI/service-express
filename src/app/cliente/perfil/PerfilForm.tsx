'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  phone:     string
  firstName: string
  lastName:  string
  email:     string
}

export function PerfilForm({ phone, firstName, lastName, email }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({ firstName, lastName, email })
  const [busy,    setBusy]    = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/cliente/perfil', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone, ...form }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSuccess(true)
      setTimeout(() => router.push(`/cliente/mis-ordenes?phone=${phone}`), 1200)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Teléfono — solo lectura */}
      <div>
        <label className="text-gray-500 text-xs mb-1 block">Teléfono (no editable)</label>
        <div className="bg-steel-700/50 border border-steel-600 text-gray-500 rounded-xl px-4 py-3 text-sm">
          {phone}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Nombre *</label>
          <input
            value={form.firstName}
            onChange={set('firstName')}
            required
            className="w-full bg-steel-800 border border-steel-600 focus:border-brand text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Apellido *</label>
          <input
            value={form.lastName}
            onChange={set('lastName')}
            required
            className="w-full bg-steel-800 border border-steel-600 focus:border-brand text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="text-gray-400 text-xs mb-1 block">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="tu@email.com"
          className="w-full bg-steel-800 border border-steel-600 focus:border-brand text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder:text-gray-600"
        />
      </div>

      {error   && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-green-400 text-sm">✓ Guardado. Volviendo…</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-brand text-black font-bold py-3 rounded-xl hover:bg-brand/90 transition-colors disabled:opacity-50 text-sm mt-2"
      >
        {busy ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  )
}
