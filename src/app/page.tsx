/**
 * / — Landing pública de Express Service
 * Mobile-first · mismo design system ES
 */

import Link from 'next/link'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 300  // refresca cada 5 min (score puede cambiar)

// ─── Datos del taller ──────────────────────────────────────────────────────────

async function getWorkshopStats() {
  const ws = await prisma.workshop.findFirst({
    where: { isActive: true },
    select: { score: true, npsAverage: true, totalServices: true, name: true, address: true, phone: true },
  })
  return ws
}

// ─── Contenido ─────────────────────────────────────────────────────────────────

const SERVICES = [
  { icon: '🛢️', name: 'Cambio de aceite',        desc: 'Aceite + filtro',              price: 'desde $15.000', time: '45 min' },
  { icon: '🔴', name: 'Frenos',                   desc: 'Revisión y cambio de pastillas', price: 'desde $35.000', time: '90 min' },
  { icon: '🔧', name: 'Service tipo A',            desc: '30.000 km — completo',          price: '$45.000',       time: '2 hs'   },
  { icon: '⚙️', name: 'Service tipo B',            desc: '60.000 km — completo',          price: '$80.000',       time: '3 hs'   },
  { icon: '🎯', name: 'Alineación y balanceo',     desc: 'Precisión al centímetro',       price: '$12.000',       time: '1 hs'   },
  { icon: '💻', name: 'Diagnóstico electrónico',   desc: 'Escaneo OBD full',              price: '$10.000',       time: '1 hs'   },
  { icon: '🚗', name: 'Suspensión',                desc: 'Amortiguadores y dirección',    price: 'desde $25.000', time: '90 min' },
  { icon: '⏱️', name: 'Distribución',              desc: 'Correa / cadena + bomba agua',  price: 'desde $65.000', time: '4 hs'   },
]

const STEPS = [
  {
    n: '01',
    title: 'Reservá tu turno',
    desc: 'Completá el formulario en 2 minutos. Sin llamadas, sin esperas.',
    icon: '📅',
  },
  {
    n: '02',
    title: 'Llevá tu auto',
    desc: 'El mecánico hace el check-in con fotos y te manda el presupuesto exacto por WhatsApp.',
    icon: '🚗',
  },
  {
    n: '03',
    title: 'Seguí el trabajo',
    desc: 'Rastreá el estado en tiempo real desde tu teléfono. Recibís el informe técnico al finalizar.',
    icon: '📱',
  },
]

const BENEFITS = [
  {
    icon: '🔍',
    title: 'Transparencia total',
    desc: 'Fotos del vehículo al ingreso, checklist de inspección y precios cerrados antes de empezar.',
  },
  {
    icon: '📡',
    title: 'Seguimiento en tiempo real',
    desc: 'Sabés exactamente en qué etapa está tu auto — sin llamar, sin esperar.',
  },
  {
    icon: '🤖',
    title: 'Mantenimiento predictivo',
    desc: 'Te avisamos antes de que algo falle. Calculamos cuándo necesitarás pastillas o neumáticos.',
  },
  {
    icon: '💰',
    title: 'Precio sin sorpresas',
    desc: 'El presupuesto se aprueba antes de cualquier trabajo. Pagás solo lo acordado.',
  },
]

// ─── Componentes ───────────────────────────────────────────────────────────────

