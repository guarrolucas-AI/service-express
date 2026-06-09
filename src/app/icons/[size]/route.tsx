/**
 * /icons/[size] — Genera íconos PWA dinámicamente
 * Sizes: 192 | 512 | apple (180)
 */

import { ImageResponse } from 'next/og'

export const runtime = 'edge'

const SIZES: Record<string, number> = {
  '192':   192,
  '512':   512,
  'apple': 180,
}

export function GET(_req: Request, { params }: { params: { size: string } }) {
  const size = SIZES[params.size] ?? 192
  const pad  = Math.round(size * 0.18)
  const r    = Math.round(size * 0.22)

  return new ImageResponse(
    (
      <div
        style={{
          width:           size,
          height:          size,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          background:      '#0f172a',
          borderRadius:    r,
        }}
      >
        <div
          style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            gap:            0,
          }}
        >
          {/* "ES" — iniciales */}
          <span
            style={{
              fontSize:      Math.round(size * 0.38),
              fontWeight:    900,
              color:         '#f59e0b',
              letterSpacing: '-0.04em',
              lineHeight:    1,
            }}
          >
            ES
          </span>
          {/* "SERVICE" subtítulo */}
          <span
            style={{
              fontSize:      Math.round(size * 0.095),
              color:         '#64748b',
              letterSpacing: '0.18em',
              marginTop:     Math.round(size * 0.025),
              lineHeight:    1,
            }}
          >
            SERVICE
          </span>
        </div>
      </div>
    ),
    {
      width:  size,
      height: size,
    }
  )
}
