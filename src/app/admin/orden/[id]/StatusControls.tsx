'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TRANSITIONS: Record<string, { label: string; next: string; color: string }[]> = {
  PENDING_PART: [
    { next: 'READY_FOR_APPOINTMENT', label: '✅ Confirmar pago / repuestos listos', color: 'bg-green-600 hover:bg-green-500' },
    { next: 'CANCELLED',             label: '✗ Cancelar orden',                    color: 'bg-red-600/80 hover:bg-red-600' },
  ],
  READY_FOR_APPOINTMENT: [
    { next: 'CANCELLED', label: '✗ Cancelar orden', color: 'bg-red-600/80 hover:bg-red-600' },
  ],
  VEHICLE_RECEIVED: [
    { next: 'IN_PROGRESS', label: '▶ Marcar en progreso', color: 'bg-blue-600 hover:bg-blue-500' },
    { next: 'CANCELLED',   label: '✗ Cancelar orden',    color: 'bg-red-600/80 hover:bg-red-600' },
  ],
  IN_PROGRESS: [
    { next: 'QUALITY_CONTROL', label: '🔍 Mover a control de calidad', color: 'bg-purple-600 hover:bg-purple-500' },
    { next: 'CANCELLED',       label: '✗ Cancelar orden',              color: 'bg-red-600/80 hover:bg-red-600' },
  ],
  QUALITY_CONTROL: [
    { next: 'COMPLETED', label: '🎉 Marcar como completada', color: 'bg-green-600 hover:bg-green-500' },
    { next: 'CANCELLED', label: '✗ Cancelar orden',          color: 'bg-red-600/80 hover:bg-red-600' },
  ],
  PENDING_QUOTE: [
    { next: 'CANCELLED', label: '✗ Cancelar orden', color: 'bg-red-600/80 hover:bg-red-600' },
  ],
}

export function StatusControls({
  workOrderId,
  currentStatus,
}: {
  workOrderId:   string
  currentStatus: string
}) {
  const router   = useRouter()
  const options  = TRANSITIONS[currentStatus] ?? []
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  if (options.length === 0) return null

  const advance = async (nextStatus: string) => {
    if (!confirm(`¿Cambiar estado a "${nextStatus}"?`)) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/orders/${workOrderId}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-steel-800 border border-steel-600 rounded-xl p-5">
      <p className="text-brand text-xs font-bold uppercase tracking-wider mb-4">
        Avanzar estado manualmente
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.next}
            onClick={() => advance(opt.next)}
            disabled={busy}
            className={`text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${opt.color}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </div>
  )
}
