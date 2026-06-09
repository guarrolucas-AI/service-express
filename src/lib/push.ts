/**
 * Utilidad para enviar Web Push a un usuario
 */

import webpush from 'web-push'
import { prisma } from './db'

// VAPID — generados una vez, cambiar en producción real
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  ?? 'BNGtERobVCya73TR_hBddo5WdeynJfcxnWm3jPelJVSVJpiGZb2Omc7VUoTvSuzwY2Ku90INR3uP8Z3kkLqE_po'
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? 'iCMLMU0nM3Yn4sy9TnYZoHpXCSI7zBX7rU-02fohPyk'
const VAPID_EMAIL   = process.env.VAPID_EMAIL       ?? 'mailto:admin@express-service.app'

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)

export { VAPID_PUBLIC }

export interface PushPayload {
  title: string
  body:  string
  url:   string
  tag?:  string
}

/**
 * Envía una notificación push a todas las suscripciones de un usuario.
 * Elimina automáticamente las suscripciones expiradas.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (!subs.length) return

  const expired: string[] = []

  await Promise.allSettled(
    subs.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 86400 }  // 24h
        )
      } catch (err: unknown) {
        // 410 Gone = suscripción expirada o cancelada por el usuario
        if ((err as { statusCode?: number }).statusCode === 410) {
          expired.push(sub.id)
        }
      }
    })
  )

  if (expired.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expired } } })
  }
}
