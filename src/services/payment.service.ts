/**
 * payment.service.ts
 *
 * Lógica de negocio para:
 *   1. Resolución de repuestos por vehículo
 *   2. Creación de preferencia MP con split (repuestos → nosotros, mano de obra → taller)
 *   3. Confirmación de pago y asignación de stock
 *   4. Flujo de excepción (pendiente_cotizacion)
 */

import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/db'
import { Preference, mpPlatformClient, MP_CONSTANTS } from '@/lib/mercadopago'
import { whatsapp } from '@/lib/whatsapp'
import { AppError, NotFoundError, PaymentError } from '@/lib/errors'
import type { CheckoutItem, SplitBreakdown } from '@/types'

// ─── 1. Resolución de repuestos ───────────────────────────────────────────────

interface ResolvedItem {
  taskName: string
  sparePartId?: string
  estimatedMinutes?: number
  quantity: number
  laborPrice: number
  partPrice: number
  hasCompatiblePart: boolean
}

/**
 * Para cada item del checkout busca si existe un repuesto compatible con el vehículo.
 * Retorna flag `allResolved = false` si alguno no tiene mapeo → activa flujo de excepción.
 */
export async function resolveItems(
  items: CheckoutItem[],
  vehicleId: string,
): Promise<{ resolved: ResolvedItem[]; allResolved: boolean }> {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } })
  if (!vehicle) throw new NotFoundError('Vehículo')

  const resolved: ResolvedItem[] = []
  let allResolved = true

  for (const item of items) {
    let sparePartId: string | undefined
    let partPrice = 0
    let hasCompatiblePart = false

    if (item.sparePartSku) {
      const part = await prisma.sparePart.findUnique({
        where: { sku: item.sparePartSku },
      })

      if (part && part.stock > 0) {
        const compat = part.compatibility as Array<{
          brand: string; model: string; yearFrom: number; yearTo: number; engine?: string
        }>

        const isCompatible = compat.length === 0 || compat.some(
          (c) =>
            c.brand.toLowerCase() === vehicle.brand.toLowerCase() &&
            c.model.toLowerCase() === vehicle.model.toLowerCase() &&
            vehicle.year >= c.yearFrom &&
            vehicle.year <= c.yearTo &&
            (!c.engine || c.engine.toLowerCase() === vehicle.engine.toLowerCase()),
        )

        if (isCompatible) {
          sparePartId = part.id
          partPrice = Number(part.salePrice)
          hasCompatiblePart = true
        }
      }

      if (!hasCompatiblePart) allResolved = false
    }

    // Precio de mano de obra: buscar en baseline o usar valor default
    const baseline = await prisma.taskTimeBaseline.findFirst({
      where: {
        taskName: item.taskName,
        OR: [
          { vehicleBrand: vehicle.brand, vehicleModel: vehicle.model },
          { vehicleBrand: '*', vehicleModel: '*' },
        ],
      },
      orderBy: { sampleCount: 'desc' },
    })

    const estimatedMin = item.estimatedMinutes ?? baseline?.estimatedMinutes ?? 60
    // Precio mano de obra: $X por minuto (configurar por ENV o tabla)
    const laborRatePerMin = Number(process.env.LABOR_RATE_PER_MINUTE ?? 400) // ARS/min
    const laborPrice = estimatedMin * laborRatePerMin

    resolved.push({
      taskName: item.taskName,
      sparePartId,
      estimatedMinutes: estimatedMin,
      quantity: item.quantity ?? 1,
      laborPrice,
      partPrice,
      hasCompatiblePart: !item.sparePartSku || hasCompatiblePart,
    })
  }

  return { resolved, allResolved }
}

// ─── 2. Cálculo del split ─────────────────────────────────────────────────────

