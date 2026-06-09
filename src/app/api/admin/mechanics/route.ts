/**
 * GET  /api/admin/mechanics   — lista mecánicos (role MECHANIC)
 * POST /api/admin/mechanics   — crea un mecánico nuevo
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { hashPin } from '@/lib/pin'

export const dynamic = 'force-dynamic'

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const mechanics = await prisma.user.findMany({
    where:   { role: 'MECHANIC' },
    select:  {
      id: true, firstName: true, lastName: true,
      phone: true, createdAt: true,
      // passwordHash null = desactivado
      passwordHash: true,
    },
    orderBy: { firstName: 'asc' },
  })

  return NextResponse.json({
    mechanics: mechanics.map(m => ({
      id:        m.id,
      firstName: m.firstName,
      lastName:  m.lastName,
      phone:     m.phone,
      active:    !!m.passwordHash,
      createdAt: m.createdAt,
    })),
  })
}

// ── POST ─────────────────────────────────────────────────────────────────────

const createSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName:  z.string().min(2).max(50),
  pin:       z.string().regex(/^\d{4,6}$/, 'El PIN debe tener 4-6 dígitos'),
  phone:     z.string().max(20).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = createSchema.parse(await req.json())

    const mechanic = await prisma.user.create({
      data: {
        firstName:    body.firstName,
        lastName:     body.lastName,
        phone:        body.phone,
        email:        `mecanico-${Date.now()}@express.internal`,
        role:         'MECHANIC',
        passwordHash: hashPin(body.pin),
      },
    })

    return NextResponse.json({
      mechanic: {
        id:        mechanic.id,
        firstName: mechanic.firstName,
        lastName:  mechanic.lastName,
        phone:     mechanic.phone,
        active:    true,
      },
    }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
