'use client'

import { useState, useEffect } from 'react'

// Clave pública VAPID — tiene que coincidir con la del servidor
const VAPID_PUBLIC = 'BNGtERobVCya73TR_hBddo5WdeynJfcxnWm3jPelJVSVJpiGZb2Omc7VUoTvSuzwY2Ku90INR3uP8Z3kkLqE_po'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer as ArrayBuffer
}

type State = 'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported'

export function PushSubscribeButton({ phone }: { phone: string }) {
  const [state, setState] = useState<State>('idle')

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setState('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setState('denied')
      return
    }
    // Verificar si ya hay suscripción activa
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => {
        if (sub) setState('subscribed')
      })
    ).catch(() => {})
  }, [])

  const subscribe = async () => {
    if (!phone) return
    setState('loading')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setState('denied'); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      })

      const res = await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone, subscription: sub.toJSON() }),
      })
      if (!res.ok) throw new Error('Error al guardar suscripción')

      setState('subscribed')
    } catch (err) {
      console.error(err)
      setState('idle')
    }
  }

  if (state === 'unsupported') return null

  if (state === 'subscribed') {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm py-3 px-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
        <span>🔔</span>
        <span className="font-medium">Notificaciones activadas</span>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-xs py-3 px-4 bg-steel-800 border border-steel-700 rounded-2xl">
        <span>🔕</span>
        <span>Notificaciones bloqueadas — activá los permisos en la config del celular</span>
      </div>
    )
  }

  return (
    <button
      onClick={subscribe}
      disabled={state === 'loading'}
      className="w-full flex items-center gap-3 py-3 px-4 bg-steel-800 border border-steel-600 hover:border-brand rounded-2xl transition-all group disabled:opacity-50"
    >
      <span className="text-xl">{state === 'loading' ? '⏳' : '🔔'}</span>
      <div className="text-left flex-1">
        <p className="text-white text-sm font-bold group-hover:text-brand transition-colors leading-none">
          {state === 'loading' ? 'Activando…' : 'Activar notificaciones'}
        </p>
        <p className="text-gray-500 text-xs mt-0.5">
          Te avisamos cuando cambie el estado de tu auto
        </p>
      </div>
      <span className="text-gray-600 group-hover:text-brand transition-colors">→</span>
    </button>
  )
}
