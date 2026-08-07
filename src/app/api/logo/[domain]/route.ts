import { NextResponse } from 'next/server'

/**
 * Proxy voor bedrijfslogo's, herleid uit het e-maildomein van een contact.
 *
 * Waarom deze route bestaat: zonder proxy zou de browser van de klant bij elke
 * paginaweergave de domeinen van zijn eigen prospects rechtstreeks naar Google
 * sturen. Nu praat de browser alleen met ons eigen domein en gaat er per uniek
 * domein hooguit één verzoek naar buiten, dat daarna van de CDN-rand komt.
 *
 * Het is geen algemene proxy: de enige bestemming die deze route kent is de
 * favicon-service van Google, en het domein moet een geldige hostnaam zijn.
 */

const UPSTREAM = 'https://www.google.com/s2/favicons'

// Gewone hostnaam: labels van letters, cijfers en koppeltekens, minstens één
// punt, geen poort, geen pad, geen inlognaam.
const HOSTNAME = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/

/** Een mislukking cachen we kort: het domein kan later alsnog een logo krijgen. */
const MISS_HEADERS = { 'Cache-Control': 'public, max-age=3600' }

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain: raw } = await params
  const domain = decodeURIComponent(raw).toLowerCase()

  if (domain.length > 253 || !HOSTNAME.test(domain)) {
    return new NextResponse(null, { status: 404, headers: MISS_HEADERS })
  }

  try {
    const upstream = await fetch(
      `${UPSTREAM}?domain=${encodeURIComponent(domain)}&sz=128`,
      { signal: AbortSignal.timeout(5000) }
    )

    const type = upstream.headers.get('content-type') ?? ''
    if (!upstream.ok || !type.startsWith('image/')) {
      return new NextResponse(null, { status: 404, headers: MISS_HEADERS })
    }

    const body = await upstream.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': type,
        // s-maxage cachet op de CDN-rand van Vercel, zodat een tweede bezoeker
        // geen nieuw verzoek naar buiten veroorzaakt.
        'Cache-Control': 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('[api:logo] fetch mislukt', domain, error)
    return new NextResponse(null, { status: 404, headers: MISS_HEADERS })
  }
}
