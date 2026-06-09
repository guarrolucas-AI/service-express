/**
 * GET  /api/admin/config  → datos del taller
 * PATCH /api/admin/config → actualizar campos editables
 */

import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

function isAdmin() {
  return cookies().get('admin-session')?.value === 'ok'
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const workshop = await prisma.workshop.findFirst({ where: { isActive: true } })
  if (!workshop) return NextResponse.json({ error: 'Taller no encontrado' }, { status: 404 })

  return NextResponse.json(workshop)
}

export async function PATCH(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json() as {
    name?:     string
    address?:  string
    city?:     string
    province?: string
    phone?:    string
    email?:    string
    cuit?:     string
  }

  const workshop = await prisma.workshop.findFirst({ where: { isActive: true } })
  if (!workshop) return NextResponse.json({ error: 'Taller no encontrado' }, { status: 404 })

  const updated = await prisma.workshop.update({
    where: { id: workshop.id },
    data:  {
      ...(body.name     !== undefined && { name:     body.name.trim() }),
      ...(body.address  !== undefined && { address:  body.address.trim() }),
      ...(body.city     !== undefined && { city:     body.city.trim() }),
      ...(body.province !== undefined && { province: body.province.trim() }),
      ...(body.phone    !== undefined && { phone:    body.phone.trim() }),
      ...(body.email    !== undefined && { email:    body.email.trim().toLowerCase() }),
      ...(body.cuit     !== undefined && { cuit:     body.cuit.trim() || null }),
    },
  })

  return NextResponse.json(updated)
}
