'use client'

import { useMemo, useRef, useState } from 'react'
import { useT } from '@/lib/i18n/client'

interface Video {
  title: string
  id: string
}

/**
 * De videokolom rechts. Alleen deze kolom scrollt — de pagina zelf staat vast,
 * zodat de chatbot links altijd volledig in beeld blijft.
 *
 * Het nummer van een video is zijn plek in de volledige lijst, niet in het
 * gefilterde resultaat: zoek je iets, dan houdt video 3 nummer 3.
 */
export function HelpVideos({ videos }: { videos: Video[] }) {
  const t = useT()
  const [query, setQuery] = useState('')
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const numbered = useMemo(
    () => videos.map((video, i) => ({ ...video, number: i + 1 })),
    [videos]
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return numbered
    return numbered.filter((v) => v.title.toLowerCase().includes(q))
  }, [numbered, query])

  function scrollTo(id: string) {
    cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative shrink-0">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[15px] w-[15px]"
          >
            <path d="m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
          </svg>
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('helpPage.searchPlaceholder')}
          aria-label={t('helpPage.videosTitle')}
          className="h-9 w-full rounded-control border border-line bg-panel pl-9 pr-3 text-[12.5px] text-fg outline-none placeholder:text-faint focus:ring-2 focus:ring-[var(--brand-color)]"
        />
      </div>

      {visible.length > 0 && (
        <div className="mt-2 flex shrink-0 flex-wrap gap-1.5">
          {visible.map((video) => (
            <button
              key={video.id}
              type="button"
              onClick={() => scrollTo(video.id)}
              title={video.title}
              aria-label={t('helpPage.goToVideo', { number: video.number })}
              className="flex h-[26px] min-w-[26px] cursor-pointer items-center justify-center rounded-[7px] border border-line bg-panel px-1.5 text-[11.5px] font-semibold tabular-nums text-muted transition-colors hover:bg-[var(--brand-08)] hover:text-brand-ink"
            >
              {video.number}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {visible.map((video) => (
          <div
            key={video.id}
            ref={(el) => {
              cardRefs.current[video.id] = el
            }}
            className="shrink-0 scroll-mt-1 overflow-hidden rounded-panel border border-line bg-panel"
          >
            <div className="flex items-center gap-2.5 px-5 py-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border border-line bg-track text-[10.5px] font-bold tabular-nums text-muted">
                {video.number}
              </span>
              <h3 className="min-w-0 flex-1 text-[12.5px] font-semibold tracking-[-0.01em]">
                {video.title}
              </h3>
            </div>
            <div className="relative aspect-video border-t border-line">
              <iframe
                src={`https://www.loom.com/embed/${video.id}`}
                title={video.title}
                className="absolute inset-0 h-full w-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        ))}

        {visible.length === 0 && (
          <p className="py-10 text-center text-[12.5px] text-faint">{t('helpPage.searchEmpty')}</p>
        )}
      </div>
    </div>
  )
}
