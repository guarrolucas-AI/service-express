/**
 * POST /api/webhooks/mercadopago
 *
 * Receptor de notificaciones de MercadoPago (IPN / Webhooks).
 * Verifica la firma x-signature antes de procesar.
 *
 * Flujo:
 *   1. Validar firma HMAC-SHA256
 *   2. Si type = "payment" y action contiene "approved" → confirmPayment()
 *   3. Responder 200 rápido (MP reintenta si no recibe 200 en < 500ms)
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { mpPlatformClient } from '@/lib/mercadopago'
import { confirmPayment } from '@/services/payment.service'
import type { MpWebhookBody } from '@/types'

// ─── Validación de firma MP ───────────────────────────────────────────────────

function verifyMpSignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return true // Si no hay secret configurado, skip en dev

  const signatureHeader = req.headers.get('x-signature')
  const requestId = req.headers.get('x-request-id')
  if (!signatureHeader) return false

  // Formato: ts=<timestamp>,v1=<hash>
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => p.split('=')),
  )
  const ts  = parts['ts']
  const v1  = parts['v1']
  if (!ts || !v1) return false

  const manifest = `id:${JSON.parse(rawBody)?.data?.id};request-id:${requestId};ts:${ts};`
  const expected = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex')

  return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected))
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // Verificar firma
  if (!verifyMpSignature(req, rawBody)) {
    console.warn('[webhook/mp] Firma inválida — request rechazado.')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: MpWebhookBody
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // MP envía múltiples tipos de eventos; sólo nos interesan pagos
  if (body.type !== 'payment') {
    return NextResponse.json({ received: true })
  }

  const mpPaymentId = String(body.data?.id)

  // Procesar en background para responder rápido a MP
  processPayment(mpPaymentId).catch((err) =>
    console.error(`[webhook/mp] Error procesando pago ${mpPaymentId}:`, err),
  )

  // Responder 200 inmediatamente
  return NextResponse.json({ received: true })
}

async function processPayment(mpPaymentId: string) {
  const { Payment } = await import('mercadopago')
  const payment = new Payment(mpPlatformClient)

  let paymentData: Awaited<ReturnType<typeof payment.get>>
  try {
    paymentData = await payment.get({ id: mpPaymentId })
  } catch (err) {
    console.error(`[webhook/mp] No se pudo obtener pago ${mpPaymentId}:`, err)
    return
  }

  const status = paymentData.status
  const externalRef = paymentData.external_reference

  if (!externalRef) {
    console.warn(`[webhook/mp] Pago ${mpPaymentId} sin external_reference`)
    return
  }

  if (status === 'approved') {
    try {
      await confirmPayment(mpPaymentId, externalRef)
      console.log(`[webhook/mp] Pago ${mpPaymentId} confirmado → OT ${externalRef}`)
    } catch (err) {
      console.error(`[webhook/mp] Error confirmando OT ${externalRef}:`, err)
    }
    return
  }

  if (status === 'rejected' || status === 'cancelled') {
    // Registrar el intento fallido para diagnóstico
    await prisma.workOrder.updateMany({
      where: { id: externalRef, paymentStatus: { not: 'APPROVED' } },
      data: { paymentStatus: 'REJECTED' },
    })
    console.warn(`[webhook/mp] Pago ${mpPaymentId} ${status} → OT ${externalRef}`)
  }
}
