import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'

export const metadata: Metadata = {
  title: 'Express Service — Taller Mecánico',
  description: 'Reservá tu turno online. Presupuesto exacto, seguimiento en tiempo real e informe técnico al finalizar.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable:         true,
    statusBarStyle:  'black-translucent',
    title:           'Express Service',
  },
  icons: {
    icon:      [{ url: '/icons/192', sizes: '192x192', type: 'image/png' }],
    shortcut:  '/icons/192',
    apple:     [{ url: '/icons/apple', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor:    '#f59e0b',
  width:         'device-width',
  initialScale:  1,
  maximumScale:  1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
