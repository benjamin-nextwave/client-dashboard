'use client'

import { useState } from 'react'

const SNIPPETS = [
  'De vacature zijn we een tijdje terug tegengekomen toen we zochten naar bedrijven waar onze dienst goed bij zou passen, mogelijk is die sindsdien offline gehaald of ingevuld. Hoe dan ook, de reden dat ik je bereik is...',
  'Eerlijk gezegd heb ik die vacature gevonden tijdens wat eigen research een tijdje terug, of die nog live staat weet ik niet zeker. Het gaf me wel het idee dat jullie op dit moment aan het groeien zijn of capaciteit zoeken. Vandaar...',
  'Eerlijk gezegd weet ik niet of die vacature nog live staat, we komen er veel tegen tijdens de prospectie. Wel ben ik benieuwd of het thema nog speelt, want...',
  'We zagen de vacature voorbijkomen via [url], lijkt erop dat die inderdaad niet meer actief is. Dat sluit echter niet uit dat we nog kunnen helpen, aangezien...',
]

export function VacancySnippets() {
  const [isOpen, setIsOpen] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const [showToast, setShowToast] = useState(false)

  async function handleCopy(text: string, index: number) {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setShowToast(true)
    setTimeout(() => setCopiedIndex(null), 2000)
    setTimeout(() => setShowToast(false), 2000)
  }

  return (
    <div className="relative rounded-lg bg-white shadow">
      {showToast && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg animate-fade-in">
          Gekopieerd
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors rounded-lg"
      >
        <span>De vacature is niet meer bereikbaar...</span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 px-6 pb-5 pt-4">
          <p className="mb-4 text-sm text-gray-500">
            Als de vacature momenteel niet meer beschikbaar of bereikbaar is, kopieer 1 van deze stukjes tekst om het toe te lichten en verder te gaan met je mail.
          </p>

          <div className="space-y-3">
            {SNIPPETS.map((text, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 p-3"
              >
                <p className="flex-1 text-sm text-gray-700">{text}</p>
                <button
                  type="button"
                  onClick={() => handleCopy(text, i)}
                  title="Kopieer naar klembord"
                  className="flex-shrink-0 rounded p-1.5 text-gray-400 hover:bg-white hover:text-gray-600 transition-colors"
                >
                  {copiedIndex === i ? (
                    <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
