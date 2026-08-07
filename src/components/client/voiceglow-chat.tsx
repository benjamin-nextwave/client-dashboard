'use client'

import { useEffect } from 'react'

const AGENT_ID = 'Z0dY8erUwlxrsTOnhhMr'
const BUNDLE_SRC = 'https://vg-bunny-cdn.b-cdn.net/vg_live_build/vg_bundle.js'
const STYLESHEET = 'https://vg-bunny-cdn.b-cdn.net/vg_live_build/styles.css'
const SCRIPT_ID = 'vg-bundle'

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
 * Chatwidget van VoiceGlow.
 *
 * Bewust via useEffect en niet met next/script: de widget leest window.VG_CONFIG
 * op het moment dat de bundle draait, dus de configuratie moet gegarandeerd
 * vóór het script staan. Met twee losse <Script>-tags is die volgorde niet
 * gegarandeerd; zo wel.
 *
 * Het user-blok uit de originele snippet is weggelaten — dat zou naam, e-mail
 * en telefoonnummer van de klant naar een externe dienst sturen.
 */
export function VoiceglowChat() {
  useEffect(() => {
    // React draait effects twee keer in development; zonder deze check zou de
    // bundle dan dubbel geladen worden.
    if (document.getElementById(SCRIPT_ID)) return

    window.VG_CONFIG = {
      ID: AGENT_ID,
      region: 'eu',
      render: 'bottom-right',
      modalMode: true,
      stylesheets: [STYLESHEET],
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = BUNDLE_SRC
    script.defer = true
    document.body.appendChild(script)
  }, [])

  return <div id="VG_OVERLAY_CONTAINER" style={{ width: 0, height: 0 }} />
}
