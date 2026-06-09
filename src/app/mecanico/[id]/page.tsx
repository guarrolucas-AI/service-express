/**
 * /mecanico/[id] — Detalle de orden (mecánico)
 */
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { MecanicoOrderClient } from './client'

export const dynamic = 'force-dynamic'

export default async function MecanicoOrderPage({ params }: { params: { id: string } }) {
  const wo = await prisma.workOrder.findUnique({
    where: { id: params.id },
    include: {
      user:       true,
      vehicle:    true,
      workshop:   true,
      checklist:  true,
      orderItems: { orderBy: { sortOrder: 'asc' } },
    },
  })
  if (!wo) notFound()

  // ID del mecánico autenticado viene de la cookie (que ahora almacena el User.id real)
  const mechanicId = cookies().get('mechanic-session')?.value ?? 'demo-mechanic-id'

  const data = {
    id:           wo.id,
    status:       wo.status,
    checkInKm:    wo.checkInKm,
    checkInAt:    wo.checkInAt?.toISOString() ?? null,
    checkInPhotoFront:    wo.checkInPhotoFront,
    checkInPhotoRear:     wo.checkInPhotoRear,
    checkInPhotoOdometer: wo.checkInPhotoOdometer,
    vehicle: {
      brand: wo.vehicle.brand, model: wo.vehicle.model,
      year:  wo.vehicle.year,  plate: wo.vehicle.plate,
    },
    client: {
      name:  `${wo.user.firstName} ${wo.user.lastName}`,
      phone: wo.user.phone ?? '',
    },
    items: wo.orderItems.map(i => ({
      id:               i.id,
      taskName:         i.taskName,
      taskType:         i.taskType,
      status:           i.status,
      estimatedMinutes: i.estimatedMinutes,
      realMinutes:      i.realMinutes,
      startedAt:        i.startedAt?.toISOString() ?? null,
      laborPrice:       Number(i.laborPrice ?? 0),
      partPrice:        Number(i.partPrice  ?? 0),
      quantity:         i.quantity,
    })),
    hasChecklist: !!wo.checklist,
    totalAmount:  Number(wo.totalAmount ?? 0),
  }

  return <MecanicoOrderClient data={data} mechanicId={mechanicId} />
}
