'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Mechanic {
  id:           string
  firstName:    string
  lastName:     string
  phone:        string | null
  active:       boolean
  createdAt:    string
}

export function MecanicosManager({ initial }: { initial: Mechanic[] }) {
  const router = useRouter()

  // ── Lista local ──────────────────────────────────────────────────────────
  const [mechanics, setMechanics] = useState(initial)
  const [busy,      setBusy]      = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)

  // ── Panel activo: null | 'create' | mechanic.id (editar) ─────────────────
  const [panel, setPanel] = useState<string | null>(null)

  // ── Formulario de creación ───────────────────────────────────────────────
  const [newFirst, setNewFirst] = useState('')
  const [newLast,  setNewLast]  = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPin,   setNewPin]   = useState('')

  // ── Formulario de edición ────────────────────────────────────────────────
  const [editFirst, setEditFirst] = useState('')
  const [editLast,  setEditLast]  = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editPin,   setEditPin]   = useState('')

  const flash = (msg: string, ok = true) => {
    if (ok) setSuccess(msg); else setError(msg)
    setTimeout(() => { setSuccess(null); setError(null) }, 3500)
  }

  // ── Abrir panel de edición ───────────────────────────────────────────────
  const openEdit = (m: Mechanic) => {
    setEditFirst(m.firstName)
    setEditLast(m.lastName)
    setEditPhone(m.phone ?? '')
    setEditPin('')
    setPanel(m.id)
  }

  // ── Crear mecánico ───────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      flash('El PIN debe tener exactamente 4 dígitos.', false)
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/admin/mechanics', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ firstName: newFirst, lastName: newLast, phone: newPhone || null, pin: newPin }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      flash('Mecánico creado ✓')
      setNewFirst(''); setNewLast(''); setNewPhone(''); setNewPin('')
      setPanel(null)
      router.refresh()
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Error', false)
    } finally {
      setBusy(false)
    }
  }

  // ── Editar mecánico ──────────────────────────────────────────────────────
  const handleEdit = async (id: string, e: React.FormEvent) => {
    e.preventDefault()
    if (editPin && (editPin.length !== 4 || !/^\d+$/.test(editPin))) {
      flash('El PIN debe tener 4 dígitos.', false)
      return
    }
    setBusy(true)
    try {
      const body: Record<string, unknown> = {
        firstName: editFirst,
        lastName:  editLast,
        phone:     editPhone || null,
      }
      if (editPin) body.pin = editPin
      const res = await fetch(`/api/admin/mechanics/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      flash('Datos actualizados ✓')
      setPanel(null)
      router.refresh()
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Error', false)
    } finally {
      setBusy(false)
    }
  }

  // ── Desactivar mecánico ──────────────────────────────────────────────────
  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`¿Desactivar a ${name}? No podrá iniciar sesión hasta que se reactive.`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/mechanics/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      flash(`${name} desactivado/a ✓`)
      setMechanics(prev => prev.map(m => m.id === id ? { ...m, active: false } : m))
      router.refresh()
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Error', false)
    } finally {
      setBusy(false)
    }
  }

  // ── Reactivar mecánico (asignando nuevo PIN) ─────────────────────────────
  const handleReactivate = async (id: string, e: React.FormEvent) => {
    e.preventDefault()
    if (editPin.length !== 4 || !/^\d+$/.test(editPin)) {
      flash('Asigná un PIN de 4 dígitos para reactivar.', false)
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/mechanics/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pin: editPin }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      flash('Mecánico reactivado ✓')
      setPanel(null)
      router.refresh()
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Error', false)
    } finally {
      setBusy(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Toast */}
      {(error || success) && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl transition-all
          ${error ? 'bg-red-800 text-red-100 border border-red-600' : 'bg-green-800 text-green-100 border border-green-600'}`}>
          {error ?? success}
        </div>
      )}

      {/* Header + botón nuevo */}
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">{mechanics.length} mecánico{mechanics.length !== 1 ? 's' : ''} registrado{mechanics.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setPanel(panel === 'create' ? null : 'create')}
          className="bg-brand text-black font-bold text-sm px-4 py-2 rounded-xl hover:bg-yellow-400 transition-colors"
        >
          {panel === 'create' ? 'Cancelar' : '+ Nuevo mecánico'}
        </button>
      </div>

      {/* ── Panel creación ─────────────────────────────────────────────────── */}
      {panel === 'create' && (
        <div className="bg-steel-800 border border-brand/30 rounded-xl p-6">
          <h2 className="text-brand text-xs font-bold uppercase tracking-wider mb-4">Nuevo mecánico</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Nombre *</label>
              <input
                value={newFirst}
                onChange={e => setNewFirst(e.target.value)}
                required
                placeholder="Carlos"
                className="w-full bg-steel-700 border border-steel-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Apellido *</label>
              <input
                value={newLast}
                onChange={e => setNewLast(e.target.value)}
                required
                placeholder="Rodríguez"
                className="w-full bg-steel-700 border border-steel-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Teléfono</label>
              <input
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                placeholder="11 1234-5678"
                className="w-full bg-steel-700 border border-steel-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">PIN (4 dígitos) *</label>
              <input
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                className="w-full bg-steel-700 border border-steel-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand tracking-[0.5em]"
              />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className="bg-brand text-black font-bold text-sm px-5 py-2 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
              >
                {busy ? 'Guardando…' : 'Crear mecánico'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Lista de mecánicos ─────────────────────────────────────────────── */}
      {mechanics.length === 0 ? (
        <div className="bg-steel-800 border border-steel-600 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">👷</p>
          <p className="text-gray-400">No hay mecánicos registrados todavía.</p>
          <p className="text-gray-600 text-sm mt-1">Usá el botón "Nuevo mecánico" para crear el primero.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mechanics.map(m => {
            const isEditing = panel === m.id

            return (
              <div key={m.id}
                className={`bg-steel-800 border rounded-xl overflow-hidden transition-colors ${
                  m.active ? 'border-steel-600' : 'border-steel-700 opacity-60'
                }`}>
                {/* Fila principal */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-base
                    ${m.active ? 'bg-brand/20 text-brand' : 'bg-steel-700 text-gray-500'}`}>
                    {m.firstName[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold">{m.firstName} {m.lastName}</p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        m.active
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {m.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    {m.phone && <p className="text-gray-500 text-xs mt-0.5">{m.phone}</p>}
                    <p className="text-gray-700 text-[10px] mt-0.5 font-mono">{m.id.slice(-12)}</p>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => isEditing ? setPanel(null) : openEdit(m)}
                      className="text-xs border border-steel-500 text-gray-400 hover:border-brand hover:text-brand px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {isEditing ? 'Cerrar' : 'Editar'}
                    </button>
                    {m.active && (
                      <button
                        onClick={() => handleDeactivate(m.id, `${m.firstName} ${m.lastName}`)}
                        disabled={busy}
                        className="text-xs border border-red-800 text-red-500 hover:bg-red-900/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Desactivar
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Panel edición inline ───────────────────────────────── */}
                {isEditing && (
                  <div className="border-t border-steel-700 px-5 py-5 bg-steel-900/40">
                    {m.active ? (
                      <form onSubmit={e => handleEdit(m.id, e)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-gray-500 text-xs mb-1 block">Nombre</label>
                          <input
                            value={editFirst}
                            onChange={e => setEditFirst(e.target.value)}
                            required
                            className="w-full bg-steel-700 border border-steel-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500 text-xs mb-1 block">Apellido</label>
                          <input
                            value={editLast}
                            onChange={e => setEditLast(e.target.value)}
                            required
                            className="w-full bg-steel-700 border border-steel-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500 text-xs mb-1 block">Teléfono</label>
                          <input
                            value={editPhone}
                            onChange={e => setEditPhone(e.target.value)}
                            placeholder="11 1234-5678"
                            className="w-full bg-steel-700 border border-steel-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500 text-xs mb-1 block">Nuevo PIN (dejar vacío para mantener)</label>
                          <input
                            value={editPin}
                            onChange={e => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="••••"
                            className="w-full bg-steel-700 border border-steel-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand tracking-[0.5em]"
                          />
                        </div>
                        <div className="sm:col-span-2 flex gap-3 justify-end">
                          <button type="button" onClick={() => setPanel(null)}
                            className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                            Cancelar
                          </button>
                          <button type="submit" disabled={busy}
                            className="bg-brand text-black font-bold text-sm px-5 py-2 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50">
                            {busy ? 'Guardando…' : 'Guardar cambios'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* Mecánico inactivo → solo reactivar con nuevo PIN */
                      <form onSubmit={e => handleReactivate(m.id, e)} className="flex flex-wrap items-end gap-4">
                        <div>
                          <label className="text-gray-500 text-xs mb-1 block">Nuevo PIN para reactivar</label>
                          <input
                            value={editPin}
                            onChange={e => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            required
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="••••"
                            className="bg-steel-700 border border-steel-500 text-white rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:border-brand tracking-[0.5em]"
                          />
                        </div>
                        <button type="submit" disabled={busy}
                          className="bg-green-600 text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50">
                          {busy ? 'Reactivando…' : 'Reactivar'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
