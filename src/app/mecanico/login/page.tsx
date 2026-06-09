'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Teclado numérico táctil ───────────────────────────────────────────────────

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

// ─── Formulario principal ──────────────────────────────────────────────────────

const PIN_LENGTH = 4

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const from         = searchParams.get('from') ?? '/mecanico'

  const [pin,     setPin]     = useState('')
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const append = (digit: string) => {
    if (pin.length < PIN_LENGTH) setPin(p => p + digit)
  }
  const backspace = () => setPin(p => p.slice(0, -1))
  const clear     = () => setPin('')

  const submit = async () => {
    if (pin.length < PIN_LENGTH) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mechanic/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pin }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error')
      }
      router.push(from)
      router.refresh()
    } catch (e: unknown) {
      setError('PIN incorrecto')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit cuando se ingresaron los 4 dígitos
  const handleDigit = (d: string) => {
    if (pin.length >= PIN_LENGTH - 1) {
      const full = pin + d
      setPin(full)
      // Pequeño delay para que el usuario vea el dígito antes de enviar
      setTimeout(async () => {
        setLoading(true)
        setError(null)
        try {
          const res = await fetch('/api/mechanic/auth', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ pin: full }),
          })
          if (!res.ok) throw new Error()
          router.push(from)
          router.refresh()
        } catch {
          setError('PIN incorrecto')
          setPin('')
        } finally {
          setLoading(false)
        }
      }, 120)
    } else {
      append(d)
    }
  }

  const KEYS = ['1','2','3','4','5','6','7','8','9']

  return (
    <div className="min-h-screen bg-steel-900 flex flex-col items-center justify-center p-6 font-body">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand mb-4">
          <span className="font-display font-black text-2xl text-black">ES</span>
        </div>
        <h1 className="font-display font-black text-3xl text-white tracking-tight">
          EXPRESS SERVICE
        </h1>
        <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest">Panel del Mecánico</p>
      </div>

      {/* Display del PIN */}
      <div className="flex gap-4 mb-8">
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <div
            key={i}
            className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${
              i < pin.length
                ? 'border-brand bg-brand/10'
                : 'border-steel-600 bg-steel-800'
            }`}
          >
            {i < pin.length && (
              <div className="w-4 h-4 rounded-full bg-brand" />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2">
          <p className="text-red-400 text-sm font-bold text-center">{error}</p>
        </div>
      )}

      {/* Teclado numérico */}
      <div className="w-full max-w-xs">
        <div className="grid grid-cols-3 gap-3 mb-3">
          {KEYS.map(d => (
            <NumKey key={d} label={d} onPress={() => !loading && handleDigit(d)} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={clear}
            className="h-16 bg-steel-800 hover:bg-steel-700 active:scale-95 text-gray-400 font-bold text-sm rounded-2xl transition-all select-none"
          >
            Limpiar
          </button>
          <NumKey label="0" onPress={() => !loading && handleDigit('0')} />
          <button
            type="button"
            onClick={backspace}
            className="h-16 bg-steel-800 hover:bg-steel-700 active:scale-95 text-gray-400 font-bold text-2xl rounded-2xl transition-all select-none"
          >
            ⌫
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-brand">
          <span className="animate-spin text-xl">⏳</span>
          <span className="text-sm font-bold">Verificando...</span>
        </div>
      )}

      <p className="text-gray-700 text-xs mt-10">
        Ingresá tu PIN de {PIN_LENGTH} dígitos
      </p>
    </div>
  )
}

export default function MecanicoLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
