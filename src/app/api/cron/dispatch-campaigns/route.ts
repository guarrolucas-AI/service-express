/**
 * GET /api/cron/dispatch-campaigns
 *
 * Vercel Cron Job — se ejecuta cada hora.
 * Despacha las campañas de WhatsApp programadas para la ventana actual.
 *
 * Protegido por CRON_SECRET (Vercel lo inyecta automáticamente en producción).
 */

import { NextRequest, NextResponse } from 'next/server'
import { dispatchScheduledCampaigns } from '@/services/predictive.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60  // segundos

export async function GET(req: NextRequest) {
  // Verificar que el llamado viene de Vercel Cron o del token interno
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await dispatchScheduledCampaigns()
    console.log(`[cron/campaigns] Enviadas: ${result.sent}`)
    return NextResponse.json({ ok: true, data: result })
  } catch (err) {
    console.error('[cron/campaigns] Error:', err)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}
