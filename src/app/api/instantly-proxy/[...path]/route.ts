export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const INSTANTLY_ORIGIN = 'https://app.instantly.ai'

// Headers die niet doorgestuurd mogen worden naar Instantly
const STRIP_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'te',
  'upgrade',
  'proxy-authorization',
  'proxy-connection',
])

// Headers die niet teruggestuurd mogen worden naar de browser
const STRIP_RESPONSE_HEADERS = new Set([
  'transfer-encoding',
  'connection',
  'keep-alive',
  'content-encoding', // Next.js handelt compression zelf af
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
])

function rewriteSetCookieHeaders(
  setCookieHeaders: string[],
  isSecure: boolean
): string[] {
  return setCookieHeaders.map((cookie) => {
    let rewritten = cookie
    // Verwijder Domain attribuut zodat de cookie op ons domein wordt gezet
    rewritten = rewritten.replace(/;\s*domain=[^;]*/gi, '')
    // Pas SameSite aan — Lax werkt voor same-origin iframes
    rewritten = rewritten.replace(/;\s*samesite=[^;]*/gi, '')
    rewritten += '; SameSite=Lax'
    // Verwijder Secure flag op localhost (HTTP)
    if (!isSecure) {
      rewritten = rewritten.replace(/;\s*secure/gi, '')
    }
    // Herschrijf Path zodat cookies ook werken via het proxy-pad
    rewritten = rewritten.replace(/;\s*path=\/([^;]*)/gi, '; Path=/api/instantly-proxy/$1')
    // Als er geen path was, zet een root path voor de proxy
    if (!/path=/i.test(rewritten)) {
      rewritten += '; Path=/api/instantly-proxy'
    }
    return rewritten
  })
}

function rewriteHtmlContent(html: string): string {
  // Herschrijf absolute Instantly URLs naar ons proxy-pad
  return html
    .replaceAll('https://app.instantly.ai/', '/api/instantly-proxy/')
    .replaceAll('https://app.instantly.ai', '/api/instantly-proxy')
}

async function handleProxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const targetPath = '/' + path.join('/')
  const targetUrl = new URL(targetPath, INSTANTLY_ORIGIN)

  // Neem query parameters over
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value)
  })

  // Bouw request headers
  const headers = new Headers()
  request.headers.forEach((value, key) => {
    if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value)
    }
  })

  // Zet headers zodat Instantly denkt dat het een direct request is
  headers.set('Host', 'app.instantly.ai')
  headers.set('Origin', INSTANTLY_ORIGIN)
  headers.set('Referer', INSTANTLY_ORIGIN + '/')

  // Stuur cookies mee — herschrijf pad terug van proxy-pad naar origineel
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    headers.set('Cookie', cookieHeader)
  }

  // Bouw fetch opties
  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual', // We handelen redirects zelf af
  }

  // Body meesturen voor POST/PUT/PATCH/DELETE
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    fetchOptions.body = request.body
    // @ts-expect-error duplex is nodig voor streaming request bodies in Node.js
    fetchOptions.duplex = 'half'
  }

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), fetchOptions)

    // Bouw response headers
    const responseHeaders = new Headers()
    upstreamResponse.headers.forEach((value, key) => {
      if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase()) && key.toLowerCase() !== 'set-cookie') {
        responseHeaders.set(key, value)
      }
    })

    // Verwerk Set-Cookie headers
    const isSecure = request.nextUrl.protocol === 'https:'
    const setCookies = upstreamResponse.headers.getSetCookie()
    if (setCookies.length > 0) {
      const rewritten = rewriteSetCookieHeaders(setCookies, isSecure)
      rewritten.forEach((cookie) => {
        responseHeaders.append('Set-Cookie', cookie)
      })
    }

    // Hanteer redirects — herschrijf Location header naar ons proxy-pad
    if (upstreamResponse.status >= 300 && upstreamResponse.status < 400) {
      const location = upstreamResponse.headers.get('location')
      if (location) {
        let newLocation = location
        if (location.startsWith(INSTANTLY_ORIGIN)) {
          newLocation = location.replace(INSTANTLY_ORIGIN, '/api/instantly-proxy')
        } else if (location.startsWith('/')) {
          newLocation = '/api/instantly-proxy' + location
        }
        responseHeaders.set('Location', newLocation)
      }
      return new NextResponse(null, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      })
    }

    // Bepaal content type voor eventuele URL-herschrijving
    const contentType = upstreamResponse.headers.get('content-type') || ''

    if (contentType.includes('text/html')) {
      // Herschrijf HTML — vervang Instantly URLs door proxy URLs
      const html = await upstreamResponse.text()
      const rewrittenHtml = rewriteHtmlContent(html)
      responseHeaders.set('Content-Type', contentType)
      responseHeaders.delete('content-length') // Lengte verandert door rewriting
      return new NextResponse(rewrittenHtml, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      })
    }

    // Alle andere content (JS, CSS, images, JSON, etc.) — stream door
    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('[instantly-proxy] Proxy error:', error)
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 502 }
    )
  }
}

// Alle HTTP methodes ondersteunen
export const GET = handleProxy
export const POST = handleProxy
export const PUT = handleProxy
export const PATCH = handleProxy
export const DELETE = handleProxy
export const OPTIONS = handleProxy
