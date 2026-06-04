/**
 * GET /api/cron/update-estimates
 *
 * Vercel Cron Job — se ejecuta el 1° de cada mes.
 * Recalcula:
 *   1. TaskTimeBaseline — promedio real de minutos por tipo de tarea y vehículo
 *   2. Score de TODOS los talleres activos (Uber-style: tiempo + NPS + aceptación)
 *
 * Protegido por CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { recalculateAllWorkshopScores } from '@/services/scoring.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300  // 5 minutos para procesar el batch completo

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[cron/estimates] Iniciando recálculo mensual...')

  const [estimatesResult, scoringResult] = await Promise.allSettled([
    updateTaskTimeBaselines(),
    recalculateAllWorkshopScores(),
  ])

  const response = {
    estimates: estimatesResult.status === 'fulfilled'
      ? estimatesResult.value
      : { error: String(estimatesResult.reason) },
    scoring: scoringResult.status === 'fulfilled'
      ? scoringResult.value
      : { error: String(scoringResult.reason) },
  }

  console.log('[cron/estimates] Resultado:', JSON.stringify(response, null, 2))
  return NextResponse.json({ ok: true, data: response })
}

// ─── Actualización de baselines de tiempo ────────────────────────────────────

/**
 * Para cada combinación (taskName × vehicleBrand × vehicleModel) con al menos
 * 3 muestras en los últimos 6 meses, recalcula el promedio de tiempo real.
 * Actualiza o inserta el registro en TaskTimeBaseline.
 *
 * Este promedio se usará en la próxima generación de presupuestos para estimar
 * el precio de mano de obra con mayor precisión.
 */
async function updateTaskTimeBaselines(): Promise<{
  processed: number
  created: number
  updated: number
}> {
  const since = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
  const MIN_SAMPLES = 3

  // Agrupar por (taskName, vehicleBrand, vehicleModel) con avg y count
  const groups = await prisma.$queryRaw<Array<{
    taskName: string
    vehicleBrand: string
    vehicleModel: string
    avgMinutes: number
    sampleCount: number
  }>>`
    SELECT
      oi."taskName",
      v.brand  AS "vehicleBrand",
      v.model  AS "vehicleModel",
      ROUND(AVG(oi."realMinutes"))::int AS "avgMinutes",
      COUNT(*)::int                     AS "sampleCount"
    FROM "OrderItem" oi
    JOIN "WorkOrder" wo ON wo.id = oi."workOrderId"
    JOIN "Vehicle"   v  ON v.id  = wo."vehicleId"
    WHERE
      oi."taskType"  = 'LABOR'
      AND oi.status  = 'COMPLETED'
      AND oi."realMinutes" IS NOT NULL
      AND wo."completedAt" >= ${since}
    GROUP BY oi."taskName", v.brand, v.model
    HAVING COUNT(*) >= ${MIN_SAMPLES}
  `

  let created = 0
  let updated = 0

  for (const g of groups) {
    const existing = await prisma.taskTimeBaseline.findFirst({
      where: {
        taskName:     g.taskName,
        vehicleBrand: g.vehicleBrand,
        vehicleModel: g.vehicleModel,
      },
    })

    if (existing) {
      await prisma.taskTimeBaseline.update({
        where: { id: existing.id },
        data: {
          estimatedMinutes: g.avgMinutes,
          sampleCount:      g.sampleCount,
        },
      })
      updated++
    } else {
      await prisma.taskTimeBaseline.create({
        data: {
          taskName:        g.taskName,
          vehicleBrand:    g.vehicleBrand,
          vehicleModel:    g.vehicleModel,
          estimatedMinutes: g.avgMinutes,
          sampleCount:     g.sampleCount,
        },
      })
      created++
    }
  }

  console.log(`[estimates] Procesados: ${groups.length} grupos | Creados: ${created} | Actualizados: ${updated}`)
  return { processed: groups.length, created, updated }
}
