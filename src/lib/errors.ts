import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} no encontrado`, 404, 'NOT_FOUND')
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 422, 'VALIDATION_ERROR')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class PaymentError extends AppError {
  constructor(message: string) {
    super(message, 402, 'PAYMENT_ERROR')
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (req: NextRequest, ctx?: any) => Promise<NextResponse | Response>

/**
 * Envuelve un route handler de Next.js para captura uniforme de errores.
 * Compatible con rutas simples y rutas con parámetros dinámicos [id].
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: NextRequest, ctx?: any) => {
    try {
      return await handler(req, ctx)
    } catch (err) {
      if (err instanceof AppError) {
        return NextResponse.json(
          { ok: false, error: err.message, code: err.code },
          { status: err.statusCode },
        )
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { ok: false, error: 'Datos inválidos', details: err.flatten().fieldErrors },
          { status: 422 },
        )
      }
      console.error('[unhandled]', err)
      return NextResponse.json(
        { ok: false, error: 'Error interno del servidor' },
        { status: 500 },
      )
    }
  }
}
