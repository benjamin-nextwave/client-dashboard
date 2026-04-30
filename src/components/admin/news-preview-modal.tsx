'use client'

import { useState, useEffect } from 'react'
import { useT } from '@/lib/i18n/client'
import type { Locale } from '@/lib/i18n'

// =============================================================================
// NewsContentRenderer — presentational component (Phase-10 reusable)
// -----------------------------------------------------------------------------
// IMPORTANT: this component's prop shape is the Phase-10 reuse contract. Phase 10
// will import this directly to render the client overlay/sidebar content. Keep
// the API frozen unless coordinated with the Phase-10 plan.
//
// Security: title and body are rendered as React text nodes ({title} / {body}),
// NEVER via raw-HTML insertion. React auto-escapes any HTML/JS in the
// stored content (mitigates T-09-19 / T-09-13).
// =============================================================================

export interface NewsContentRendererProps {
  image_url: string | null
  title: string
  body: string
}

export function NewsContentRenderer({ image_url, title, body }: NewsContentRendererProps) {
  const t = useT()
  return (
    <article className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-900/5">
      {image_url ? (
        // Native <img> matches existing project pattern (client-form's logo display).
        // Next/Image isn't used for this surface.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image_url}
          alt=""
          className="aspect-[16/9] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-50 text-xs text-gray-400">
          {t('operator.news.previewNoImage')}
        </div>
      )}
      <div className="space-y-4 p-6 sm:p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          {title}
        </h2>
        {/* whitespace-pre-wrap preserves operator-entered newlines without parsing as HTML */}
        <div className="whitespace-pre-wrap text-base leading-relaxed text-gray-700">
          {body}
        </div>
      </div>
    </article>
  )
}

// =============================================================================
// NewsPreviewModal — full-screen modal with NL/EN/Hindi switcher
// =============================================================================

export interface NewsPreviewModalProps {
  open: boolean
  onClose: () => void
  imageUrl: string | null
  values: {
    title_nl: string
    title_en: string
    title_hi: string
    body_nl: string
    body_en: string
    body_hi: string
  }
  initialLanguage?: Locale
}

const LANGS: Locale[] = ['nl', 'en', 'hi']

export function NewsPreviewModal({
  open,
  onClose,
  imageUrl,
  values,
  initialLanguage = 'nl',
}: NewsPreviewModalProps) {
  const t = useT()
  const [active, setActive] = useState<Locale>(initialLanguage)

  // Reset active language each time the modal opens (predictable behavior)
  useEffect(() => {
    if (open) setActive(initialLanguage)
  }, [open, initialLanguage])

  // Escape closes the modal
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const titleByLang: Record<Locale, string> = {
    nl: values.title_nl,
    en: values.title_en,
    hi: values.title_hi,
  }
  const bodyByLang: Record<Locale, string> = {
    nl: values.body_nl,
    en: values.body_en,
    hi: values.body_hi,
  }

  const tabLabels: Record<Locale, string> = {
    nl: t('operator.news.tabNl'),
    en: t('operator.news.tabEn'),
    hi: t('operator.news.tabHi'),
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Top bar with language tabs + close */}
      <div
        className="flex items-center justify-between gap-4 border-b border-white/10 bg-black/40 px-6 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">
            {t('operator.news.previewModalTitle')}
          </span>
          <span className="text-xs text-white/40">·</span>
          <span className="text-xs text-white/60">
            {t('operator.news.previewModalLanguageLabel')}
          </span>
          <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
            {LANGS.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActive(lang)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  active === lang
                    ? 'bg-white text-gray-900'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {tabLabels[lang]}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
        >
          {t('operator.news.previewModalCloseButton')}
        </button>
      </div>

      {/* Content area */}
      <div
        className="flex flex-1 items-center justify-center overflow-y-auto p-6 sm:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <NewsContentRenderer
          image_url={imageUrl}
          title={titleByLang[active]}
          body={bodyByLang[active]}
        />
      </div>
    </div>
  )
}
