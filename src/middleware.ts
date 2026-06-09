/**
 * Middleware de Next.js
 * Protege /admin y /mecanico — redirige al login correspondiente si no hay sesión.
 */
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Panel de administración ───────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next()

    const session = req.cookies.get('admin-session')
    if (session?.value !== 'ok') {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ── Panel del mecánico ────────────────────────────────────────────────────
  if (pathname.startsWith('/mecanico')) {
    if (pathname === '/mecanico/login') return NextResponse.next()

    const session = req.cookies.get('mechanic-session')
    if (session?.value !== 'ok') {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/mecanico/login'
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/mecanico/:path*'],
}
