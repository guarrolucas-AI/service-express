'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string
  taskName: string
  taskType: string
  status: string
  estimatedMinutes: number | null
  realMinutes: number | null
  startedAt: string | null
  laborPrice: number
  partPrice: number
  quantity: number
}

interface OrderData {
  id: string
  status: string
  checkInKm: number | null
  checkInAt: string | null
  checkInPhotoFront: string | null
  checkInPhotoRear: string | null
  checkInPhotoOdometer: string | null
  vehicle: { brand: string; model: string; year: number; plate: string }
  client: { name: string; phone: string }
  items: OrderItem[]
  hasChecklist: boolean
  totalAmount: number
}

// ─── Timer hook ───────────────────────────────────────────────────────────────

function useTimer(startedAt: string | null) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) { setElapsed(0); return }
    const start = new Date(startedAt).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// ─── Componente item de tarea ─────────────────────────────────────────────────

function TaskItem({
  item,
  onStart,
  onStop,
  loading,
}: {
  item: OrderItem
  onStart: (id: string) => void
  onStop:  (id: string) => void
  loading: string | null
}) {
  const isInProgress = item.status === 'IN_PROGRESS'
  const timer = useTimer(isInProgress ? item.startedAt : null)
  const busy = loading === item.id

  const statusStyle = {
    PENDING:    'bg-steel-600 text-gray-400',
    IN_PROGRESS:'bg-blue-500/20 text-blue-300 border border-blue-500/40',
    COMPLETED:  'bg-green-500/20 text-green-400 border border-green-500/30',
    SKIPPED:    'bg-gray-700 text-gray-500',
  }[item.status] ?? 'bg-steel-600 text-gray-400'

  const statusLabel = {
    PENDING: 'Pendiente', IN_PROGRESS: 'En progreso',
    COMPLETED: 'Completada', SKIPPED: 'Omitida',
  }[item.status] ?? item.status

  return (
    <div className={`rounded-xl border p-4 transition-all ${isInProgress ? 'bg-blue-500/5 border-blue-500/30' : 'bg-steel-800 border-steel-600'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${statusStyle}`}>
              {statusLabel}
            </span>
            <span className="text-[10px] text-gray-600 uppercase tracking-wide">
              {item.taskType === 'LABOR' ? 'M.O.' : 'Repuesto'}
            </span>
          </div>
          <p className="font-medium text-white text-sm leading-tight">{item.taskName}</p>
          {item.estimatedMinutes ? (
            <p className="text-gray-500 text-xs mt-0.5">Estimado: {item.estimatedMinutes} min</p>
          ) : null}
        </div>

        {/* Timer / botones */}
        {item.taskType === 'LABOR' && (
          <div className="shrink-0 text-right">
            {isInProgress && (
              <div className="font-display font-bold text-brand text-2xl leading-none mb-2 tabular-nums">
                {timer}
              </div>
            )}
            {item.status === 'PENDING' && (
              <button
                onClick={() => onStart(item.id)}
                disabled={busy}
                className="bg-brand text-black text-xs font-bold px-4 py-2 rounded-lg active:scale-95 transition-transform disabled:opacity-50"
              >
                {busy ? '...' : '▶ Iniciar'}
              </button>
            )}
            {isInProgress && (
              <button
                onClick={() => onStop(item.id)}
                disabled={busy}
                className="bg-green-500 text-black text-xs font-bold px-4 py-2 rounded-lg active:scale-95 transition-transform disabled:opacity-50"
              >
                {busy ? '...' : '⏹ Detener'}
              </button>
            )}
            {item.status === 'COMPLETED' && (
              <span className="text-green-400 text-xs font-bold">✓ {item.realMinutes} min</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Check-in modal ───────────────────────────────────────────────────────────

interface PhotoSlot {
  label: string
  hint:  string
  key:   'front' | 'rear' | 'odometer'
}

const PHOTO_SLOTS: PhotoSlot[] = [
  { key: 'front',    label: 'Foto delantera',  hint: 'Capture el frente del vehículo' },
  { key: 'rear',     label: 'Foto trasera',    hint: 'Capture la parte trasera' },
  { key: 'odometer', label: 'Foto odómetro',   hint: 'Capture el tablero con el km' },
]

async function uploadPhoto(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/upload/photo', { method: 'POST', body: fd })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? 'Error al subir foto')
  }
  const { url } = await res.json()
  return url as string
}

function PhotoCapture({
  slot,
  preview,
  onCapture,
}: {
  slot:      PhotoSlot
  preview:   string | null
  onCapture: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onCapture(file)
  }

  return (
    <div>
      <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">{slot.label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`relative w-full h-40 rounded-xl overflow-hidden border-2 transition-all active:scale-95
          ${preview ? 'border-green-500' : 'border-dashed border-steel-500 bg-steel-700'}`}
      >
        {preview ? (
          <>
            <img src={preview} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-white text-sm font-bold">Cambiar foto</span>
            </div>
            <div className="absolute top-2 right-2 bg-green-500 rounded-full w-6 h-6 flex items-center justify-center">
              <span className="text-black text-xs font-bold">✓</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="text-3xl">📷</span>
            <span className="text-gray-400 text-sm">{slot.hint}</span>
            <span className="text-gray-600 text-xs">Toque para capturar</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  )
}

function CheckInModal({
  workOrderId,
  onClose,
  onDone,
}: {
  workOrderId: string
  onClose: () => void
  onDone:  () => void
}) {
  const [previews,  setPreviews]  = useState<Record<string, string>>({})
  const [files,     setFiles]     = useState<Record<string, File>>({})
  const [km,        setKm]        = useState<string>('')
  const [step,      setStep]      = useState<'photos' | 'km' | 'uploading' | 'done'>('photos')
  const [progress,  setProgress]  = useState(0)
  const [error,     setError]     = useState<string | null>(null)

  const capturePhoto = (key: string, file: File) => {
    const url = URL.createObjectURL(file)
    setPreviews(p => ({ ...p, [key]: url }))
    setFiles(f => ({ ...f, [key]: file }))
  }

  const photosReady = PHOTO_SLOTS.every(s => !!files[s.key])

  const handleSubmit = async () => {
    if (!photosReady || !km || Number(km) <= 0) return
    setStep('uploading')
    setError(null)
    try {
      // 1. Upload 3 fotos en paralelo con feedback de progreso
      setProgress(10)
      const [frontUrl, rearUrl, odometerUrl] = await Promise.all([
        uploadPhoto(files['front']!),
        uploadPhoto(files['rear']!),
        uploadPhoto(files['odometer']!),
      ])
      setProgress(70)

      // 2. Check-in
      const res = await fetch('/api/work-order/check-in', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          workOrderId,
          currentKm:       Number(km),
          photoFrontUrl:    frontUrl,
          photoRearUrl:     rearUrl,
          photoOdometerUrl: odometerUrl,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error en check-in')
      }
      setProgress(100)
      setStep('done')
      setTimeout(onDone, 800)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
      setStep('photos')
    }
  }

  // Pantalla de éxito / carga
  if (step === 'uploading' || step === 'done') {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
        <div className="text-center">
          {step === 'done' ? (
            <>
              <div className="text-6xl mb-4">✅</div>
              <p className="text-white font-display font-bold text-2xl">¡Check-in completado!</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-6 animate-spin">⏳</div>
              <p className="text-white font-bold text-lg mb-4">Subiendo fotos...</p>
              <div className="w-64 bg-steel-700 rounded-full h-2 mx-auto">
                <div
                  className="bg-brand h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-gray-500 text-sm mt-2">{progress}%</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-end">
      <div className="bg-steel-800 w-full max-h-[95vh] overflow-y-auto rounded-t-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-steel-800 border-b border-steel-600 flex items-center justify-between px-4 py-3 z-10">
          <div>
            <h2 className="font-display font-bold text-xl text-white">Check-in del Vehículo</h2>
            <p className="text-gray-500 text-xs">
              {step === 'photos' ? 'Tomá las 3 fotos requeridas' : 'Ingresá el kilometraje'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-3xl leading-none w-10 h-10 flex items-center justify-center">
            ×
          </button>
        </div>

        <div className="p-4 space-y-5">
          {step === 'photos' && (
            <>
              <div className="bg-brand/10 border border-brand/30 rounded-lg p-3 text-center">
                <p className="text-brand text-xs font-bold uppercase tracking-wider">
                  {Object.keys(files).length} / 3 fotos capturadas
                </p>
              </div>

              {PHOTO_SLOTS.map(slot => (
                <PhotoCapture
                  key={slot.key}
                  slot={slot}
                  preview={previews[slot.key] ?? null}
                  onCapture={file => capturePhoto(slot.key, file)}
                />
              ))}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={() => setStep('km')}
                disabled={!photosReady}
                className="w-full bg-brand text-black font-display font-bold text-lg py-4 rounded-xl disabled:opacity-40 active:scale-95 transition-transform"
              >
                CONTINUAR →
              </button>
            </>
          )}

          {step === 'km' && (
            <>
              <button
                onClick={() => setStep('photos')}
                className="flex items-center gap-1 text-gray-400 text-sm mb-1"
              >
                ← Volver a las fotos
              </button>

              {/* Resumen de fotos */}
              <div className="flex gap-2">
                {PHOTO_SLOTS.map(slot => (
                  <div key={slot.key} className="flex-1 h-20 rounded-lg overflow-hidden">
                    <img src={previews[slot.key]} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              <div className="bg-steel-700 rounded-xl p-4">
                <label className="text-brand text-xs font-bold uppercase tracking-wider block mb-3">
                  Kilometraje al ingreso
                </label>
                <input
                  type="number"
                  value={km}
                  onChange={e => setKm(e.target.value)}
                  placeholder="Ej: 85000"
                  min={1}
                  autoFocus
                  className="w-full bg-steel-600 text-white text-3xl font-display font-bold text-center rounded-xl py-4 border border-steel-500 focus:outline-none focus:border-brand"
                />
                <p className="text-gray-600 text-xs text-center mt-2">km</p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!km || Number(km) <= 0}
                className="w-full bg-green-500 text-black font-display font-bold text-lg py-4 rounded-xl disabled:opacity-40 active:scale-95 transition-transform"
              >
                ✅ CONFIRMAR CHECK-IN
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Checklist modal ──────────────────────────────────────────────────────────

const SEMA_FIELDS = [
  { key: 'brakeFluidStatus',   label: 'Líquido de frenos' },
  { key: 'oilStatus',          label: 'Aceite motor' },
  { key: 'coolantStatus',      label: 'Refrigerante' },
  { key: 'transmissionStatus', label: 'Transmisión' },
  { key: 'frontShockStatus',   label: 'Amortiguadores del.' },
  { key: 'rearShockStatus',    label: 'Amortiguadores tra.' },
  { key: 'tirePressureStatus', label: 'Presión neumáticos' },
] as const

function ChecklistModal({ workOrderId, onClose, onSaved }: {
  workOrderId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    frontBrakePadPct:   50,
    rearBrakePadPct:    50,
    brakeFluidStatus:   'GREEN',
    oilStatus:          'GREEN',
    coolantStatus:      'GREEN',
    transmissionStatus: 'GREEN',
    frontShockStatus:   'GREEN',
    rearShockStatus:    'GREEN',
    tirePressureStatus: 'GREEN',
    tireFrontLeftMm:    6.0,
    tireFrontRightMm:   6.0,
    tireRearLeftMm:     5.0,
    tireRearRightMm:    5.0,
    mechanicNotes:      '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/work-order/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workOrderId, ...form }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al guardar')
      }
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const SEMA_BTN = (key: string, label: string) => (
    <div key={key} className="bg-steel-700 rounded-lg p-3">
      <p className="text-gray-400 text-xs mb-2">{label}</p>
      <div className="flex gap-2">
        {(['GREEN', 'YELLOW', 'RED'] as const).map(v => (
          <button key={v} onClick={() => set(key, v)}
            className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
              (form as Record<string, string | number>)[key] === v
                ? v === 'GREEN' ? 'bg-green-500 text-black'
                  : v === 'YELLOW' ? 'bg-yellow-500 text-black'
                  : 'bg-red-500 text-white'
                : 'bg-steel-600 text-gray-400'
            }`}>
            {v === 'GREEN' ? '✓ OK' : v === 'YELLOW' ? '⚠ Att.' : '✗ Crit.'}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
      <div className="bg-steel-800 w-full max-h-[90vh] overflow-y-auto rounded-t-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-xl text-white">Checklist Inspección</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        {/* Pastillas */}
        <div className="space-y-3 mb-4">
          <p className="text-brand text-xs font-bold uppercase tracking-wider">Frenos</p>
          <div className="bg-steel-700 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-2">Pastillas delanteras: <span className="text-white font-bold">{form.frontBrakePadPct}%</span></p>
            <input type="range" min={0} max={100} value={form.frontBrakePadPct}
              onChange={e => set('frontBrakePadPct', Number(e.target.value))}
              className="w-full accent-brand" />
          </div>
          <div className="bg-steel-700 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-2">Pastillas traseras: <span className="text-white font-bold">{form.rearBrakePadPct}%</span></p>
            <input type="range" min={0} max={100} value={form.rearBrakePadPct}
              onChange={e => set('rearBrakePadPct', Number(e.target.value))}
              className="w-full accent-brand" />
          </div>
        </div>

        {/* Semáforos */}
        <div className="space-y-3 mb-4">
          <p className="text-brand text-xs font-bold uppercase tracking-wider">Estado de fluidos y componentes</p>
          {SEMA_FIELDS.map(f => SEMA_BTN(f.key, f.label))}
        </div>

        {/* Neumáticos */}
        <div className="space-y-3 mb-4">
          <p className="text-brand text-xs font-bold uppercase tracking-wider">Profundidad neumáticos (mm)</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'tireFrontLeftMm',  label: 'Del. Izq.' },
              { key: 'tireFrontRightMm', label: 'Del. Der.' },
              { key: 'tireRearLeftMm',   label: 'Tra. Izq.' },
              { key: 'tireRearRightMm',  label: 'Tra. Der.' },
            ].map(t => (
              <div key={t.key} className="bg-steel-700 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">{t.label}</p>
                <input type="number" min={0} max={15} step={0.1}
                  value={(form as Record<string, string | number>)[t.key]}
                  onChange={e => set(t.key, Number(e.target.value))}
                  className="w-full bg-steel-600 text-white text-center text-lg font-bold rounded py-1 border border-steel-500 focus:outline-none focus:border-brand"
                />
                <p className="text-gray-600 text-xs text-center mt-0.5">mm</p>
              </div>
            ))}
          </div>
        </div>

        {/* Notas */}
        <div className="mb-4">
          <p className="text-brand text-xs font-bold uppercase tracking-wider mb-2">Observaciones del mecánico</p>
          <textarea
            value={form.mechanicNotes}
            onChange={e => set('mechanicNotes', e.target.value)}
            placeholder="Anotá cualquier observación relevante..."
            rows={3}
            className="w-full bg-steel-700 border border-steel-500 text-white text-sm rounded-lg p-3 focus:outline-none focus:border-brand resize-none"
          />
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button onClick={save} disabled={saving}
          className="w-full bg-brand text-black font-display font-bold text-lg py-4 rounded-xl disabled:opacity-50 active:scale-95 transition-transform">
          {saving ? 'Guardando...' : 'GUARDAR CHECKLIST'}
        </button>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

const MECHANIC_ID = 'demo-mechanic-id'  // En producción vendrá del token de sesión

export function MecanicoOrderClient({ data }: { data: OrderData }) {
  const router = useRouter()
  const [loading, setLoading]             = useState<string | null>(null)
  const [showChecklist, setShowChecklist]   = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showCheckIn, setShowCheckIn]      = useState(false)
  const [closing, setClosing]             = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  const laborItems  = data.items.filter(i => i.taskType === 'LABOR')
  const allDone     = laborItems.every(i => i.status === 'COMPLETED' || i.status === 'SKIPPED')
  const inQC        = data.status === 'QUALITY_CONTROL'
  const needsCheckIn = data.status === 'READY_FOR_APPOINTMENT'

  const handleStart = useCallback(async (itemId: string) => {
    setLoading(itemId)
    setError(null)
    try {
      const res = await fetch('/api/work-order/task/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderItemId: itemId, mechanicUserId: MECHANIC_ID }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(null)
    }
  }, [router])

  const handleStop = useCallback(async (itemId: string) => {
    setLoading(itemId)
    setError(null)
    try {
      const res = await fetch('/api/work-order/task/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderItemId: itemId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(null)
    }
  }, [router])

  const handleClose = async () => {
    setClosing(true)
    try {
      const reportUrl = `/api/pdf/work-order/${data.id}`
      const res = await fetch('/api/work-order/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workOrderId: data.id, reportUrl }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      router.push('/mecanico')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cerrar')
      setClosing(false)
    }
  }

  return (
    <div className="min-h-screen bg-steel-900 text-gray-100 font-body pb-32">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-steel-800 border-b border-steel-600 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/mecanico" className="text-gray-400 text-lg">←</Link>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-brand text-xl leading-none truncate">
              {data.vehicle.brand} {data.vehicle.model}
            </p>
            <p className="text-gray-500 text-xs">{data.vehicle.plate} · {data.client.name}</p>
          </div>
          <a href={`/api/pdf/checkin/${data.id}`} target="_blank"
            className="text-[10px] text-gray-500 border border-steel-600 rounded px-2 py-1">
            PDF Remito
          </a>
        </div>
      </header>

      {/* Banner de check-in pendiente */}
      {needsCheckIn && (
        <div className="mx-4 mt-4 bg-brand/10 border border-brand/40 rounded-xl p-4">
          <p className="text-brand font-bold text-sm mb-1">📋 Check-in pendiente</p>
          <p className="text-gray-400 text-xs">El vehículo llegó al taller. Tomá las fotos y registrá el km para iniciar la recepción.</p>
        </div>
      )}

      {/* Fotos check-in */}
      {(data.checkInPhotoFront || data.checkInPhotoRear || data.checkInPhotoOdometer) && (
        <div className="flex gap-2 px-4 pt-4 overflow-x-auto pb-1">
          {[
            { url: data.checkInPhotoFront,    label: 'Delantera' },
            { url: data.checkInPhotoRear,     label: 'Trasera' },
            { url: data.checkInPhotoOdometer, label: 'Odómetro' },
          ].map((p, i) =>
            p.url ? (
              <div key={i} className="shrink-0 text-center">
                <div className="w-28 h-20 rounded-lg overflow-hidden bg-steel-700 mb-1">
                  <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                </div>
                <p className="text-gray-600 text-[10px]">{p.label}</p>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Info del vehículo */}
      <div className="grid grid-cols-3 gap-2 px-4 mt-4">
        {[
          { label: 'Kilometraje', value: data.checkInKm ? `${data.checkInKm.toLocaleString('es-AR')} km` : '—' },
          { label: 'Total OT',    value: `$${data.totalAmount.toLocaleString('es-AR')}` },
          { label: 'Estado',      value: data.status.replace(/_/g, ' ') },
        ].map(info => (
          <div key={info.label} className="bg-steel-800 border border-steel-600 rounded-lg p-3 text-center">
            <p className="text-gray-500 text-[10px] uppercase tracking-wide">{info.label}</p>
            <p className="text-white font-bold text-sm mt-0.5 leading-tight">{info.value}</p>
          </div>
        ))}
      </div>

      {/* Tareas */}
      {!needsCheckIn && (
        <div className="px-4 mt-4">
          <p className="text-brand text-xs font-bold uppercase tracking-wider mb-3">Tareas de mano de obra</p>
          <div className="space-y-3">
            {data.items.map(item => (
              <TaskItem key={item.id} item={item}
                onStart={handleStart} onStop={handleStop} loading={loading} />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Acciones — fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-steel-800 border-t border-steel-600 p-4 space-y-2">
        {/* CHECK-IN */}
        {needsCheckIn && (
          <button
            onClick={() => setShowCheckIn(true)}
            className="w-full bg-brand text-black font-display font-bold text-lg py-3.5 rounded-xl active:scale-95 transition-transform"
          >
            📷 INICIAR CHECK-IN
          </button>
        )}

        {/* CHECKLIST */}
        {inQC && !data.hasChecklist && (
          <button onClick={() => setShowChecklist(true)}
            className="w-full bg-brand text-black font-display font-bold text-lg py-3.5 rounded-xl active:scale-95 transition-transform">
            📋 COMPLETAR CHECKLIST
          </button>
        )}

        {/* CERRAR */}
        {inQC && data.hasChecklist && (
          <button onClick={() => setShowCloseConfirm(true)}
            className="w-full bg-green-500 text-black font-display font-bold text-lg py-3.5 rounded-xl active:scale-95 transition-transform">
            ✅ CERRAR Y GENERAR INFORME
          </button>
        )}

        {/* Estado neutro — en progreso */}
        {!needsCheckIn && !inQC && (
          <p className="text-center text-gray-600 text-sm py-2">
            {allDone ? 'Todas las tareas completadas — esperando cierre...' : 'Completá las tareas para avanzar'}
          </p>
        )}
      </div>

      {/* ── Modales ── */}

      {showCheckIn && (
        <CheckInModal
          workOrderId={data.id}
          onClose={() => setShowCheckIn(false)}
          onDone={() => { setShowCheckIn(false); router.refresh() }}
        />
      )}

      {showChecklist && (
        <ChecklistModal
          workOrderId={data.id}
          onClose={() => setShowChecklist(false)}
          onSaved={() => { setShowChecklist(false); router.refresh() }}
        />
      )}

      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
          <div className="bg-steel-800 border border-steel-600 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-display font-bold text-xl text-white mb-2">¿Cerrar la orden?</h3>
            <p className="text-gray-400 text-sm mb-6">
              Se generará el informe técnico en PDF y se notificará al cliente.
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowCloseConfirm(false)}
                className="flex-1 py-3 border border-steel-500 rounded-xl text-gray-400 font-bold">
                Cancelar
              </button>
              <button onClick={handleClose} disabled={closing}
                className="flex-1 py-3 bg-green-500 text-black rounded-xl font-display font-bold disabled:opacity-50">
                {closing ? 'Cerrando...' : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
