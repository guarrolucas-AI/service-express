import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Express Service — Taller Mecánico',
  description: 'Reservá tu turno online. Presupuesto exacto, seguimiento en tiempo real e informe técnico al finalizar.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
