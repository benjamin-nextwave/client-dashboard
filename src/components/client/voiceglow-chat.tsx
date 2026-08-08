'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const AGENT_ID = 'Z0dY8erUwlxrsTOnhhMr'
const BUNDLE_SRC = 'https://vg-bunny-cdn.b-cdn.net/vg_live_build/vg_bundle.js'
const STYLESHEET = 'https://vg-bunny-cdn.b-cdn.net/vg_live_build/styles.css'
const SCRIPT_ID = 'vg-bundle'

/** De pagina die de bot ingebouwd toont; daar hoort de zwevende knop niet. */
const INLINE_ROUTE = '/dashboard/hulp'

interface VgConfig {
  ID: string
  region: string
  render: string
  modalMode: boolean
  stylesheets: string[]
}

declare global {
  interface Window {
    VG_CONFIG?: VgConfig
  }
}

/**
 * Laadt de VoiceGlow-bundle één keer per paginabezoek.
 *
 * Bewust via useEffect en niet met next/script: de widget leest window.VG_CONFIG
 * op het moment dat de bundle draait, dus de configuratie moet gegarandeerd
 * vóór het script staan. Met twee losse <Script>-tags is die volgorde niet
 * gegarandeerd; zo wel.
 *
 * Het user-blok uit de originele snippet is weggelaten — dat zou naam, e-mail
 * en telefoonnummer van de klant naar een externe dienst sturen.
 */
function useVoiceglow(render: string, modalMode: boolean) {
  useEffect(() => {
    // React draait effects twee keer in development; zonder deze check zou de
    // bundle dan dubbel geladen worden.
    if (document.getElementById(SCRIPT_ID)) return

    window.VG_CONFIG = {
      ID: AGENT_ID,
      region: 'eu',
      render,
      modalMode,
      stylesheets: [STYLESHEET],
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = BUNDLE_SRC
    script.defer = true
    document.body.appendChild(script)
  }, [render, modalMode])
}

/**
 * De zwevende knop rechtsonder, op elke klantpagina behalve Hulp & uitleg.
 *
 * De bundle leest zijn configuratie één keer bij het laden, dus zwevend en
 * ingebouwd kunnen niet samen op één pagina staan. Op de hulppagina trekt deze
 * zich terug en neemt VoiceglowInline het over.
 */
export function VoiceglowChat() {
  const pathname = usePathname()
  const inline = pathname === INLINE_ROUTE

  useVoiceglow(inline ? 'full-width' : 'bottom-right', !inline)

  if (inline) return null
  return <div id="VG_OVERLAY_CONTAINER" style={{ width: 0, height: 0 }} />
}

/** De bot als vast blok in de pagina, voor Hulp & uitleg. */
export function VoiceglowInline() {
  return (
    <div
      id="VG_OVERLAY_CONTAINER"
      className="h-[520px] w-full overflow-hidden rounded-panel border border-line bg-panel"
    />
  )
}
