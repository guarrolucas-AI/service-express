/**
 * POST /api/reservar
 *
 * Crea un turno desde el portal del cliente (sin auth).
 * Flujo: User (upsert por email) → Vehicle (upsert por patente)
 *        → Appointment → WorkOrder + OrderItems
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandler, ValidationError } from '@/lib/errors'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  firstName:    z.string().min(1).max(50),
  lastName:     z.string().min(1).max(50),
  phone:        z.string().min(6).max(20),
  email:        z.string().email(),
  vehicleBrand: z.string().min(1),
  vehicleModel: z.string().min(1),
  vehicleYear:  z.number().int().min(1980).max(new Date().getFullYear() + 2),
  vehiclePlate: z.string().min(1).max(10).transform(s => s.toUpperCase().replace(/\s/g, '')),
  vehicleKm:    z.number().int().min(0).default(0),
  services:     z.array(z.string()).min(1),
  notes:        z.string().max(500).optional(),
  scheduledAt:  z.string().datetime(),
})

const SERVICE_CATALOG: Record<string, { name: string; estimatedMin: number; laborPrice: number }> = {
  oil:         { name: 'Cambio de aceite y filtro',   estimatedMin: 45,  laborPrice: 15000 },
  brakes:      { name: 'Revisión y cambio de frenos', estimatedMin: 90,  laborPrice: 35000 },
  service_a:   { name: 'Service tipo A (30.000 km)',  estimatedMin: 120, laborPrice: 45000 },
  service_b:   { name: 'Service tipo B (60.000 km)',  estimatedMin: 180, laborPrice: 80000 },
  alignment:   { name: 'Alineación y balanceo',        estimatedMin: 60,  laborPrice: 12000 },
  diagnostics: { name: 'Diagnóstico electrónico',      estimatedMin: 60,  laborPrice: 10000 },
  suspension:  { name: 'Revisión de suspensión',       estimatedMin: 90,  laborPrice: 25000 },
  timing:      { name: 'Correa de distribución',       estimatedMin: 240, laborPrice: 65000 },
  general:     { name: 'Revisión general',             estimatedMin: 60,  laborPrice: 8000 },
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = schema.parse(await req.json())

  const workshop = await prisma.workshop.findFirst({ where: { isActive: true } })
  if (!workshop) throw new ValidationError('No hay talleres disponibles en este momento')

  const scheduledDate = new Date(body.scheduledAt)
  if (scheduledDate <= new Date()) {
    throw new ValidationError('La fecha del turno debe ser en el futuro')
  }

  const totalMin   = body.services.reduce((s, id) => s + (SERVICE_CATALOG[id]?.estimatedMin ?? 60), 0)
  const laborTotal = body.services.reduce((s, id) => s + (SERVICE_CATALOG[id]?.laborPrice   ?? 0),  0)
  const fee        = Math.round(laborTotal * 0.12)

  const result = await prisma.$transaction(async (tx) => {
    // 1. Upsert user
    const user = await tx.user.upsert({
      where:  { email: body.email },
      create: {
        email: body.email, phone: body.phone,
        firstName: body.firstName, lastName: body.lastName, role: 'CLIENT',
      },
      update: { phone: body.phone, firstName: body.firstName, lastName: body.lastName },
    })

    // 2. Upsert vehicle by plate
    const vehicle = await tx.vehicle.upsert({
      where:  { plate: body.vehiclePlate },
      create: {
        userId: user.id, plate: body.vehiclePlate,
        brand: body.vehicleBrand, model: body.vehicleModel,
        year: body.vehicleYear, engine: '—', currentKm: body.vehicleKm,
      },
      update: { currentKm: body.vehicleKm },
    })

    // 3. Create appointment
    const appointment = await tx.appointment.create({
      data: {
        userId: user.id, workshopId: workshop.id,
        vehicleId: vehicle.id, scheduledAt: scheduledDate,
        durationMin: totalMin, notes: body.notes, status: 'CONFIRMED',
      },
    })

    // 4. Create work order + items
    const workOrder = await tx.workOrder.create({
      data: {
        appointmentId: appointment.id,
        userId: user.id, vehicleId: vehicle.id, workshopId: workshop.id,
        status: 'PENDING_QUOTE',
        laborAmount: laborTotal, partsAmount: 0,
        totalAmount: laborTotal, platformFee: fee, workshopPayout: laborTotal - fee,
        orderItems: {
          create: body.services.map((svcId, i) => {
            const svc = SERVICE_CATALOG[svcId] ?? { name: svcId, estimatedMin: 60, laborPrice: 10000 }
            return {
              taskName: svc.name, taskType: 'LABOR',
              estimatedMinutes: svc.estimatedMin,
              laborPrice: svc.laborPrice, quantity: 1, sortOrder: i,
            }
          }),
        },
      },
    })

    return {
      workOrderId:   workOrder.id,
      appointmentId: appointment.id,
      phone:         user.phone,
    }
  })

  return NextResponse.json({ ok: true, data: result }, { status: 201 })
})
