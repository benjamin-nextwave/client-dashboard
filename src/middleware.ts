import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
