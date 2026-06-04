/**
 * order.service.ts
 *
 * Gestión del ciclo de vida completo de una Orden de Trabajo:
 *   - Check-in con fotos
 *   - Control de tareas (start / stop cronómetro)
 *   - Transición de estados
 *   - Cierre y generación de informe
 */

import { prisma } from '@/lib/db'
import { whatsapp } from '@/lib/whatsapp'
import { AppError, NotFoundError, ConflictError, ValidationError } from '@/lib/errors'
import { runPredictiveAnalysis } from '@/services/predictive.service'
import { recalculateWorkshopScore } from '@/services/scoring.service'
import type { CheckInPayload, ChecklistPayload } from '@/types'

// ─── Check-in ─────────────────────────────────────────────────────────────────

/**
 * Inicia formalmente la recepción del vehículo.
 * Requiere 3 fotos (URLs ya subidas a S3/Vercel Blob).
 * Actualiza el kilometraje actual del vehículo.
 */
export async function checkIn(payload: CheckInPayload) {
  const { workOrderId, currentKm, photoFrontUrl, photoRearUrl, photoOdometerUrl } = payload

  if (!photoFrontUrl || !photoRearUrl || !photoOdometerUrl) {
    throw new ValidationError('Las 3 fotos de recepción son obligatorias (frente, trasera, odómetro).')
  }
  if (currentKm <= 0) throw new ValidationError('El kilometraje debe ser mayor a 0.')

  const wo = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: { vehicle: true, orderItems: true },
  })
  if (!wo) throw new NotFoundError('Orden de trabajo')
  if (wo.status !== 'READY_FOR_APPOINTMENT') {
    throw new ConflictError(`No se puede iniciar check-in en estado "${wo.status}".`)
  }

  await prisma.$transaction([
    prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        status: 'VEHICLE_RECEIVED',
        checkInAt: new Date(),
        checkInKm: currentKm,
        checkInPhotoFront: photoFrontUrl,
        checkInPhotoRear: photoRearUrl,
        checkInPhotoOdometer: photoOdometerUrl,
      },
    }),
    // Actualizar kilometraje del vehículo
    prisma.vehicle.update({
      where: { id: wo.vehicleId },
      data: { currentKm },
    }),
  ])

  return { checkedIn: true, workOrderId, checkInAt: new Date() }
}

// ─── Cronómetro de tareas ─────────────────────────────────────────────────────

export async function startTask(orderItemId: string, mechanicUserId: string) {
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { workOrder: true },
  })
  if (!item) throw new NotFoundError('Tarea')
  if (item.status !== 'PENDING') {
    throw new ConflictError(`La tarea ya está en estado "${item.status}".`)
  }
  if (item.workOrder.status === 'VEHICLE_RECEIVED') {
    // Primera tarea: transicionar la OT a EN_PROCESO
    await prisma.workOrder.update({
      where: { id: item.workOrderId },
      data: { status: 'IN_PROGRESS' },
    })
  }

  const updated = await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  })

  return { started: true, orderItemId, startedAt: updated.startedAt }
}

export async function stopTask(orderItemId: string) {
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      workOrder: {
        include: {
          orderItems: true,
          user: true,
          workshop: true,
          vehicle: true,
        },
      },
    },
  })
  if (!item) throw new NotFoundError('Tarea')
  if (item.status !== 'IN_PROGRESS') {
    throw new ConflictError(`La tarea no está en progreso (estado actual: "${item.status}").`)
  }
  if (!item.startedAt) throw new AppError('La tarea no tiene timestamp de inicio.', 409)

  const finishedAt = new Date()
  const realMinutes = Math.round((finishedAt.getTime() - item.startedAt.getTime()) / 60_000)

  const updatedItem = await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { status: 'COMPLETED', finishedAt, realMinutes },
  })

  // Verificar si todos los ítems de mano de obra están completos
  const wo = item.workOrder
  const laborItems = wo.orderItems.filter((i) => i.taskType === 'LABOR')
  const pendingLabor = laborItems.filter(
    (i) => i.id !== orderItemId && i.status !== 'COMPLETED' && i.status !== 'SKIPPED',
  )

  if (pendingLabor.length === 0) {
    // ── DISPARADOR AL 80%: último ítem completado → Quality Control ──────────
    await prisma.workOrder.update({
      where: { id: wo.id },
      data: { status: 'QUALITY_CONTROL' },
    })

    // WhatsApp en background — no bloquea si falla en dev/sin token
    whatsapp.vehicleInQualityControl(
      wo.user.phone ?? wo.user.email,
      { clientName: wo.user.firstName, workshopName: wo.workshop.name },
    ).catch((e) => console.warn('[whatsapp] vehicleInQualityControl:', e?.message ?? e))
  }

  return { stopped: true, orderItemId, realMinutes, finishedAt }
}

