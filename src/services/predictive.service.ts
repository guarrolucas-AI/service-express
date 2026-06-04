/**
 * predictive.service.ts
 *
 * Algoritmo de desgaste proyectado:
 *   - Toma mediciones del checklist (%, mm)
 *   - Calcula cuántos km/meses faltan hasta el límite crítico
 *   - Inserta en PredictiveMaintenance
 *   - Programa campaña de WhatsApp para la fecha proyectada
 */

import { prisma } from '@/lib/db'
import type { PredictiveInput } from '@/types'

// ─── Umbrales críticos ────────────────────────────────────────────────────────

const THRESHOLDS = {
  BRAKE_PAD: {
    criticalPct: 15,          // < 15% → alerta
    usefulLifeKm: 40_000,     // km de vida útil nominal de una pastilla nueva
  },
  TIRE: {
    criticalMm: 2.0,          // < 2mm dibujo → alerta (mínimo legal AR: 1.6mm)
    newMm: 8.0,               // mm de un neumático nuevo
  },
  OIL: {
    // El aceite se evalúa por semáforo, no por %
  },
} as const

// ─── Motor principal ──────────────────────────────────────────────────────────

export async function runPredictiveAnalysis(input: PredictiveInput): Promise<void> {
  const { vehicleId, workOrderId, currentKm, checklist } = input
  const monthlyKmAvg = input.monthlyKmAvg ?? 1_200 // promedio Argentina

  const records: Parameters<typeof prisma.predictiveMaintenance.create>[0]['data'][] = []

  // ── Pastillas de freno delanteras ──────────────────────────────────────────
  const frontBrakeRecord = buildBrakePadRecord({
    component: 'BRAKE_PAD_FRONT',
    currentPct: checklist.frontBrakePadPct,
    vehicleId,
    workOrderId,
    currentKm,
    monthlyKmAvg,
  })
  if (frontBrakeRecord) records.push(frontBrakeRecord)

  // ── Pastillas de freno traseras ────────────────────────────────────────────
  const rearBrakeRecord = buildBrakePadRecord({
    component: 'BRAKE_PAD_REAR',
    currentPct: checklist.rearBrakePadPct,
    vehicleId,
    workOrderId,
    currentKm,
    monthlyKmAvg,
  })
  if (rearBrakeRecord) records.push(rearBrakeRecord)

  // ── Neumáticos (los 4 individualmente) ────────────────────────────────────
  const tirePositions: [string, number][] = [
    ['TIRE_FRONT_LEFT',  checklist.tireFrontLeftMm],
    ['TIRE_FRONT_RIGHT', checklist.tireFrontRightMm],
    ['TIRE_REAR_LEFT',   checklist.tireRearLeftMm],
    ['TIRE_REAR_RIGHT',  checklist.tireRearRightMm],
  ]

  for (const [component, currentMm] of tirePositions) {
    const tireRecord = buildTireRecord({
      component,
      currentMm,
      vehicleId,
      workOrderId,
      currentKm,
      monthlyKmAvg,
    })
    if (tireRecord) records.push(tireRecord)
  }

  // Persist en batch
  if (records.length > 0) {
    await prisma.$transaction(
      records.map((data) =>
        prisma.predictiveMaintenance.create({ data }),
      ),
    )
  }

  // Programar campañas de WhatsApp para la fecha más próxima de cada componente
  await scheduleRetentionCampaigns(vehicleId, records)
}

// ─── Builders ─────────────────────────────────────────────────────────────────

function buildBrakePadRecord(opts: {
  component: string
  currentPct: number
  vehicleId: string
  workOrderId: string
  currentKm: number
  monthlyKmAvg: number
}) {
  const { criticalPct, usefulLifeKm } = THRESHOLDS.BRAKE_PAD

  // Km restantes hasta el límite crítico
  // Si tiene 40% de vida y el umbral es 15%, le quedan (40-15)/100 * vida_útil_total km
  const remainingPct = Math.max(opts.currentPct - criticalPct, 0)
  const projectedKm = Math.round((remainingPct / 100) * usefulLifeKm)
  const monthsUntilCritical = projectedKm / opts.monthlyKmAvg
  const projectedCriticalDate = new Date(
    Date.now() + monthsUntilCritical * 30 * 24 * 60 * 60 * 1000,
  )

  return {
    vehicleId: opts.vehicleId,
    workOrderId: opts.workOrderId,
    component: opts.component,
    currentValuePct: opts.currentPct,
    criticalThresholdPct: criticalPct,
    baseKm: opts.currentKm,
    monthlyKmAvg: opts.monthlyKmAvg,
    projectedCriticalKm: opts.currentKm + projectedKm,
    projectedCriticalDate,
  }
}

