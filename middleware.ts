import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // Only run on protected admin routes
  const isSuperAdmin   = pathname.startsWith('/super-admin')
  const isCountryAdmin = pathname.startsWith('/country-admin')
  const isAdmin        = pathname.startsWith('/admin')

  if (!isSuperAdmin && !isCountryAdmin && !isAdmin) {
    return response
  }

  // Build Supabase client using auth-helpers pattern
  const supabase = createMiddlewareClient({ req: request, res: response })

  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession()

  // Not logged in → redirect to auth
  if (!session) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // Get user role and status
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, status')
    .eq('id', session.user.id)
    .single()

  const role   = profile?.role   ?? ''
  const status = profile?.status ?? 'active'

  // Suspended users
  if (status === 'suspended') {
    const url = new URL('/auth', request.url)
    url.searchParams.set('error', 'suspended')
    return NextResponse.redirect(url)
  }

  // Pending users — not yet activated
  if (status === 'pending') {
    const url = new URL('/auth', request.url)
    url.searchParams.set('error', 'pending')
    return NextResponse.redirect(url)
  }

  // Route guards
  if (isSuperAdmin && role !== 'super_admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isCountryAdmin && !['country_admin', 'super_admin'].includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isAdmin && !['admin', 'country_admin', 'super_admin'].includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/super-admin/:path*',
    '/country-admin/:path*',
    '/admin/:path*',
  ],
}