// ─── Completar checklist e inspección ────────────────────────────────────────

export async function submitChecklist(payload: ChecklistPayload) {
  const wo = await prisma.workOrder.findUnique({
    where: { id: payload.workOrderId },
    include: {
      user: true,
      workshop: true,
      vehicle: true,
      orderItems: true,
    },
  })
  if (!wo) throw new NotFoundError('Orden de trabajo')
  if (wo.status !== 'QUALITY_CONTROL') {
    throw new ConflictError('El checklist solo puede completarse en estado "control_de_calidad".')
  }

  await prisma.$transaction(async (tx) => {
    // Crear / actualizar checklist
    await tx.inspectionChecklist.upsert({
      where: { workOrderId: payload.workOrderId },
      create: {
        ...payload,
        completedAt: new Date(),
      },
      update: {
        ...payload,
        completedAt: new Date(),
      },
    })
  })

  return { checklistSaved: true }
}

// ─── Cierre de orden ──────────────────────────────────────────────────────────

export async function closeWorkOrder(workOrderId: string, reportUrl: string) {
  const wo = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      user: true,
      workshop: true,
      vehicle: true,
      checklist: true,
      orderItems: true,
    },
  })
  if (!wo) throw new NotFoundError('Orden de trabajo')
  if (!wo.checklist) throw new ConflictError('Debe completar el checklist antes de cerrar la orden.')

  const completedAt = new Date()

  await prisma.$transaction([
    prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'COMPLETED', completedAt, reportUrl },
    }),
    prisma.appointment.update({
      where: { id: wo.appointmentId },
      data: { status: 'COMPLETED' },
    }),
    prisma.workshop.update({
      where: { id: wo.workshopId },
      data: { totalServices: { increment: 1 } },
    }),
  ])

  // ── DISPARADOR AL 100%: notificar al cliente con link del informe ──────────
  // En background — no bloquea si WhatsApp no está configurado aún
  whatsapp.workCompleted(wo.user.phone ?? wo.user.email, {
    clientName: wo.user.firstName,
    reportUrl,
  }).catch((e) => console.warn('[whatsapp] workCompleted:', e?.message ?? e))

  // Motor predictivo en background (no bloquea la respuesta)
  if (wo.checkInKm && wo.checklist) {
    runPredictiveAnalysis({
      vehicleId: wo.vehicleId,
      workOrderId,
      currentKm: wo.checkInKm,
      checklist: wo.checklist as ChecklistPayload,
    }).catch(console.error)
  }

  // Recalcular score del taller en background
  recalculateWorkshopScore(wo.workshopId).catch(console.error)

  return { closed: true, workOrderId, completedAt, reportUrl }
}

// ─── NPS post-servicio ────────────────────────────────────────────────────────

export async function submitNps(workOrderId: string, score: number, comment?: string) {
  if (score < 0 || score > 10) throw new ValidationError('El NPS debe estar entre 0 y 10.')

  const wo = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    select: { status: true, workshopId: true, npsRespondedAt: true },
  })
  if (!wo) throw new NotFoundError('Orden de trabajo')
  if (wo.status !== 'COMPLETED') throw new ConflictError('La orden debe estar completada para enviar NPS.')
  if (wo.npsRespondedAt) throw new ConflictError('Ya enviaste una valoración para esta orden.')

  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: { npsScore: score, npsComment: comment, npsRespondedAt: new Date() },
  })

  // Recalcular score del taller con el nuevo NPS
  await recalculateWorkshopScore(wo.workshopId)

  return { npsSubmitted: true }
}
