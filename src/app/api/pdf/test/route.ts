/**
 * GET /api/pdf/test
 * Ruta de diagnóstico: renderiza un PDF mínimo para verificar que
 * @react-pdf/renderer y yoga-layout funcionan en el entorno de Vercel.
 */

import { NextResponse } from 'next/server'
import { renderToBuffer, Document, Page, Text, View } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  try {
    console.log('[pdf/test] Cargando módulos...')

    const doc = React.createElement(
      Document, {},
      React.createElement(
        Page, { size: 'A4', style: { padding: 40 } },
        React.createElement(View, {},
          React.createElement(Text, { style: { fontSize: 24, color: '#E8C547' } }, 'Express Service Alpha'),
          React.createElement(Text, { style: { fontSize: 12, marginTop: 10 } }, `PDF generado en: ${new Date().toISOString()}`),
          React.createElement(Text, { style: { fontSize: 10, marginTop: 5, color: '#666' } }, 'Si ves este PDF, react-pdf funciona correctamente en Vercel.'),
        ),
      ),
    ) as React.ReactElement<DocumentProps>

    console.log('[pdf/test] Iniciando renderToBuffer...')
    const buffer = await renderToBuffer(doc)
    const ms = Date.now() - start
    console.log(`[pdf/test] OK — buffer: ${buffer.length} bytes, tiempo: ${ms}ms`)

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'inline; filename="test.pdf"',
        'X-Render-Ms':         String(ms),
      },
    })
  } catch (err) {
    const ms = Date.now() - start
    console.error('[pdf/test] Error:', err)
    return NextResponse.json({
      ok:     false,
      ms,
      error:  String(err),
      stack:  err instanceof Error ? err.stack : undefined,
    }, { status: 500 })
  }
}
