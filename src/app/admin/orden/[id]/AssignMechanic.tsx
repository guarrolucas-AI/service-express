'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Mechanic {
  id:        string
  firstName: string
  lastName:  string
}

export function AssignMechanic({
  workOrderId,
  mechanics,
  currentMechanicId,
}: {
  workOrderId:       string
  mechanics:         Mechanic[]
  currentMechanicId: string | null
}) {
  const router              = useRouter()
  const [busy,  setBusy]    = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const current             = mechanics.find(m => m.id === currentMechanicId)

  const assign = async (mechanicId: string | null) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/orders/${workOrderId}/assign`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mechanicId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  if (mechanics.length === 0) {
    return (
      <div className="bg-steel-800 border border-steel-600 rounded-xl p-5">
        <p className="text-brand text-xs font-bold uppercase tracking-wider mb-2">Mecánico asignado</p>
        <p className="text-gray-500 text-sm">No hay mecánicos registrados.</p>
        <a href="/admin/mecanicos" className="text-brand text-xs mt-1 inline-block hover:underline">
          + Crear mecánico →
        </a>
      </div>
    )
  }

  return (
    <div className="bg-steel-800 border border-steel-600 rounded-xl p-5">
      <p className="text-brand text-xs font-bold uppercase tracking-wider mb-3">Mecánico asignado</p>

      {current ? (
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
            <span className="text-brand font-bold text-sm">{current.firstName[0]}</span>
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">{current.firstName} {current.lastName}</p>
            <p className="text-gray-500 text-xs">Asignado</p>
          </div>
          <button
            onClick={() => assign(null)}
            disabled={busy}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            Quitar
          </button>
        </div>
      ) : (
        <p className="text-gray-500 text-sm mb-4">Sin asignar</p>
      )}

      <div className="flex flex-wrap gap-2">
        {mechanics
          .filter(m => m.id !== currentMechanicId)
          .map(m => (
            <button
              key={m.id}
              onClick={() => assign(m.id)}
              disabled={busy}
              className="bg-steel-700 hover:bg-steel-600 text-gray-300 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <span className="w-5 h-5 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-[10px]">
                {m.firstName[0]}
              </span>
              {m.firstName} {m.lastName}
            </button>
          ))}
      </div>

      {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
    </div>
  )
}
