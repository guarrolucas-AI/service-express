'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface OrderItem {
  id:         string
  taskName:   string
  taskType:   string
  laborPrice: number
  partPrice:  number
  quantity:   number
  estimatedMinutes: number | null
}

interface QuoteEditorProps {
  workOrderId: string
  initialItems: OrderItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_FEE_PCT = 0.12
function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }

function calcTotals(items: OrderItem[]) {
  const laborAmount = items
    .filter(i => i.taskType === 'LABOR')
    .reduce((s, i) => s + Number(i.laborPrice) * i.quantity, 0)
  const partsAmount = items
    .filter(i => i.taskType === 'PART')
    .reduce((s, i) => s + Number(i.partPrice) * i.quantity, 0)
  const platformFee    = Math.round(laborAmount * PLATFORM_FEE_PCT)
  const workshopPayout = laborAmount - platformFee
  const total          = laborAmount + partsAmount
  return { laborAmount, partsAmount, platformFee, workshopPayout, total }
}

// ─── Fila de ítem ─────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onDelete,
  onPriceChange,
}: {
  item: OrderItem
  onDelete: () => void
  onPriceChange: (price: number) => void
}) {
  const price = item.taskType === 'LABOR' ? item.laborPrice : item.partPrice
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(String(price))

  const commit = () => {
    const n = Number(val)
    if (!isNaN(n) && n >= 0) onPriceChange(n)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-steel-700/50 last:border-0 group">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium leading-tight truncate">{item.taskName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide
            ${item.taskType === 'LABOR' ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'}`}>
            {item.taskType === 'LABOR' ? 'M.O.' : 'Repuesto'}
          </span>
          {item.quantity > 1 && (
            <span className="text-gray-500 text-xs">× {item.quantity}</span>
          )}
        </div>
      </div>

      {/* Precio editable */}
      <div className="shrink-0">
        {editing ? (
          <input
            type="number"
            value={val}
            min={0}
            step={100}
            autoFocus
            onChange={e => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => e.key === 'Enter' && commit()}
            className="w-28 bg-steel-600 text-white text-right text-sm font-bold rounded px-2 py-1 border border-brand focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-white font-bold text-sm hover:text-brand transition-colors min-w-[80px] text-right"
            title="Clic para editar precio"
          >
            {price > 0 ? fmt(price * item.quantity) : <span className="text-orange-400 text-xs">Sin precio</span>}
          </button>
        )}
      </div>

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all text-lg leading-none w-6 h-6 flex items-center justify-center"
        title="Eliminar ítem"
      >
        ×
      </button>
    </div>
  )
}

// ─── Formulario para agregar ítem ─────────────────────────────────────────────

interface NewItemForm {
  taskName:  string
  taskType:  'LABOR' | 'PART'
  price:     string
  quantity:  string
}

const EMPTY_FORM: NewItemForm = { taskName: '', taskType: 'LABOR', price: '', quantity: '1' }

// ─── Quote Editor principal ───────────────────────────────────────────────────

export function QuoteEditor({ workOrderId, initialItems }: QuoteEditorProps) {
  const router = useRouter()
  const [items,    setItems]    = useState<OrderItem[]>(initialItems)
  const [form,     setForm]     = useState<NewItemForm>(EMPTY_FORM)
  const [adding,   setAdding]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [sent,     setSent]     = useState(false)

  const totals = calcTotals(items)
  const allPriced = items.length > 0 && items.every(i =>
    (i.taskType === 'LABOR' && i.laborPrice > 0) ||
    (i.taskType === 'PART'  && i.partPrice  > 0)
  )

  // ── Agregar ítem ──────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!form.taskName.trim() || !form.price) return
    setAdding(true)
    setError(null)
    try {
      const price = Number(form.price)
      const res = await fetch(`/api/admin/orders/${workOrderId}/items`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          taskName:   form.taskName.trim(),
          taskType:   form.taskType,
          laborPrice: form.taskType === 'LABOR' ? price : 0,
          partPrice:  form.taskType === 'PART'  ? price : 0,
          quantity:   Number(form.quantity) || 1,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { item } = await res.json()
      setItems(prev => [...prev, {
        ...item,
        laborPrice: Number(item.laborPrice ?? 0),
        partPrice:  Number(item.partPrice  ?? 0),
      }])
      setForm(EMPTY_FORM)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setAdding(false)
    }
  }

  // ── Eliminar ítem ─────────────────────────────────────────────────────────

  const handleDelete = async (itemId: string) => {
    setDeleting(itemId)
    try {
      const res = await fetch(`/api/admin/orders/${workOrderId}/items/${itemId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setItems(prev => prev.filter(i => i.id !== itemId))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setDeleting(null)
    }
  }

  // ── Actualizar precio inline ──────────────────────────────────────────────

  const handlePriceChange = async (itemId: string, price: number, taskType: string) => {
    setItems(prev => prev.map(i => i.id === itemId
      ? { ...i, laborPrice: taskType === 'LABOR' ? price : i.laborPrice, partPrice: taskType === 'PART' ? price : i.partPrice }
      : i
    ))
    await fetch(`/api/admin/orders/${workOrderId}/items/${itemId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(taskType === 'LABOR' ? { laborPrice: price } : { partPrice: price }),
    })
  }

  // ── Enviar cotización ─────────────────────────────────────────────────────

  const handleSendQuote = async () => {
    if (!allPriced) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/orders/${workOrderId}/quote`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          partsAmount: totals.partsAmount,
          laborAmount: totals.laborAmount,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSent(true)
      setTimeout(() => { router.refresh() }, 1200)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al enviar cotización')
    } finally {
      setSaving(false)
    }
  }

  if (sent) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-green-400 font-bold text-lg">¡Cotización enviada!</p>
        <p className="text-gray-400 text-sm mt-1">El link de pago fue enviado al cliente por WhatsApp.</p>
      </div>
    )
  }

  return (
    <div className="bg-steel-800 border border-orange-500/40 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-orange-500/10 border-b border-orange-500/30 flex items-center justify-between">
        <div>
          <p className="text-orange-400 text-xs font-bold uppercase tracking-wider">Presupuesto pendiente</p>
          <p className="text-white font-bold mt-0.5">Cargá los ítems y enviá la cotización al cliente</p>
        </div>
        <span className="text-2xl">⚠️</span>
      </div>

      <div className="p-5 space-y-5">
        {/* Lista de ítems */}
        {items.length > 0 ? (
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">Ítems del presupuesto</p>
            <div className="bg-steel-700 rounded-xl px-4 py-1">
              {items.map(item => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onDelete={() => {
                    if (deleting !== item.id) handleDelete(item.id)
                  }}
                  onPriceChange={price => handlePriceChange(item.id, price, item.taskType)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 text-sm">
            No hay ítems aún. Agregá al menos uno para poder cotizar.
          </div>
        )}

        {/* Formulario agregar ítem */}
        <div className="bg-steel-700 rounded-xl p-4">
          <p className="text-brand text-xs font-bold uppercase tracking-wider mb-3">+ Agregar ítem</p>
          <div className="grid grid-cols-12 gap-2">
            {/* Nombre */}
            <input
              type="text"
              value={form.taskName}
              onChange={e => setForm(f => ({ ...f, taskName: e.target.value }))}
              placeholder="Nombre del servicio / repuesto"
              className="col-span-5 bg-steel-600 text-white text-sm rounded-lg px-3 py-2 border border-steel-500 focus:outline-none focus:border-brand placeholder:text-gray-600"
            />
            {/* Tipo */}
            <select
              value={form.taskType}
              onChange={e => setForm(f => ({ ...f, taskType: e.target.value as 'LABOR' | 'PART' }))}
              className="col-span-2 bg-steel-600 text-white text-sm rounded-lg px-2 py-2 border border-steel-500 focus:outline-none focus:border-brand"
            >
              <option value="LABOR">M.O.</option>
              <option value="PART">Repuesto</option>
            </select>
            {/* Precio */}
            <input
              type="number"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              placeholder="Precio $"
              min={0}
              step={100}
              className="col-span-3 bg-steel-600 text-white text-sm rounded-lg px-3 py-2 border border-steel-500 focus:outline-none focus:border-brand placeholder:text-gray-600"
            />
            {/* Cantidad */}
            <input
              type="number"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              min={1}
              max={99}
              className="col-span-1 bg-steel-600 text-white text-sm rounded-lg px-2 py-2 border border-steel-500 focus:outline-none focus:border-brand text-center"
              title="Cantidad"
            />
            {/* Botón */}
            <button
              onClick={handleAdd}
              disabled={adding || !form.taskName.trim() || !form.price}
              className="col-span-1 bg-brand text-black font-bold rounded-lg text-sm disabled:opacity-40 hover:bg-yellow-400 transition-colors"
            >
              {adding ? '…' : '+'}
            </button>
          </div>
        </div>

        {/* Resumen financiero */}
        {items.length > 0 && (
          <div className="bg-steel-700 rounded-xl p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">Resumen financiero</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Mano de obra</span>
                <span className="text-white font-bold">{fmt(totals.laborAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Repuestos</span>
                <span className="text-white font-bold">{fmt(totals.partsAmount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Comisión plataforma (12%)</span>
                <span className="text-gray-500">-{fmt(totals.platformFee)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Cobro taller</span>
                <span className="text-green-400">{fmt(totals.workshopPayout)}</span>
              </div>
              <div className="border-t border-steel-500 pt-2 flex justify-between font-bold text-base">
                <span className="text-brand">TOTAL AL CLIENTE</span>
                <span className="text-brand text-xl">{fmt(totals.total)}</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Botón enviar */}
        <button
          onClick={handleSendQuote}
          disabled={!allPriced || saving}
          className="w-full bg-orange-500 hover:bg-orange-400 text-black font-display font-bold text-lg py-4 rounded-xl disabled:opacity-40 transition-colors"
        >
          {saving ? 'Enviando...' : !allPriced
            ? `Completá precios (${items.filter(i => (i.taskType === 'LABOR' && !i.laborPrice) || (i.taskType === 'PART' && !i.partPrice)).length} sin precio)`
            : '📱 ENVIAR COTIZACIÓN AL CLIENTE'
          }
        </button>

        <p className="text-gray-600 text-xs text-center">
          Se generará la preferencia de pago en MercadoPago y se enviará el link al cliente por WhatsApp.
        </p>
      </div>
    </div>
  )
}
