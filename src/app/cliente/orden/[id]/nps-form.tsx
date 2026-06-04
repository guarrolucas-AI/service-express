'use client'

import { useState } from 'react'

export function NpsForm({ workOrderId }: { workOrderId: string }) {
  const [score, setScore]     = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (score === null) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/work-order/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workOrderId, score, comment }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Error al enviar')
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
        <p className="text-4xl mb-3">🎉</p>
        <p className="text-green-400 font-bold text-lg">¡Gracias por tu valoración!</p>
        <p className="text-gray-400 text-sm mt-1">Tu opinión nos ayuda a seguir mejorando.</p>
      </div>
    )
  }

  const emoji = score === null ? '' : score >= 9 ? '😄' : score >= 7 ? '🙂' : '😞'

  return (
    <form onSubmit={submit} className="bg-steel-800 border border-steel-600 rounded-2xl p-6">
      <p className="text-brand text-xs font-bold uppercase tracking-wider mb-1">Calificá tu experiencia</p>
      <p className="text-gray-400 text-sm mb-5">
        Del 0 al 10, ¿qué tan probable es que recomiendes Express Service a un amigo?
      </p>

      {/* Score selector */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setScore(i)}
            className={`w-9 h-9 rounded-lg font-display font-bold text-sm transition-all ${
              score === i
                ? 'bg-brand text-black scale-110'
                : i <= 6
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : i <= 8
                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
          >
            {i}
          </button>
        ))}
      </div>

      {score !== null && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <span className="text-white font-bold">
            {score >= 9 ? 'Excelente — Promotor' : score >= 7 ? 'Bueno — Pasivo' : 'Mejorable — Detractor'}
          </span>
        </div>
      )}

      <div className="mb-4">
        <label className="text-gray-400 text-xs mb-1.5 block">Comentario opcional</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          placeholder="Contanos qué te pareció el servicio..."
          className="input-field resize-none"
          maxLength={500}
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm mb-3">{error}</p>
      )}

      <button
        type="submit"
        disabled={score === null || loading}
        className="w-full bg-brand text-black font-bold py-3 rounded-xl hover:bg-brand/90 transition-colors disabled:opacity-40"
      >
        {loading ? 'Enviando...' : 'Enviar valoración'}
      </button>
    </form>
  )
}
