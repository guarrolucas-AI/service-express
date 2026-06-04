import type {
  User, Workshop, Vehicle, SparePart,
  Appointment, WorkOrder, OrderItem,
  InspectionChecklist, PredictiveMaintenance,
} from '@prisma/client'

// Re-exports de Prisma para uso en el resto de la app
export type {
  User, Workshop, Vehicle, SparePart,
  Appointment, WorkOrder, OrderItem,
  InspectionChecklist, PredictiveMaintenance,
}

// ─── Checkout ────────────────────────────────────────────────────────────────

export interface CheckoutItem {
  taskName: string
  sparePartSku?: string
  estimatedMinutes?: number
  quantity?: number
}

export interface CreatePreferencePayload {
  workOrderId: string
  vehicleId: string
  workshopId: string
  items: CheckoutItem[]
}

export interface SplitBreakdown {
  partsAmount: number
  laborAmount: number
  platformFee: number    // 12% del labor
  workshopPayout: number // labor - platformFee
  total: number
}

// ─── MercadoPago Webhook ──────────────────────────────────────────────────────

export interface MpWebhookBody {
  id: number
  type: string           // "payment"
  action: string         // "payment.updated" | "payment.created"
  data: { id: string }
  date_created: string
  user_id: string
  version: number
}

// ─── Work Order ───────────────────────────────────────────────────────────────

export interface CheckInPayload {
  workOrderId: string
  currentKm: number
  photoFrontUrl: string
  photoRearUrl: string
  photoOdometerUrl: string
}

export interface TaskActionPayload {
  orderItemId: string
}

// ─── Inspección ───────────────────────────────────────────────────────────────

export interface ChecklistPayload {
  workOrderId: string
  frontBrakePadPct: number
  rearBrakePadPct: number
  brakeFluidStatus: 'GREEN' | 'YELLOW' | 'RED'
  frontShockStatus: 'GREEN' | 'YELLOW' | 'RED'
  rearShockStatus: 'GREEN' | 'YELLOW' | 'RED'
  oilStatus: 'GREEN' | 'YELLOW' | 'RED'
  coolantStatus: 'GREEN' | 'YELLOW' | 'RED'
  transmissionStatus: 'GREEN' | 'YELLOW' | 'RED'
  tireFrontLeftMm: number
  tireFrontRightMm: number
  tireRearLeftMm: number
  tireRearRightMm: number
  tirePressureStatus: 'GREEN' | 'YELLOW' | 'RED'
  mechanicNotes?: string
}

// ─── Predictive ───────────────────────────────────────────────────────────────

export interface PredictiveInput {
  vehicleId: string
  workOrderId: string
  currentKm: number
  monthlyKmAvg?: number
  checklist: ChecklistPayload
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface WorkshopScoreInput {
  workshopId: string
  timeDeviationPct: number  // % desviación de tiempo real vs estimado
  npsAverage: number        // 0–10
  rejectionRate: number     // 0.0–1.0
}

// ─── API Response wrappers ────────────────────────────────────────────────────

export type ApiSuccess<T> = { data: T; ok: true }
export type ApiError = { error: string; code?: string; ok: false }
export type ApiResponse<T> = ApiSuccess<T> | ApiError
