/**
 * Middleware de Next.js
 * Protege /admin — redirige a /admin/login si no hay cookie de sesión.
 */
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rutas de admin: /admin y todo lo que está debajo
  if (pathname.startsWith('/admin')) {
    // La página de login siempre es accesible
    if (pathname === '/admin/login') return NextResponse.next()

    // Verificar cookie de sesión
    const session = req.cookies.get('admin-session')
    if (session?.value !== 'ok') {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
