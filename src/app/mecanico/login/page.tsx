/**
 * /mecanico/login — Selección de mecánico + PIN numérico
 * Server component que busca mecánicos en DB y los pasa al formulario cliente.
 */
import { prisma } from '@/lib/db'
import { Suspense } from 'react'
import { MecanicoLoginForm } from './MecanicoLoginForm'

export const dynamic = 'force-dynamic'

export default async function MecanicoLoginPage() {
  const rows = await prisma.user.findMany({
    where:   { role: 'MECHANIC', passwordHash: { not: null } },
    select:  { id: true, firstName: true, lastName: true },
    orderBy: { firstName: 'asc' },
  })

  const mechanics = rows.map(m => ({
    id:   m.id,
    name: `${m.firstName} ${m.lastName}`,
  }))

  return (
    <Suspense>
      <MecanicoLoginForm mechanics={mechanics} />
    </Suspense>
  )
}
