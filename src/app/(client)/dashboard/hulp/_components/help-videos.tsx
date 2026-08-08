'use client'

import { useMemo, useState } from 'react'
import { useT } from '@/lib/i18n/client'

interface Video {
  title: string
  id: string
}

/**
 * De videokolom rechts. Alleen deze kolom scrollt — de pagina zelf staat vast,
 * zodat de chatbot links altijd volledig in beeld blijft.
 */
export function HelpVideos({ videos }: { videos: Video[] }) {
  const t = useT()
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return videos
    return videos.filter((v) => v.title.toLowerCase().includes(q))
  }, [videos, query])

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

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {visible.map((video) => (
          <div
            key={video.id}
            className="shrink-0 overflow-hidden rounded-panel border border-line bg-panel"
          >
            <div className="px-5 py-3">
              <h3 className="text-[12.5px] font-semibold tracking-[-0.01em]">{video.title}</h3>
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
