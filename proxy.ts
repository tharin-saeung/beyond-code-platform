import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Initialize Supabase client specifically for middleware cookie manipulation
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set({ name, value, ...options }))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set({ name, value, ...options }))
        },
      },
    }
  )

  // Retrieve authenticated user data
  const { data: { user } } = await supabase.auth.getUser()
  const url = request.nextUrl.clone()

  // Guard Clause 1: Unauthenticated users trying to access protected dashboards
  if (!user && (url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/admin'))) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Guard Clause 2: Authenticated role-based routing checks
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    // Restrict student from entering instructor admin panel
    if (url.pathname.startsWith('/admin') && role !== 'INSTRUCTOR') {
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Restrict instructor from entering student dashboard view
    if (url.pathname.startsWith('/dashboard') && role === 'INSTRUCTOR') {
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
  }

  return response
}

// Performance Optimization: Exclude static assets from running the middleware logic
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}