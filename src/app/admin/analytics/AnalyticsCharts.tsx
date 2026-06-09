'use client'

import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

// ── Tipos ─────────────────────────────────────────────────────────────────
export interface MonthlyRevenue { month: string; label: string; revenue: number; count: number }
export interface DailyOrders    { date: string;  label: string; count: number }
export interface TopService     { name: string;  count: number; revenue: number }
export interface StatusDist     { status: string; label: string; count: number; color: string }
export interface MechanicStat   { id: string; name: string; assigned: number; completed: number; avgNps: number | null }

interface Props {
  monthly:   MonthlyRevenue[]
  daily:     DailyOrders[]
  services:  TopService[]
  statuses:  StatusDist[]
  mechanics: MechanicStat[]
  totalRevenue: number
  totalCompleted: number
  avgTicket: number
}

// ── Helpers ───────────────────────────────────────────────────────────────
const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const pct = (n: number, t: number) => t > 0 ? Math.round(n / t * 100) : 0

const CustomTooltip = ({ active, payload, label, currency }: {
  active?: boolean; payload?: {value: number}[]; label?: string; currency?: boolean
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-steel-800 border border-steel-600 rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="text-white font-bold">{currency ? fmt(payload[0].value) : payload[0].value}</p>
    </div>
  )
}

export function AnalyticsCharts({ monthly, daily, services, statuses, mechanics, totalRevenue, totalCompleted, avgTicket }: Props) {
  const maxService = Math.max(...services.map(s => s.count), 1)

  return (
    <div className="space-y-6">

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Facturación total',    value: fmt(totalRevenue),                 sub: 'últimos 6 meses',  color: 'text-brand' },
          { label: 'Servicios completados', value: totalCompleted,                    sub: 'últimos 6 meses' },
          { label: 'Ticket promedio',       value: fmt(avgTicket),                    sub: 'por OT completada' },
        ].map(k => (
          <div key={k.label} className="bg-steel-800 border border-steel-600 rounded-xl p-5">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">{k.label}</p>
            <p className={`font-display font-bold text-3xl leading-none ${k.color ?? 'text-white'}`}>{k.value}</p>
            <p className="text-gray-600 text-xs mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Revenue mensual ───────────────────────────────────────────────── */}
      <div className="bg-steel-800 border border-steel-600 rounded-xl p-5">
        <p className="text-brand text-xs font-bold uppercase tracking-wider mb-5">Facturación mensual</p>
        {monthly.length === 0 ? (
          <p className="text-gray-600 text-sm py-8 text-center">Sin datos todavía</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#718096', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fill: '#718096', fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<CustomTooltip currency />} />
              <Bar dataKey="revenue" fill="#f59e0b" radius={[4,4,0,0]}>
                {monthly.map((_, i) => (
                  <Cell key={i} fill={i === monthly.length - 1 ? '#f59e0b' : '#78350f'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Grid: Órdenes diarias + Top servicios ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Órdenes por día (últimos 30d) */}
        <div className="bg-steel-800 border border-steel-600 rounded-xl p-5">
          <p className="text-brand text-xs font-bold uppercase tracking-wider mb-5">Órdenes por día — últimos 30 días</p>
          {daily.length === 0 ? (
            <p className="text-gray-600 text-sm py-8 text-center">Sin datos todavía</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#718096', fontSize: 10 }} axisLine={false} tickLine={false}
                  interval={Math.floor(daily.length / 6)} />
                <YAxis allowDecimals={false} tick={{ fill: '#718096', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top servicios */}
        <div className="bg-steel-800 border border-steel-600 rounded-xl p-5">
          <p className="text-brand text-xs font-bold uppercase tracking-wider mb-4">Top servicios solicitados</p>
          {services.length === 0 ? (
            <p className="text-gray-600 text-sm py-8 text-center">Sin datos todavía</p>
          ) : (
            <div className="space-y-3">
              {services.map((s, i) => (
                <div key={s.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300 truncate flex-1 pr-2">{i + 1}. {s.name}</span>
                    <span className="text-gray-500 shrink-0">{s.count}x · {fmt(s.revenue)}</span>
                  </div>
                  <div className="h-1.5 bg-steel-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${pct(s.count, maxService)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Grid: Distribución de estados + Mecánicos ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Distribución por estado */}
        <div className="bg-steel-800 border border-steel-600 rounded-xl p-5">
          <p className="text-brand text-xs font-bold uppercase tracking-wider mb-4">Distribución de estados</p>
          {statuses.every(s => s.count === 0) ? (
            <p className="text-gray-600 text-sm py-8 text-center">Sin órdenes todavía</p>
          ) : (
            <div className="space-y-3">
              {statuses.filter(s => s.count > 0).map(s => {
                const total = statuses.reduce((a, b) => a + b.count, 0)
                return (
                  <div key={s.status} className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.color}`} />
                    <span className="text-gray-400 text-xs flex-1">{s.label}</span>
                    <div className="flex items-center gap-2 w-40">
                      <div className="flex-1 h-1.5 bg-steel-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${s.color}`}
                          style={{ width: `${pct(s.count, total)}%` }} />
                      </div>
                      <span className="text-white text-xs font-bold w-5 text-right">{s.count}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Performance por mecánico */}
        <div className="bg-steel-800 border border-steel-600 rounded-xl p-5">
          <p className="text-brand text-xs font-bold uppercase tracking-wider mb-4">Performance mecánicos</p>
          {mechanics.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-600 text-sm">Sin mecánicos registrados.</p>
              <a href="/admin/mecanicos" className="text-brand text-xs mt-1 inline-block hover:underline">
                + Crear mecánico →
              </a>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-600 text-xs uppercase">
                  <th className="text-left pb-2">Mecánico</th>
                  <th className="text-center pb-2">Asignadas</th>
                  <th className="text-center pb-2">Completadas</th>
                  <th className="text-center pb-2">NPS prom.</th>
                </tr>
              </thead>
              <tbody>
                {mechanics.map(m => (
                  <tr key={m.id} className="border-t border-steel-700">
                    <td className="py-2.5 text-white font-medium">{m.name}</td>
                    <td className="py-2.5 text-center text-gray-400">{m.assigned}</td>
                    <td className="py-2.5 text-center">
                      <span className={m.completed > 0 ? 'text-green-400 font-bold' : 'text-gray-600'}>
                        {m.completed}
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      {m.avgNps !== null ? (
                        <span className={`font-bold ${m.avgNps >= 9 ? 'text-green-400' : m.avgNps >= 7 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {m.avgNps.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
