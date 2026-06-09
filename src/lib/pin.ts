/**
 * Utilidades para hashear y verificar PINs de mecánicos.
 * Usa crypto.pbkdf2Sync (Node built-in, sin dependencias externas).
 */
import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = process.env.PIN_SECRET ?? 'express-service-pin-salt-2026'

export function hashPin(pin: string): string {
  return createHmac('sha256', SECRET).update(String(pin)).digest('hex')
}

export function verifyPin(pin: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashPin(pin))
  const stored    = Buffer.from(storedHash)
  if (candidate.length !== stored.length) return false
  return timingSafeEqual(candidate, stored)
}
