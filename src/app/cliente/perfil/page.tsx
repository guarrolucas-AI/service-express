/**
 * /cliente/perfil?phone=XXX — Editar datos del cliente
 */

import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PerfilForm } from './PerfilForm'

export const dynamic = 'force-dynamic'

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: { phone?: string }
}) {
  const phone = searchParams.phone?.trim() ?? ''
  if (!phone) notFound()

  const user = await prisma.user.findFirst({
    where:  { phone },
    select: { firstName: true, lastName: true, email: true, phone: true },
  })
  if (!user) notFound()

  return (
    <div className="min-h-screen bg-steel-900 p-4">
      <div className="max-w-sm mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 py-5 mb-2">
          <Link href={`/cliente/mis-ordenes?phone=${phone}`}
            className="text-gray-500 hover:text-brand transition-colors text-xl leading-none">←</Link>
          <div>
            <h1 className="text-white font-bold font-display text-xl">Mi perfil</h1>
            <p className="text-gray-500 text-sm">{user.firstName} {user.lastName}</p>
          </div>
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-brand/20 border-2 border-brand/30 flex items-center justify-center">
            <span className="font-display font-bold text-brand text-3xl">
              {user.firstName[0]?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-steel-800 border border-steel-600 rounded-2xl p-5">
          <PerfilForm
            phone={user.phone ?? phone}
            firstName={user.firstName}
            lastName={user.lastName}
            email={user.email}
          />
        </div>

        <p className="text-gray-700 text-xs text-center mt-4">
          Tu número de teléfono es tu identificador y no se puede cambiar.
        </p>
      </div>
    </div>
  )
}
