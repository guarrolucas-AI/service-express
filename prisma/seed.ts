/**
 * prisma/seed.ts
 * Datos de demo para prototipo de Express Service.
 * Ejecutar: npm run db:seed
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Express Service...')

  // ── Taller ──────────────────────────────────────────────────────────────────
  const workshop = await prisma.workshop.upsert({
    where: { email: 'admin@expressservice.com.ar' },
    update: {},
    create: {
      name:      'Express Service',
      address:   'Av. Crovara 4200',
      city:      'La Matanza',
      province:  'Buenos Aires',
      lat:       -34.698,
      lng:       -58.578,
      phone:     '1166614164',
      email:     'admin@expressservice.com.ar',
      status:    'ACTIVE',
      score:     82,
      npsAverage: 8.4,
      isActive:  true,
    },
  })

  // ── Admin ───────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@expressservice.com.ar' },
    update: {},
    create: {
      email:      'admin@expressservice.com.ar',
      firstName:  'Lucas',
      lastName:   'Fernández',
      role:       'ADMIN',
      phone:      '1166614164',
      workshopId: workshop.id,
    },
  })

  // ── Mecánico ────────────────────────────────────────────────────────────────
  const mechanic = await prisma.user.upsert({
    where: { email: 'mecanico@expressservice.com.ar' },
    update: {},
    create: {
      email:      'mecanico@expressservice.com.ar',
      firstName:  'Rodrigo',
      lastName:   'Gómez',
      role:       'MECHANIC',
      phone:      '1155223344',
      workshopId: workshop.id,
    },
  })

  // ── Clientes ─────────────────────────────────────────────────────────────────
  const client1 = await prisma.user.upsert({
    where: { email: 'martin.garcia@gmail.com' },
    update: {},
    create: {
      email:     'martin.garcia@gmail.com',
      firstName: 'Martín',
      lastName:  'García',
      phone:     '1144556677',
      role:      'CLIENT',
    },
  })
  const client2 = await prisma.user.upsert({
    where: { email: 'ana.rodriguez@hotmail.com' },
    update: {},
    create: {
      email:     'ana.rodriguez@hotmail.com',
      firstName: 'Ana',
      lastName:  'Rodríguez',
      phone:     '1155667788',
      role:      'CLIENT',
    },
  })
  const client3 = await prisma.user.upsert({
    where: { email: 'carlos.perez@gmail.com' },
    update: {},
    create: {
      email:     'carlos.perez@gmail.com',
      firstName: 'Carlos',
      lastName:  'Pérez',
      phone:     '1133445566',
      role:      'CLIENT',
    },
  })

  // ── Vehículos ────────────────────────────────────────────────────────────────
  const car1 = await prisma.vehicle.upsert({
    where: { plate: 'AB123CD' },
    update: {},
    create: {
      userId: client1.id, brand: 'Volkswagen', model: 'Gol Trend',
      year: 2019, engine: '1.6', plate: 'AB123CD', currentKm: 87_400, color: 'Blanco',
    },
  })
  const car2 = await prisma.vehicle.upsert({
    where: { plate: 'GH789IJ' },
    update: {},
    create: {
      userId: client2.id, brand: 'Chevrolet', model: 'Tracker',
      year: 2021, engine: '1.0T', plate: 'GH789IJ', currentKm: 42_100, color: 'Gris',
    },
  })
  const car3 = await prisma.vehicle.upsert({
    where: { plate: 'MN456OP' },
    update: {},
    create: {
      userId: client3.id, brand: 'Toyota', model: 'Corolla',
      year: 2020, engine: '1.8', plate: 'MN456OP', currentKm: 63_800, color: 'Negro',
    },
  })

  // ── Repuestos ────────────────────────────────────────────────────────────────
  await prisma.sparePart.upsert({
    where: { sku: 'FRENO-GOL-DEL-01' },
    update: {},
    create: {
      sku: 'FRENO-GOL-DEL-01', name: 'Kit Pastillas Freno Delanteras Gol Trend',
      brand: 'Bosch', costPrice: 8_500, salePrice: 14_200, stock: 6,
      compatibility: [{ brand: 'Volkswagen', model: 'Gol Trend', yearFrom: 2012, yearTo: 2024 }],
    },
  })
  await prisma.sparePart.upsert({
    where: { sku: 'ACEITE-5W40-01' },
    update: {},
    create: {
      sku: 'ACEITE-5W40-01', name: 'Aceite Motor 5W40 Sintético (4L)',
      brand: 'Castrol', costPrice: 6_200, salePrice: 9_800, stock: 20,
      compatibility: [],
    },
  })
  await prisma.sparePart.upsert({
    where: { sku: 'FILTRO-ACEITE-01' },
    update: {},
    create: {
      sku: 'FILTRO-ACEITE-01', name: 'Filtro de Aceite',
      brand: 'Mann', costPrice: 1_200, salePrice: 2_400, stock: 15,
      compatibility: [],
    },
  })

  // ── OT 1: EN PROGRESO (para demo del mecánico) ──────────────────────────────
  const appt1 = await prisma.appointment.create({
    data: {
      userId: client1.id, workshopId: workshop.id, vehicleId: car1.id,
      scheduledAt: new Date(), durationMin: 120, status: 'CONFIRMED',
    },
  })
  const wo1 = await prisma.workOrder.create({
    data: {
      userId: client1.id, workshopId: workshop.id, vehicleId: car1.id,
      appointmentId: appt1.id,
      status: 'IN_PROGRESS',
      checkInAt: new Date(Date.now() - 90 * 60 * 1000),
      checkInKm: 87_400,
      checkInPhotoFront:    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800',
      checkInPhotoRear:     'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800',
      checkInPhotoOdometer: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800',
      paymentStatus: 'APPROVED', paidAt: new Date(),
      totalAmount: 45_800, laborAmount: 36_000, partsAmount: 9_800,
      platformFee: 4_320, workshopPayout: 31_680,
      orderItems: {
        create: [
          {
            taskName: 'Service completo (aceite + filtros)', taskType: 'LABOR',
            estimatedMinutes: 45, laborPrice: 18_000, partPrice: 0, quantity: 1,
            status: 'COMPLETED', startedAt: new Date(Date.now() - 80 * 60 * 1000),
            finishedAt: new Date(Date.now() - 40 * 60 * 1000), realMinutes: 40,
            mechanicUserId: mechanic.id,
          },
          {
            taskName: 'Aceite Motor 5W40 + Filtro', taskType: 'PART',
            estimatedMinutes: 0, laborPrice: 0, partPrice: 12_200, quantity: 1,
            status: 'COMPLETED', mechanicUserId: mechanic.id,
          },
          {
            taskName: 'Cambio pastillas de freno delanteras', taskType: 'LABOR',
            estimatedMinutes: 60, laborPrice: 18_000, partPrice: 0, quantity: 1,
            status: 'IN_PROGRESS', startedAt: new Date(Date.now() - 35 * 60 * 1000),
            mechanicUserId: mechanic.id,
          },
        ],
      },
    },
  })

  // ── OT 2: QUALITY CONTROL (checklist pendiente) ───────────────────────────
  const appt2 = await prisma.appointment.create({
    data: {
      userId: client2.id, workshopId: workshop.id, vehicleId: car2.id,
      scheduledAt: new Date(), durationMin: 90, status: 'CONFIRMED',
    },
  })
  const wo2 = await prisma.workOrder.create({
    data: {
      userId: client2.id, workshopId: workshop.id, vehicleId: car2.id,
      appointmentId: appt2.id,
      status: 'QUALITY_CONTROL',
      checkInAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      checkInKm: 42_100,
      checkInPhotoFront:    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800',
      checkInPhotoRear:     'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800',
      checkInPhotoOdometer: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800',
      paymentStatus: 'APPROVED',
      totalAmount: 28_000, laborAmount: 28_000, partsAmount: 0,
      platformFee: 3_360, workshopPayout: 24_640,
      orderItems: {
        create: [
          {
            taskName: 'Alineación y balanceo 4 ruedas', taskType: 'LABOR',
            estimatedMinutes: 90, laborPrice: 28_000, partPrice: 0, quantity: 1,
            status: 'COMPLETED', startedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
            finishedAt: new Date(Date.now() - 45 * 60 * 1000), realMinutes: 95,
            mechanicUserId: mechanic.id,
          },
        ],
      },
    },
  })

  // ── OT 3: COMPLETADA (para ver el informe PDF) ────────────────────────────
  const appt3 = await prisma.appointment.create({
    data: {
      userId: client3.id, workshopId: workshop.id, vehicleId: car3.id,
      scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      durationMin: 180, status: 'COMPLETED',
    },
  })
  const wo3 = await prisma.workOrder.create({
    data: {
      userId: client3.id, workshopId: workshop.id, vehicleId: car3.id,
      appointmentId: appt3.id,
      status: 'COMPLETED',
      checkInAt:   new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      checkInKm: 63_800,
      checkInPhotoFront:    'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800',
      checkInPhotoRear:     'https://images.unsplash.com/photo-1504215680853-026ed2a45def?w=800',
      checkInPhotoOdometer: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800',
      paymentStatus: 'APPROVED', paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      totalAmount: 67_400, laborAmount: 53_200, partsAmount: 14_200,
      platformFee: 6_384, workshopPayout: 46_816,
      reportUrl: '/api/pdf/work-order/DEMO',
      npsScore: 9, npsRespondedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      orderItems: {
        create: [
          {
            taskName: 'Diagnóstico computarizado OBD2', taskType: 'LABOR',
            estimatedMinutes: 30, laborPrice: 12_000, partPrice: 0, quantity: 1,
            status: 'COMPLETED', startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            finishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 28 * 60 * 1000),
            realMinutes: 28, mechanicUserId: mechanic.id,
          },
          {
            taskName: 'Cambio pastillas de freno delanteras', taskType: 'LABOR',
            estimatedMinutes: 60, laborPrice: 24_000, partPrice: 0, quantity: 1,
            status: 'COMPLETED', realMinutes: 55, mechanicUserId: mechanic.id,
          },
          {
            taskName: 'Kit Pastillas Freno Bosch', taskType: 'PART',
            estimatedMinutes: 0, laborPrice: 0, partPrice: 14_200, quantity: 1,
            status: 'COMPLETED', mechanicUserId: mechanic.id,
          },
          {
            taskName: 'Revisión tren delantero', taskType: 'LABOR',
            estimatedMinutes: 45, laborPrice: 17_200, partPrice: 0, quantity: 1,
            status: 'COMPLETED', realMinutes: 50, mechanicUserId: mechanic.id,
          },
        ],
      },
    },
  })

  // Checklist para OT3
  await prisma.inspectionChecklist.create({
    data: {
      workOrderId:       wo3.id,
      frontBrakePadPct:  85, rearBrakePadPct:   60,
      brakeFluidStatus:  'GREEN',
      frontShockStatus:  'GREEN', rearShockStatus: 'YELLOW',
      oilStatus:         'GREEN', coolantStatus:   'GREEN',
      transmissionStatus:'GREEN',
      tireFrontLeftMm:   6.5, tireFrontRightMm: 6.2,
      tireRearLeftMm:    4.1, tireRearRightMm:  3.9,
      tirePressureStatus:'GREEN',
      mechanicNotes:     'Amortiguadores traseros con leve desgaste. Se recomienda revisión preventiva en el próximo service. Neumáticos traseros con vida útil remanente estimada de 15.000 km.',
      completedAt:       new Date(),
    },
  })

  // Actualizar URL del reporte de OT3 con ID real
  await prisma.workOrder.update({
    where: { id: wo3.id },
    data: { reportUrl: `/api/pdf/work-order/${wo3.id}` },
  })

  // ── OT 4: READY_FOR_APPOINTMENT (en espera) ──────────────────────────────
  const appt4 = await prisma.appointment.create({
    data: {
      userId: client1.id, workshopId: workshop.id, vehicleId: car1.id,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      durationMin: 60, status: 'CONFIRMED',
    },
  })
  await prisma.workOrder.create({
    data: {
      userId: client1.id, workshopId: workshop.id, vehicleId: car1.id,
      appointmentId: appt4.id,
      status: 'READY_FOR_APPOINTMENT',
      paymentStatus: 'APPROVED', paidAt: new Date(),
      totalAmount: 18_000, laborAmount: 18_000, partsAmount: 0,
      orderItems: {
        create: [{
          taskName: 'Revisión Pre-Viaje gratuita', taskType: 'LABOR',
          estimatedMinutes: 60, laborPrice: 0, partPrice: 0, quantity: 1,
          status: 'PENDING',
        }],
      },
    },
  })

  console.log('✅ Seed completado!')
  console.log(`   Workshop: ${workshop.id}`)
  console.log(`   OT en progreso: ${wo1.id}`)
  console.log(`   OT en QC: ${wo2.id}`)
  console.log(`   OT completada: ${wo3.id}`)
  console.log(`\n   🔗 PDF informe: /api/pdf/work-order/${wo3.id}`)
  console.log(`   🔗 PDF remito: /api/pdf/checkin/${wo1.id}`)
  console.log(`   🔗 Reporte mensual: /api/pdf/monthly/${workshop.id}/2026-06`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
