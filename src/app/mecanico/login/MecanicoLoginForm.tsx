'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Mechanic { id: string; name: string }

const PIN_LENGTH = 4

function NumKey({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="h-16 bg-steel-700 hover:bg-steel-600 active:bg-steel-500 active:scale-95 text-white font-display font-bold text-2xl rounded-2xl transition-all select-none"
    >
      {label}
    </button>
  )
}

export function MecanicoLoginForm({ mechanics }: { mechanics: Mechanic[] }) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const from         = searchParams.get('from') ?? '/mecanico'

  const [selected, setSelected] = useState<Mechanic | null>(
    mechanics.length === 1 ? mechanics[0] : null,
  )
  const [pin,     setPin]     = useState('')
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // ── seleccionar mecánico ────────────────────────────────────────────────
  if (!selected) {
    return (
      <div className="min-h-screen bg-steel-900 flex flex-col items-center justify-center p-6 font-body">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand mb-4">
            <span className="font-display font-black text-2xl text-black">ES</span>
          </div>
          <h1 className="font-display font-black text-3xl text-white tracking-tight">EXPRESS SERVICE</h1>
          <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest">Panel del Mecánico</p>
        </div>

        {mechanics.length === 0 ? (
          <div className="text-center">
            <p className="text-gray-400 text-sm">No hay mecánicos configurados.</p>
            <p className="text-gray-600 text-xs mt-2">Pedile al admin que cree tu usuario.</p>
          </div>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-6">¿Quién sos?</p>
            <div className="w-full max-w-xs space-y-3">
              {mechanics.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className="w-full bg-steel-800 border border-steel-600 hover:border-brand active:scale-95 rounded-2xl px-5 py-4 text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                      <span className="text-brand font-display font-bold text-sm">
                        {m.name.charAt(0)}
                      </span>
                    </div>
                    <span className="text-white font-bold group-hover:text-brand transition-colors">
                      {m.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Fallback sin mecánicos en DB */}
        {mechanics.length === 0 && (
          <button
            className="mt-6 text-gray-600 text-xs underline"
            onClick={() => setSelected({ id: '', name: 'Demo' })}
          >
            Usar PIN de entorno (fallback)
          </button>
        )}
      </div>
    )
  }

  // ── PIN numérico ────────────────────────────────────────────────────────

  const doLogin = async (fullPin: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mechanic/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mechanicId: selected.id || undefined, pin: fullPin }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      router.push(from)
      router.refresh()
    } catch (e: unknown) {
      setError('PIN incorrecto')
      setPin('')
      setLoading(false)
    }
  }

  const handleDigit = (d: string) => {
    if (loading) return
    const next = pin + d
    setPin(next)
    if (next.length >= PIN_LENGTH) {
      setTimeout(() => doLogin(next), 120)
    }
  }

  return (
    <div className="min-h-screen bg-steel-900 flex flex-col items-center justify-center p-6 font-body">
      {/* Header con mechanic seleccionado */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-full bg-brand/20 border-2 border-brand flex items-center justify-center mx-auto mb-3">
          <span className="text-brand font-display font-black text-2xl">
            {selected.name.charAt(0)}
          </span>
        </div>
        <p className="text-white font-bold text-xl">{selected.name}</p>
        <button
          onClick={() => { setSelected(null); setPin(''); setError(null) }}
          className="text-gray-600 text-xs mt-1 hover:text-gray-400 transition-colors"
        >
          ← cambiar
        </button>
      </div>

      {/* Display PIN */}
      <div className="flex gap-4 mb-8">
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <div key={i} className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${
            i < pin.length ? 'border-brand bg-brand/10' : 'border-steel-600 bg-steel-800'
          }`}>
            {i < pin.length && <div className="w-4 h-4 rounded-full bg-brand" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2">
          <p className="text-red-400 text-sm font-bold text-center">{error}</p>
        </div>
      )}

      {/* Teclado */}
      <div className="w-full max-w-xs">
        <div className="grid grid-cols-3 gap-3 mb-3">
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <NumKey key={d} label={d} onPress={() => handleDigit(d)} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => { setPin(''); setError(null) }}
            className="h-16 bg-steel-800 hover:bg-steel-700 active:scale-95 text-gray-400 font-bold text-sm rounded-2xl transition-all select-none"
          >
            Limpiar
          </button>
          <NumKey label="0" onPress={() => handleDigit('0')} />
          <button
            type="button"
            onClick={() => setPin(p => p.slice(0, -1))}
            className="h-16 bg-steel-800 hover:bg-steel-700 active:scale-95 text-gray-400 font-bold text-2xl rounded-2xl transition-all select-none"
          >
            ⌫
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-brand">
          <span className="animate-spin">⏳</span>
          <span className="text-sm font-bold">Verificando...</span>
        </div>
      )}
    </div>
  )
}
