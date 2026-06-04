import { MercadoPagoConfig, Preference, Payment, OAuth } from 'mercadopago'

/** Cliente principal de la plataforma (marketplace owner) */
export const mpPlatformClient = new MercadoPagoConfig({
  accessToken: process.env.MP_PLATFORM_ACCESS_TOKEN!,
  options: { timeout: 10_000 },
})

/** Construye un cliente MP con el access_token del taller */
export function buildWorkshopClient(workshopAccessToken: string) {
  return new MercadoPagoConfig({
    accessToken: workshopAccessToken,
    options: { timeout: 10_000 },
  })
}

export { Preference, Payment, OAuth }

/** Constantes de negocio */
export const MP_CONSTANTS = {
  PLATFORM_FEE_PCT: 0.12,        // 12% comisión de plataforma sobre mano de obra
  MARKETPLACE_ID: process.env.MP_MARKETPLACE_ID!,
  NOTIFICATION_URL: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
  CURRENCY: 'ARS',
}
