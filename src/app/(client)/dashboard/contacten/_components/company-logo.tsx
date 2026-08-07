'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Bedrijfslogo, herleid uit het e-maildomein van het contact.
 *
 * Het logo is een verrijking bovenop de initialen-tegel, geen vervanging: de
 * <img> staat op opacity 0 en wordt pas zichtbaar als er echt een logo
 * binnenkomt. Dat is nodig omdat de favicon-service HTTP 200 met een generieke
 * grijze globe van 16px teruggeeft voor domeinen die ze niet kent — `onError`
 * vuurt dan dus nooit. Tijdens laden, bij een onbekend domein en bij een
 * mislukte verbinding blijven de initialen staan.
 *
 * Draai dat niet om naar "tonen tenzij het misgaat": dan krijg je lege vakjes.
 */

export function domainOf(email: string | undefined | null): string {
  return (email?.split('@')[1] ?? '').trim().toLowerCase()
}

export function logoInitials(value: string): string {
  return (
    value
      .split(/[\s.]+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  )
}

/** Onze eigen route, zodat de domeinen van de klant de browser niet verlaten. */
export function logoUrlFor(domain: string): string | null {
  if (!domain) return null
  return `/api/logo/${encodeURIComponent(domain)}`
}

export function CompanyLogo({
  domain,
  label,
  size = 26,
}: {
  domain: string
  /** Waaruit de initialen worden afgeleid — meestal de bedrijfsnaam. */
  label: string
  /** Rendergrootte in px. 26 in de tabel, 38 in het detailpaneel. */
  size?: number
}) {
  const [shown, setShown] = useState(false)
  const ref = useRef<HTMLImageElement>(null)
  const src = logoUrlFor(domain)

  // Een echt logo is groter dan de 16px-placeholder voor onbekende domeinen.
  const reveal = useCallback(() => {
    const img = ref.current
    if (img && img.naturalWidth > 16) setShown(true)
  }, [])

  return (
    <span
      title={domain || undefined}
      style={{ width: size, height: size, fontSize: size < 32 ? 9.5 : 12 }}
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-[7px] border border-line bg-panel font-semibold tracking-[0.02em] text-muted"
    >
      {logoInitials(label)}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- eigen proxy-route, geen loader nodig
        <img
          ref={ref}
          src={src}
          alt=""
          loading="lazy"
          onLoad={reveal}
          onError={() => setShown(false)}
          style={{ padding: size < 32 ? 3 : 5, opacity: shown ? 1 : 0 }}
          className={`absolute inset-0 h-full w-full object-contain ${
            shown ? 'bg-panel' : 'bg-transparent'
          }`}
        />
      )}
    </span>
  )
}
