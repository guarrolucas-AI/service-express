'use client'

import { useState, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const from         = searchParams.get('from') ?? '/admin'

  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error')
      }
      router.push(from)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al ingresar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-steel-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-display font-black text-4xl text-brand tracking-tight">
            EXPRESS SERVICE
          </h1>
          <p className="text-gray-500 text-sm mt-1 tracking-widest uppercase">Panel de administración</p>
        </div>

        <form onSubmit={submit} className="bg-steel-800 border border-steel-600 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              required
              className="w-full bg-steel-700 border border-steel-500 text-white text-lg rounded-xl px-4 py-3 focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-brand text-black font-display font-bold text-lg py-3.5 rounded-xl disabled:opacity-50 active:scale-95 transition-all"
          >
            {loading ? 'Ingresando...' : 'INGRESAR'}
          </button>
        </form>

        <p className="text-center text-gray-700 text-xs mt-6">
          Express Service © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
