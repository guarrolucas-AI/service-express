/**
 * GET /api/pdf/test
 * Diagnóstico: import dinámico para capturar el error exacto.
 */
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  try {
    // Import dinámico para que cualquier fallo de módulo sea capturado aquí
    const reactPdf = await import('@react-pdf/renderer')
    const React    = await import('react')

    const { renderToBuffer, Document, Page, Text, View } = reactPdf

    const doc = React.default.createElement(
      Document, {},
      React.default.createElement(
        Page, { size: 'A4', style: { padding: 40 } },
        React.default.createElement(View, {},
          React.default.createElement(Text, { style: { fontSize: 18 } }, 'Express Service — PDF test OK'),
          React.default.createElement(Text, { style: { fontSize: 10, marginTop: 8 } }, new Date().toISOString()),
        ),
      ),
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(doc as any)
    const ms = Date.now() - start

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'inline; filename="test.pdf"',
        'X-Render-Ms':         String(ms),
      },
    })
  } catch (err) {
    const ms = Date.now() - start
    console.error('[pdf/test] CRASH:', err)
    return NextResponse.json({
      ok:     false,
      ms,
      error:  String(err),
      stack:  err instanceof Error ? err.stack?.split('\n').slice(0, 8).join('\n') : undefined,
    }, { status: 500 })
  }
}