export function calculateSplit(resolved: ResolvedItem[]): SplitBreakdown {
  const partsAmount = resolved.reduce((s, i) => s + i.partPrice * i.quantity, 0)
  const laborAmount = resolved.reduce((s, i) => s + i.laborPrice * i.quantity, 0)
  const platformFee = Math.round(laborAmount * MP_CONSTANTS.PLATFORM_FEE_PCT * 100) / 100
  const workshopPayout = Math.round((laborAmount - platformFee) * 100) / 100
  const total = Math.round((partsAmount + laborAmount) * 100) / 100

  return { partsAmount, laborAmount, platformFee, workshopPayout, total }
}

// ─── 3. Crear preferencia de pago con split ───────────────────────────────────

/**
 * Split en MercadoPago Marketplace:
 *   - El taller es el "collector" (recibe el pago principal)
 *   - La `marketplace_fee` cubre repuestos + comisión de plataforma
 *   - El taller recibe neto: laborAmount - platformFee
 *
 * Para que esto funcione, el taller debe haber vinculado su cuenta MP via OAuth.
 */
export async function createPaymentPreference(workOrderId: string) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      orderItems: { include: { sparePart: true } },
      workshop: true,
      user: true,
      vehicle: true,
    },
  })

  if (!workOrder) throw new NotFoundError('Orden de trabajo')
  if (!workOrder.workshop.mpAccountId) {
    throw new PaymentError(
      'El taller no tiene cuenta de MercadoPago vinculada. Contactar al administrador.',
    )
  }

  const split = calculateSplit(
    workOrder.orderItems.map((i) => ({
      taskName: i.taskName,
      quantity: i.quantity,
      laborPrice: Number(i.laborPrice ?? 0),
      partPrice: Number(i.partPrice ?? 0),
      hasCompatiblePart: true,
    })),
  )

  // marketplace_fee = lo que recibe la plataforma (parts + comisión)
  const marketplaceFee = Math.round((split.partsAmount + split.platformFee) * 100) / 100

  const preference = new Preference(mpPlatformClient)

  const result = await preference.create({
    body: {
      items: [
        {
          id: `parts-${workOrderId}`,
          title: `Repuestos — Orden ${workOrderId.slice(-8).toUpperCase()}`,
          quantity: 1,
          unit_price: split.partsAmount,
          currency_id: MP_CONSTANTS.CURRENCY,
        },
        {
          id: `labor-${workOrderId}`,
          title: `Mano de obra — ${workOrder.vehicle.brand} ${workOrder.vehicle.model}`,
          quantity: 1,
          unit_price: split.laborAmount,
          currency_id: MP_CONSTANTS.CURRENCY,
        },
      ],
      // El collector es el taller; la marketplace_fee es lo que retiene la plataforma
      marketplace: MP_CONSTANTS.MARKETPLACE_ID,
      marketplace_fee: marketplaceFee,
      payer: {
        name: workOrder.user.firstName,
        surname: workOrder.user.lastName,
        email: workOrder.user.email,
        phone: workOrder.user.phone
          ? { area_code: '11', number: workOrder.user.phone.replace(/\D/g, '') }
          : undefined,
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/reserva/confirmada?wo=${workOrderId}`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/reserva/error?wo=${workOrderId}`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/reserva/pendiente?wo=${workOrderId}`,
      },
      auto_return: 'approved',
      notification_url: MP_CONSTANTS.NOTIFICATION_URL,
      external_reference: workOrderId,
      expires: true,
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      statement_descriptor: 'SERVICE EXPRESS',
    },
  })

  // Persistir datos del split y el preference ID
  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: {
      mpPreferenceId: result.id,
      totalAmount: new Decimal(split.total),
      partsAmount: new Decimal(split.partsAmount),
      laborAmount: new Decimal(split.laborAmount),
      platformFee: new Decimal(split.platformFee),
      workshopPayout: new Decimal(split.workshopPayout),
    },
  })

  return {
    preferenceId: result.id,
    initPoint: result.init_point,
    sandboxInitPoint: result.sandbox_init_point,
    split,
  }
}

// ─── 4. Confirmar pago (llamado desde webhook) ────────────────────────────────

export async function confirmPayment(mpPaymentId: string, externalReference: string) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: externalReference },
    include: {
      orderItems: { include: { sparePart: true } },
      appointment: true,
      user: true,
      workshop: true,
      vehicle: true,
    },
  })

  if (!workOrder) throw new NotFoundError('Orden de trabajo')

  // Actualizar orden y turno
  await prisma.$transaction(async (tx) => {
    // 1. Marcar pago como aprobado
    await tx.workOrder.update({
      where: { id: workOrder.id },
      data: {
        mpPaymentId,
        paymentStatus: 'APPROVED',
        status: 'READY_FOR_APPOINTMENT',
        paidAt: new Date(),
      },
    })

    // 2. Confirmar turno
    await tx.appointment.update({
      where: { id: workOrder.appointmentId },
      data: { status: 'CONFIRMED' },
    })

    // 3. Decrementar stock de cada repuesto
    for (const item of workOrder.orderItems) {
      if (item.sparePartId) {
        await tx.sparePart.update({
          where: { id: item.sparePartId },
          data: { stock: { decrement: item.quantity } },
        })
      }
    }
  })

  // 4. Notificar al cliente por WhatsApp
  const appt = workOrder.appointment
  const scheduledAt = new Date(appt.scheduledAt)
  await whatsapp.bookingConfirmed(workOrder.user.phone ?? workOrder.user.email, {
    clientName: workOrder.user.firstName,
    workshopName: workOrder.workshop.name,
    date: scheduledAt.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }),
    time: scheduledAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    service: workOrder.orderItems.map((i) => i.taskName).join(', '),
  })

  return { confirmed: true }
}

// ─── 5. Flujo de excepción: orden sin cotización ──────────────────────────────

export async function suspendForManualQuote(workOrderId: string, missingSkus: string[]) {
  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: { status: 'PENDING_QUOTE' },
  })

  // Alerta al backoffice (webhook interno)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const adminWebhookUrl = process.env.ADMIN_ALERT_WEBHOOK_URL

  if (adminWebhookUrl) {
    try {
      await fetch(adminWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PENDING_QUOTE',
          workOrderId,
          missingSkus,
          timestamp: new Date().toISOString(),
          backofficeUrl: `${appUrl}/admin/orders/${workOrderId}/quote`,
        }),
      })
    } catch {
      console.error('[alert] Fallo envío de webhook al backoffice')
    }
  }

  return { suspended: true, reason: 'PENDING_QUOTE', missingSkus }
}

/**
 * Llamado desde el backoffice cuando el admin cargó el precio manual.
 * Recalcula el split y envía el link de pago al cliente por WhatsApp.
 */
export async function activateManualQuote(workOrderId: string, manualAmounts: {
  partsAmount: number
  laborAmount: number
}) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: { user: true },
  })
  if (!workOrder) throw new NotFoundError('Orden de trabajo')

  const platformFee = manualAmounts.laborAmount * MP_CONSTANTS.PLATFORM_FEE_PCT
  const workshopPayout = manualAmounts.laborAmount - platformFee
  const total = manualAmounts.partsAmount + manualAmounts.laborAmount

  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: {
      partsAmount: new Decimal(manualAmounts.partsAmount),
      laborAmount: new Decimal(manualAmounts.laborAmount),
      platformFee: new Decimal(platformFee),
      workshopPayout: new Decimal(workshopPayout),
      totalAmount: new Decimal(total),
      status: 'PENDING_PART',
    },
  })

  // Crear preferencia y enviar link al cliente
  const { initPoint } = await createPaymentPreference(workOrderId)

  await whatsapp.paymentLink(workOrder.user.phone ?? workOrder.user.email, {
    clientName: workOrder.user.firstName,
    service: 'Servicio mecánico',
    amount: `$${total.toLocaleString('es-AR')}`,
    paymentUrl: initPoint!,
  })

  return { activated: true, paymentUrl: initPoint }
}
