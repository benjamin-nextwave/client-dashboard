import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      // If env vars are missing, let the request through rather than crashing
      console.error('Missing Supabase env vars in middleware')
      return NextResponse.next()
    }

    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // IMPORTANT: Use getUser(), not getSession()
    // getUser() validates the token with Supabase Auth server
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

    // Allow API cron and CSV export routes without auth (they handle their own auth)
    if (path.startsWith('/api/')) {
      return supabaseResponse
    }

    // Redirect unauthenticated users to login (except /login itself)
    if (!user && !path.startsWith('/login')) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // If authenticated user visits /login, redirect based on role
    if (user && path.startsWith('/login')) {
      const userRole = user.app_metadata?.user_role
      if (userRole === 'operator') {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Role-based route protection
    if (user) {
      const userRole = user.app_metadata?.user_role

      // Clients cannot access operator routes
      if (path.startsWith('/admin') && userRole !== 'operator') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      // Operators cannot access client routes
      if (path.startsWith('/dashboard') && userRole === 'operator') {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }

    // CRITICAL: Return supabaseResponse, NOT NextResponse.next()
    return supabaseResponse
  } catch (e) {
    console.error('Middleware error:', e)
    // Don't crash — let the request through
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
