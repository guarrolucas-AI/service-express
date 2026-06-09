import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Express Service — Panel Interno',
  description: 'Sistema de gestión de órdenes de trabajo',
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