function buildTireRecord(opts: {
  component: string
  currentMm: number
  vehicleId: string
  workOrderId: string
  currentKm: number
  monthlyKmAvg: number
}) {
  const { criticalMm, newMm } = THRESHOLDS.TIRE

  // Desgaste total aprovechable = newMm - criticalMm
  // Mm restantes aprovechables = currentMm - criticalMm
  const usableMm = newMm - criticalMm
  const remainingMm = Math.max(opts.currentMm - criticalMm, 0)

  // Suponiendo que un neumático nuevo (8mm) dura ~40.000km en Argentina
  const tireLifeKm = 40_000
  const projectedKm = Math.round((remainingMm / usableMm) * tireLifeKm)
  const monthsUntilCritical = projectedKm / opts.monthlyKmAvg
  const projectedCriticalDate = new Date(
    Date.now() + monthsUntilCritical * 30 * 24 * 60 * 60 * 1000,
  )

  return {
    vehicleId: opts.vehicleId,
    workOrderId: opts.workOrderId,
    component: opts.component,
    currentValueMm: opts.currentMm,
    criticalThresholdMm: criticalMm,
    baseKm: opts.currentKm,
    monthlyKmAvg: opts.monthlyKmAvg,
    projectedCriticalKm: opts.currentKm + projectedKm,
    projectedCriticalDate,
  }
}

// ─── Programar campañas de retención ─────────────────────────────────────────

async function scheduleRetentionCampaigns(
  vehicleId: string,
  records: unknown[],
) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { user: true },
  })
  if (!vehicle?.user?.phone) return

  const LABELS: Record<string, string> = {
    BRAKE_PAD_FRONT: 'pastillas de freno delanteras',
    BRAKE_PAD_REAR:  'pastillas de freno traseras',
    TIRE_FRONT_LEFT: 'neumático delantero izquierdo',
    TIRE_FRONT_RIGHT:'neumático delantero derecho',
    TIRE_REAR_LEFT:  'neumático trasero izquierdo',
    TIRE_REAR_RIGHT: 'neumático trasero derecho',
  }

  const campaigns = (records as Array<{
    component: string
    projectedCriticalDate: Date
    vehicleId: string
  }>)
    .filter((r) => r.vehicleId === vehicleId)
    .map((r) => {
      // Enviar alerta 30 días ANTES de la fecha crítica
      const scheduledAt = new Date(r.projectedCriticalDate)
      scheduledAt.setDate(scheduledAt.getDate() - 30)

      return {
        vehicleId,
        userId: vehicle.userId,
        templateName: 'alerta_mantenimiento_predictivo',
        phone: vehicle.user.phone!,
        scheduledAt,
        payload: {
          component: LABELS[r.component] ?? r.component,
          plate: vehicle.plate,
          brand: vehicle.brand,
          model: vehicle.model,
        },
      }
    })
    .filter((c) => c.scheduledAt > new Date()) // Solo fechas futuras

  if (campaigns.length > 0) {
    await prisma.whatsappCampaign.createMany({ data: campaigns })
  }
}

// ─── Dispatcher de campañas (llamado por Cron) ────────────────────────────────

/**
 * Ejecutar cada hora via Vercel Cron.
 * Toma campañas programadas para la ventana actual y las envía.
 */
export async function dispatchScheduledCampaigns(): Promise<{ sent: number }> {
  const { whatsapp } = await import('@/lib/whatsapp')

  const now = new Date()
  const windowEnd = new Date(now.getTime() + 60 * 60 * 1000) // próxima hora

  const pending = await prisma.whatsappCampaign.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: windowEnd },
    },
    take: 100,
  })

  let sent = 0
  for (const campaign of pending) {
    try {
      const p = campaign.payload as { component: string; plate: string }
      await whatsapp.predictiveAlert(campaign.phone, {
        clientName: '',       // enriquecer con join si es necesario
        component: p.component,
        monthsUntilCritical: 1,
        vehiclePlate: p.plate,
      })
      await prisma.whatsappCampaign.update({
        where: { id: campaign.id },
        data: { status: 'SENT', sentAt: new Date() },
      })
      sent++
    } catch (err) {
      console.error(`[campaign] Error al enviar campaña ${campaign.id}:`, err)
      await prisma.whatsappCampaign.update({
        where: { id: campaign.id },
        data: { status: 'FAILED' },
      })
    }
  }

  return { sent }
}
