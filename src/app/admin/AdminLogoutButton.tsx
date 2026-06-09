'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AdminLogoutButton() {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  const logout = async () => {
    setLoading(true)
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="text-xs text-gray-500 hover:text-red-400 border border-steel-600 rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
    >
      {loading ? '...' : 'Salir'}
    </button>
  )
}
