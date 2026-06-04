/**
 * /admin/orden/[id] — Detalle de OT para el backoffice
 */

import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }

const SEMA: Record<string, string> = { GREEN: '🟢', YELLOW: '🟡', RED: '🔴' }

export default async function AdminOrderPage({ params }: { params: { id: string } }) {
  const wo = await prisma.workOrder.findUnique({
    where: { id: params.id },
    include: {
      user:       true,
      vehicle:    true,
      workshop:   true,
      checklist:  true,
      orderItems: { orderBy: { createdAt: 'asc' } },
      appointment: true,
    },
  })
  if (!wo) notFound()

  const totalLabor = wo.orderItems.reduce((s, i) => s + Number(i.laborPrice ?? 0) * i.quantity, 0)
  const totalParts = wo.orderItems.reduce((s, i) => s + Number(i.partPrice  ?? 0) * i.quantity, 0)

  return (
    <div className="min-h-screen bg-steel-900 text-gray-100 font-body">
      <header className="bg-steel-800 border-b border-steel-600 px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-gray-400 hover:text-white transition-colors">← Admin</Link>
        <div>
          <p className="text-gray-500 text-xs">Orden de trabajo</p>
          <h1 className="font-display font-bold text-xl text-white">#{wo.id.slice(-8).toUpperCase()}</h1>
        </div>
        <div className="ml-auto flex gap-3">
          {wo.status === 'COMPLETED' && (
            <a href={`/api/pdf/work-order/${wo.id}`} target="_blank"
              className="bg-brand text-black text-sm font-bold px-4 py-2 rounded-lg">
              Descargar Informe PDF
            </a>
          )}
          <a href={`/api/pdf/checkin/${wo.id}`} target="_blank"
            className="border border-steel-500 text-gray-300 text-sm px-4 py-2 rounded-lg">
            PDF Remito
          </a>
          <a href={`/api/pdf/quote/${wo.id}`} target="_blank"
            className="border border-steel-500 text-gray-300 text-sm px-4 py-2 rounded-lg">
            PDF Presupuesto
          </a>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Info grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Cliente */}
          <div className="bg-steel-800 border border-steel-600 rounded-xl p-5">
            <p className="text-brand text-xs font-bold uppercase tracking-wider mb-3">Cliente</p>
            <p className="text-white font-bold">{wo.user.firstName} {wo.user.lastName}</p>
            <p className="text-gray-400 text-sm">{wo.user.email}</p>
            {wo.user.phone && <p className="text-gray-400 text-sm">{wo.user.phone}</p>}
          </div>

          {/* Vehículo */}
          <div className="bg-steel-800 border border-steel-600 rounded-xl p-5">
            <p className="text-brand text-xs font-bold uppercase tracking-wider mb-3">Vehículo</p>
            <p className="text-white font-bold font-display text-lg">{wo.vehicle.brand} {wo.vehicle.model}</p>
            <p className="text-gray-400 text-sm">{wo.vehicle.year} · {wo.vehicle.engine}</p>
            <p className="text-brand font-display font-bold text-xl mt-1 tracking-widest">{wo.vehicle.plate}</p>
            {wo.checkInKm && <p className="text-gray-500 text-xs mt-1">{wo.checkInKm.toLocaleString('es-AR')} km al ingreso</p>}
          </div>

          {/* Financiero */}
          <div className="bg-steel-800 border border-steel-600 rounded-xl p-5">
            <p className="text-brand text-xs font-bold uppercase tracking-wider mb-3">Financiero</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Mano de obra</span><span className="text-white">{fmt(Number(wo.laborAmount ?? 0))}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Repuestos</span><span className="text-white">{fmt(Number(wo.partsAmount ?? 0))}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Fee plataforma (12%)</span><span className="text-gray-500">-{fmt(Number(wo.platformFee ?? 0))}</span></div>
              <div className="border-t border-steel-600 pt-1 flex justify-between font-bold">
                <span className="text-brand">TOTAL</span>
                <span className="text-brand text-lg">{fmt(Number(wo.totalAmount ?? 0))}</span>
              </div>
              <div className="flex justify-between text-xs"><span className="text-gray-600">Pago taller</span><span className="text-green-400">{fmt(Number(wo.workshopPayout ?? 0))}</span></div>
            </div>
          </div>
        </div>

        {/* Fotos recepción */}
        {(wo.checkInPhotoFront || wo.checkInPhotoRear || wo.checkInPhotoOdometer) && (
          <div className="bg-steel-800 border border-steel-600 rounded-xl p-5">
            <p className="text-brand text-xs font-bold uppercase tracking-wider mb-3">Fotografías de recepción</p>
            <div className="flex gap-3">
              {[
                { url: wo.checkInPhotoFront,    label: 'Frente' },
                { url: wo.checkInPhotoRear,     label: 'Trasera' },
                { url: wo.checkInPhotoOdometer, label: 'Odómetro' },
              ].map(({ url, label }) => url ? (
                <div key={label} className="flex-1">
                  <div className="aspect-video rounded-lg overflow-hidden bg-steel-700">
                    <img src={url} alt={label} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-gray-500 text-xs text-center mt-1">{label}</p>
                </div>
              ) : null)}
            </div>
          </div>
        )}

        {/* Tareas */}
        <div className="bg-steel-800 border border-steel-600 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-steel-600">
            <p className="text-brand text-xs font-bold uppercase tracking-wider">Tareas de la orden</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider bg-steel-900/40">
                <th className="text-left px-5 py-3">Tarea</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-center px-4 py-3">Estado</th>
                <th className="text-center px-4 py-3">Est./Real</th>
                <th className="text-right px-5 py-3">Precio</th>
              </tr>
            </thead>
            <tbody>
              {wo.orderItems.map((item, i) => {
                const price = item.taskType === 'LABOR'
                  ? Number(item.laborPrice ?? 0)
                  : Number(item.partPrice  ?? 0)
                const deviation = item.realMinutes && item.estimatedMinutes
                  ? Math.round((item.realMinutes - item.estimatedMinutes) / item.estimatedMinutes * 100)
                  : null

                return (
                  <tr key={item.id} className={`border-t border-steel-700/50 ${i % 2 !== 0 ? 'bg-steel-900/20' : ''}`}>
                    <td className="px-5 py-3 text-white">{item.taskName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.taskType === 'LABOR' ? 'M.O.' : 'Repuesto'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400'
                        : item.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-steel-600 text-gray-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {item.estimatedMinutes ? (
                        <span>
                          <span className="text-gray-500">{item.estimatedMinutes}'</span>
                          {item.realMinutes && (
                            <>
                              <span className="text-gray-600"> / </span>
                              <span className="text-white">{item.realMinutes}'</span>
                              {deviation !== null && (
                                <span className={`ml-1 text-xs ${deviation > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                  ({deviation > 0 ? '+' : ''}{deviation}%)
                                </span>
                              )}
                            </>
                          )}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-white">
                      {price > 0 ? fmt(price * item.quantity) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Checklist */}
        {wo.checklist && (
          <div className="bg-steel-800 border border-steel-600 rounded-xl p-5">
            <p className="text-brand text-xs font-bold uppercase tracking-wider mb-4">Inspección Visual</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-gray-500 text-xs mb-3">Estado de fluidos y componentes</p>
                <div className="space-y-2">
                  {[
                    { label: 'Líquido de frenos',   val: wo.checklist.brakeFluidStatus },
                    { label: 'Aceite motor',         val: wo.checklist.oilStatus },
                    { label: 'Refrigerante',         val: wo.checklist.coolantStatus },
                    { label: 'Transmisión',          val: wo.checklist.transmissionStatus },
                    { label: 'Amort. delanteros',    val: wo.checklist.frontShockStatus },
                    { label: 'Amort. traseros',      val: wo.checklist.rearShockStatus },
                    { label: 'Presión neumáticos',   val: wo.checklist.tirePressureStatus },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{label}</span>
                      <span>{SEMA[val]} <span className="text-gray-500 text-xs">{val}</span></span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-3">Pastillas de freno</p>
                <div className="space-y-3 mb-4">
                  {[
                    { label: 'Delanteras', val: wo.checklist.frontBrakePadPct },
                    { label: 'Traseras',   val: wo.checklist.rearBrakePadPct },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">{label}</span>
                        <span className={`font-bold ${val < 15 ? 'text-red-400' : val < 30 ? 'text-yellow-400' : 'text-green-400'}`}>{val}%</span>
                      </div>
                      <div className="h-2 bg-steel-600 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${val < 15 ? 'bg-red-500' : val < 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-gray-500 text-xs mb-2">Neumáticos (mm de dibujo)</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { l: 'Del. Izq.', v: wo.checklist.tireFrontLeftMm },
                    { l: 'Del. Der.', v: wo.checklist.tireFrontRightMm },
                    { l: 'Tra. Izq.', v: wo.checklist.tireRearLeftMm },
                    { l: 'Tra. Der.', v: wo.checklist.tireRearRightMm },
                  ].map(({ l, v }) => (
                    <div key={l} className="bg-steel-700 rounded p-2 text-center">
                      <p className="text-gray-500 text-[10px]">{l}</p>
                      <p className={`font-display font-bold text-xl ${v < 2 ? 'text-red-400' : v < 4 ? 'text-yellow-400' : 'text-green-400'}`}>{v.toFixed(1)}</p>
                      <p className="text-gray-600 text-[10px]">mm</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {wo.checklist.mechanicNotes && (
              <div className="border-t border-steel-600 pt-4">
                <p className="text-gray-500 text-xs mb-1">Observaciones del mecánico</p>
                <p className="text-gray-300 text-sm">{wo.checklist.mechanicNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* NPS */}
        {wo.npsScore !== null && (
          <div className="bg-steel-800 border border-steel-600 rounded-xl p-5 flex items-center gap-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 font-display font-bold text-3xl
              ${wo.npsScore >= 9 ? 'border-green-500 text-green-400' : wo.npsScore >= 7 ? 'border-yellow-500 text-yellow-400' : 'border-red-500 text-red-400'}`}>
              {wo.npsScore}
            </div>
            <div>
              <p className="text-brand text-xs font-bold uppercase tracking-wider">NPS del cliente</p>
              <p className="text-white font-bold text-lg mt-0.5">
                {wo.npsScore >= 9 ? 'Promotor 🎉' : wo.npsScore >= 7 ? 'Pasivo' : 'Detractor'}
              </p>
              {wo.npsComment && <p className="text-gray-400 text-sm mt-1">"{wo.npsComment}"</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