function StarRating({ score }: { score: number }) {
  // score es 0-100; convertir a 0-5
  const stars = score / 20
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`text-sm ${i <= Math.round(stars) ? 'text-brand' : 'text-steel-600'}`}>
          ★
        </span>
      ))}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  const ws = await getWorkshopStats()

  return (
    <div className="min-h-screen bg-steel-900 text-gray-100 font-body">

      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-steel-900/95 backdrop-blur border-b border-steel-700/60 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-display font-black text-brand text-xl tracking-widest">
            EXPRESS SERVICE
          </span>
          <div className="flex gap-2">
            <Link
              href="/cliente"
              className="text-xs text-gray-400 hover:text-white border border-steel-600 hover:border-steel-400 rounded-lg px-3 py-2 transition-colors"
            >
              Rastrear orden
            </Link>
            <Link
              href="/reservar"
              className="text-xs bg-brand text-black font-bold rounded-lg px-4 py-2 hover:bg-yellow-400 transition-colors"
            >
              Reservar →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="px-4 pt-16 pb-14 max-w-5xl mx-auto text-center">

        {/* Score badge */}
        {ws && (
          <div className="inline-flex items-center gap-2.5 bg-steel-800 border border-steel-600 rounded-full px-4 py-2 mb-8">
            <StarRating score={ws.score} />
            <span className="text-white font-bold text-sm">{(ws.score / 20).toFixed(1)}</span>
            <span className="text-gray-500 text-xs">·</span>
            <span className="text-gray-400 text-xs">{ws.totalServices}+ servicios realizados</span>
          </div>
        )}

        <h1 className="font-display font-black text-5xl sm:text-6xl leading-none text-white mb-4 tracking-tight">
          Tu auto,<br />
          <span className="text-brand">sin sorpresas.</span>
        </h1>

        <p className="text-gray-400 text-lg max-w-md mx-auto mb-10">
          Presupuesto exacto antes de empezar. Seguimiento en tiempo real.
          Informe técnico al finalizar.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/reservar"
            className="bg-brand text-black font-display font-bold text-lg px-8 py-4 rounded-2xl hover:bg-yellow-400 active:scale-95 transition-all"
          >
            Reservar turno gratis
          </Link>
          <Link
            href="/cliente"
            className="border border-steel-500 text-gray-300 hover:border-brand hover:text-white font-bold text-base px-8 py-4 rounded-2xl transition-all"
          >
            Rastrear mi orden →
          </Link>
        </div>

        {ws && (
          <p className="text-gray-600 text-sm mt-6">
            {ws.name} · {ws.address}
          </p>
        )}
      </section>

      {/* ── CÓMO FUNCIONA ───────────────────────────────────────────────────── */}
      <section className="bg-steel-800/50 border-y border-steel-700/50 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-brand text-xs font-bold uppercase tracking-widest mb-2">Así funciona</p>
          <h2 className="text-center text-white font-display font-bold text-3xl mb-12">
            3 pasos, sin complicaciones
          </h2>

          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.n} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand/10 border border-brand/30 text-3xl mb-5">
                  {step.icon}
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-brand font-display font-black text-sm">{step.n}</span>
                  <h3 className="text-white font-bold text-lg">{step.title}</h3>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICIOS ───────────────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-brand text-xs font-bold uppercase tracking-widest mb-2">Servicios</p>
          <h2 className="text-center text-white font-display font-bold text-3xl mb-4">
            ¿Qué necesita tu auto?
          </h2>
          <p className="text-center text-gray-500 text-sm mb-12">
            Seleccioná cuando reserves — el presupuesto final se confirma después de la inspección.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SERVICES.map((svc) => (
              <Link
                key={svc.name}
                href="/reservar"
                className="group bg-steel-800 border border-steel-600 hover:border-brand rounded-2xl p-5 transition-all hover:bg-steel-700/50"
              >
                <span className="text-3xl block mb-3">{svc.icon}</span>
                <h3 className="text-white font-bold text-sm leading-tight mb-1 group-hover:text-brand transition-colors">
                  {svc.name}
                </h3>
                <p className="text-gray-500 text-xs mb-4">{svc.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-brand font-bold text-sm">{svc.price}</span>
                  <span className="text-gray-600 text-xs">{svc.time}</span>
                </div>
              </Link>
            ))}
          </div>

          <p className="text-center text-gray-600 text-xs mt-6">
            * Los precios son estimativos. El precio final se confirma con el presupuesto aprobado.
          </p>
        </div>
      </section>

      {/* ── BENEFICIOS ──────────────────────────────────────────────────────── */}
      <section className="bg-steel-800/50 border-y border-steel-700/50 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-brand text-xs font-bold uppercase tracking-widest mb-2">¿Por qué nosotros?</p>
          <h2 className="text-center text-white font-display font-bold text-3xl mb-12">
            El taller que trabaja con vos
          </h2>

          <div className="grid sm:grid-cols-2 gap-6">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex gap-4 bg-steel-800 border border-steel-700 rounded-2xl p-5">
                <span className="text-3xl shrink-0">{b.icon}</span>
                <div>
                  <h3 className="text-white font-bold mb-1">{b.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="font-display font-black text-4xl text-white mb-4">
            ¿Listo para agendar?
          </h2>
          <p className="text-gray-400 mb-8">
            Reservá en menos de 2 minutos. Sin tarjeta, sin compromiso.
          </p>
          <Link
            href="/reservar"
            className="inline-block bg-brand text-black font-display font-bold text-xl px-10 py-5 rounded-2xl hover:bg-yellow-400 active:scale-95 transition-all"
          >
            Reservar mi turno →
          </Link>
          {ws?.phone && (
            <p className="text-gray-600 text-sm mt-6">
              ¿Preferís llamar?{' '}
              <a href={`tel:${ws.phone}`} className="text-brand hover:underline">
                {ws.phone}
              </a>
            </p>
          )}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-steel-700 bg-steel-900 px-4 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-display font-black text-brand text-lg tracking-widest">EXPRESS SERVICE</p>
            {ws && <p className="text-gray-600 text-xs mt-0.5">{ws.address}</p>}
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-600">
            <Link href="/cliente" className="hover:text-gray-400 transition-colors">
              Rastrear orden
            </Link>
            <Link href="/reservar" className="hover:text-gray-400 transition-colors">
              Reservar turno
            </Link>
            <span className="text-steel-700">·</span>
            {/* Accesos staff — redirigen a login */}
            <Link href="/admin" className="hover:text-gray-500 transition-colors">
              Admin
            </Link>
            <Link href="/mecanico" className="hover:text-gray-500 transition-colors">
              Mecánico
            </Link>
          </div>
        </div>
        <p className="text-center text-gray-800 text-xs mt-6">
          © {new Date().getFullYear()} Express Service · Sistema de gestión v3.0
        </p>
      </footer>

    </div>
  )
}
