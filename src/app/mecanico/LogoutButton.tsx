'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const logout = async () => {
    setLoading(true)
    await fetch('/api/mechanic/auth', { method: 'DELETE' })
    router.push('/mecanico/login')
    router.refresh()
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="text-gray-500 hover:text-red-400 transition-colors text-xs px-3 py-1.5 border border-steel-600 rounded-lg disabled:opacity-50"
    >
      {loading ? '...' : 'Salir'}
    </button>
  )
}
