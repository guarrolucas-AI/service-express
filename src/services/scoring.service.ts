/**
 * scoring.service.ts
 *
 * Algoritmo de puntaje estilo Uber para talleres.
 *
 * Score final (0–100):
 *   50%  →  Eficiencia de tiempo (cuán cerca del estimado trabaja el taller)
 *   35%  →  NPS promedio post-servicio (0–10 → normalizado a 0–100)
 *   15%  →  Tasa de aceptación de turnos (1 - tasa de rechazo)
 *
 * El score ordena los talleres en las búsquedas del frontend.
 * Se recalcula en dos momentos:
 *   1. Cada vez que se cierra una orden (incremental, en background)
 *   2. Mensualmente via Cron (batch completo con todas las órdenes del período)
 */

import { prisma } from '@/lib/db'

// ─── Pesos del algoritmo ──────────────────────────────────────────────────────

const WEIGHTS = {
  TIME_EFFICIENCY:  0.50,
  NPS:              0.35,
  ACCEPTANCE_RATE:  0.15,
} as const

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Recalcula y persiste el score del taller.
 * Llamada cada vez que se cierra una OT o llega un NPS.
 */
export async function recalculateWorkshopScore(workshopId: string): Promise<number> {
  const [timeScore, npsScore, acceptanceScore] = await Promise.all([
    computeTimeEfficiencyScore(workshopId),
    computeNpsScore(workshopId),
    computeAcceptanceScore(workshopId),
  ])

  const score = Math.round(
    timeScore * WEIGHTS.TIME_EFFICIENCY +
    npsScore  * WEIGHTS.NPS +
    acceptanceScore * WEIGHTS.ACCEPTANCE_RATE,
  )

  // Guardar desglose para transparencia / debug
  await prisma.workshop.update({
    where: { id: workshopId },
    data: {
      score,
      timeDeviationPct: await getAvgTimeDeviation(workshopId),
      npsAverage:       npsScore / 10,   // revertir normalización para almacenamiento
      rejectionRate:    1 - acceptanceScore / 100,
    },
  })

  return score
}

// ─── Sub-métricas ─────────────────────────────────────────────────────────────

/**
 * Eficiencia de tiempo: 100 pts si el taller trabaja exactamente en el tiempo estimado.
 * Penaliza desvíos en ambas direcciones (muy lento o muy rápido = sospechoso).
 *
 * timeDeviationPct = avg( |realMinutes - estimatedMinutes| / estimatedMinutes * 100 )
 *
 * Puntaje = max(0, 100 - desviaciónPct)
 * Capped a 100 puntos.
 */
async function computeTimeEfficiencyScore(workshopId: string): Promise<number> {
  const deviationPct = await getAvgTimeDeviation(workshopId)
  return Math.max(0, Math.min(100, 100 - deviationPct))
}

async function getAvgTimeDeviation(workshopId: string): Promise<number> {
  // Tomar los últimos 90 días para reflejar rendimiento reciente
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const items = await prisma.orderItem.findMany({
    where: {
      taskType: 'LABOR',
      status: 'COMPLETED',
      realMinutes: { not: null },
      estimatedMinutes: { not: null },
      workOrder: {
        workshopId,
        completedAt: { gte: since },
      },
    },
    select: { realMinutes: true, estimatedMinutes: true },
  })

  if (items.length === 0) return 0

  const totalDeviation = items.reduce((acc, item) => {
    const est = item.estimatedMinutes!
    const real = item.realMinutes!
    return acc + Math.abs((real - est) / est) * 100
  }, 0)

  return Math.round(totalDeviation / items.length)
}

/**
 * Score NPS: convierte el NPS 0–10 a 0–100.
 * Usa sólo los últimos 90 días para que el score sea sensible a cambios recientes.
 */
async function computeNpsScore(workshopId: string): Promise<number> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const result = await prisma.workOrder.aggregate({
    where: {
      workshopId,
      npsScore: { not: null },
      npsRespondedAt: { gte: since },
    },
    _avg: { npsScore: true },
    _count: { npsScore: true },
  })

  if (!result._avg.npsScore) return 50 // Sin datos: score neutro

  // NPS 0–10 → 0–100
  return Math.round(result._avg.npsScore * 10)
}

/**
 * Tasa de aceptación: porcentaje de turnos que el taller aceptó vs. rechazó.
 * acceptanceScore = (1 - rejectionRate) * 100
 *
 * Un taller que rechaza el 20% de turnos tendrá 80/100 en esta métrica.
 */
async function computeAcceptanceScore(workshopId: string): Promise<number> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const [total, rejected] = await Promise.all([
    prisma.appointment.count({
      where: { workshopId, createdAt: { gte: since } },
    }),
    prisma.appointment.count({
      where: { workshopId, status: 'CANCELLED', createdAt: { gte: since } },
    }),
  ])

  if (total === 0) return 85 // Sin historial: puntaje razonable por defecto

  const rejectionRate = rejected / total
  return Math.round((1 - rejectionRate) * 100)
}

// ─── Recálculo batch (llamado por Cron mensual) ───────────────────────────────

/**
 * Recalcula el score de TODOS los talleres activos.
 * Diseñado para correr en el worker mensual de Vercel Cron.
 * Procesa en lotes para no saturar la conexión a la base de datos.
 */
export async function recalculateAllWorkshopScores(): Promise<{
  updated: number
  errors: string[]
}> {
  const workshops = await prisma.workshop.findMany({
    select: { id: true },
    where: { isActive: true },
  })

  let updated = 0
  const errors: string[] = []

  // Lotes de 10 para no saturar el pool de conexiones
  const BATCH_SIZE = 10
  for (let i = 0; i < workshops.length; i += BATCH_SIZE) {
    const batch = workshops.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async ({ id }) => {
        try {
          await recalculateWorkshopScore(id)
          updated++
        } catch (err) {
          console.error(`[scoring] Error al recalcular taller ${id}:`, err)
          errors.push(id)
        }
      }),
    )
  }

  console.log(`[scoring] Recálculo mensual completo: ${updated} talleres actualizados, ${errors.length} errores.`)
  return { updated, errors }
}
