import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Build a mutable response — createMiddlewareClient writes the
  // refreshed session cookie onto this response before we return it
  const res = NextResponse.next()

  // This ONE line handles all cookie reading + writing automatically
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired — result is written back to the cookie
  const { data: { session } } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname

  // Signed-out user hitting a protected route → go to /auth
  if (!session && path.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth', req.url))
  }

  // Signed-in user hitting /auth → go to app
  if (session && path === '/auth') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Always return res (not NextResponse.next()) so the cookie
  // written by createMiddlewareClient is actually sent to the browser
  return res
}

export const config = {
  // Only run on these two routes — nothing else needs middleware
  matcher: ['/dashboard/:path*', '/auth'],
}
