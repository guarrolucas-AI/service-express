/**
 * POST /api/upload/photo
 *
 * Recibe una imagen (multipart/form-data, campo "file") y la sube a Vercel Blob.
 * Devuelve { url } para usar luego en el check-in.
 *
 * Límites: 10 MB, solo imágenes (image/*).
 */
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 10 * 1024 * 1024   // 10 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Campo "file" requerido' }, { status: 400 })
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se aceptan imágenes' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'La imagen no puede superar 10 MB' }, { status: 400 })
    }

    // Nombre único en el blob store
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const name = `checkin/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const blob = await put(name, file, {
      access: 'public',
      contentType: file.type,
    })

    return NextResponse.json({ url: blob.url }, { status: 200 })
  } catch (err) {
    console.error('[upload/photo]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
