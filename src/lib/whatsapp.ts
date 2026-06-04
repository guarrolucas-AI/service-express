import axios from 'axios'

const WA_BASE = 'https://graph.facebook.com/v19.0'
const PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID!
const TOKEN = process.env.WA_API_TOKEN!

/** Nombres de templates aprobados en Meta Business */
export const WA_TEMPLATES = {
  BOOKING_CONFIRMED: 'turno_confirmado',
  QUALITY_CONTROL:   'vehiculo_en_control_calidad',
  WORK_COMPLETED:    'trabajo_finalizado',
  PREDICTIVE_ALERT:  'alerta_mantenimiento_predictivo',
  PAYMENT_LINK:      'link_de_pago',
} as const

type TemplateComponent = {
  type: 'header' | 'body' | 'button'
  parameters: Array<{ type: 'text'; text: string } | { type: 'document'; document: { link: string; filename: string } }>
}

interface SendTemplateOptions {
  to: string          // Número en formato internacional sin + (ej: "5491166614164")
  templateName: string
  languageCode?: string
  components?: TemplateComponent[]
}

export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode = 'es_AR',
  components = [],
}: SendTemplateOptions): Promise<{ messageId: string }> {
  const phone = to.replace(/\D/g, '').replace(/^0/, '54')

  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: components.length ? components : undefined,
    },
  }

  const { data } = await axios.post(
    `${WA_BASE}/${PHONE_NUMBER_ID}/messages`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    },
  )

  return { messageId: data.messages?.[0]?.id ?? '' }
}

/** Helpers de alto nivel para cada evento del negocio */
export const whatsapp = {
  async bookingConfirmed(phone: string, opts: {
    clientName: string
    workshopName: string
    date: string
    time: string
    service: string
  }) {
    return sendWhatsAppTemplate({
      to: phone,
      templateName: WA_TEMPLATES.BOOKING_CONFIRMED,
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: opts.clientName },
          { type: 'text', text: opts.service },
          { type: 'text', text: opts.workshopName },
          { type: 'text', text: opts.date },
          { type: 'text', text: opts.time },
        ],
      }],
    })
  },

  async vehicleInQualityControl(phone: string, opts: {
    clientName: string
    workshopName: string
  }) {
    return sendWhatsAppTemplate({
      to: phone,
      templateName: WA_TEMPLATES.QUALITY_CONTROL,
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: opts.clientName },
          { type: 'text', text: opts.workshopName },
        ],
      }],
    })
  },

  async workCompleted(phone: string, opts: {
    clientName: string
    reportUrl: string
  }) {
    return sendWhatsAppTemplate({
      to: phone,
      templateName: WA_TEMPLATES.WORK_COMPLETED,
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: opts.clientName }],
        },
        {
          type: 'button',
          parameters: [{ type: 'text', text: opts.reportUrl }],
        },
      ],
    })
  },

  async predictiveAlert(phone: string, opts: {
    clientName: string
    component: string
    monthsUntilCritical: number
    vehiclePlate: string
  }) {
    return sendWhatsAppTemplate({
      to: phone,
      templateName: WA_TEMPLATES.PREDICTIVE_ALERT,
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: opts.clientName },
          { type: 'text', text: opts.vehiclePlate },
          { type: 'text', text: opts.component },
          { type: 'text', text: String(opts.monthsUntilCritical) },
        ],
      }],
    })
  },

  async paymentLink(phone: string, opts: {
    clientName: string
    service: string
    amount: string
    paymentUrl: string
  }) {
    return sendWhatsAppTemplate({
      to: phone,
      templateName: WA_TEMPLATES.PAYMENT_LINK,
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: opts.clientName },
          { type: 'text', text: opts.service },
          { type: 'text', text: opts.amount },
          { type: 'text', text: opts.paymentUrl },
        ],
      }],
    })
  },
}
