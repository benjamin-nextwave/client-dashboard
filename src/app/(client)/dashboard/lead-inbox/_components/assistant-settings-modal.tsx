'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  ASSISTANT_TRAITS,
  TRAIT_GROUPS,
  toggleTrait,
  type CustomTrait,
} from '@/lib/lead-inbox/assistant-traits'
import { saveAssistantSettings } from '../_lib/assistant-actions'
import { useAssistant } from './assistant-context'

type Tab = 'prompt' | 'kennisbank'

const KNOWLEDGE_LIMIT = 8000

/**
 * Zoekwoorden gelijktrekken. Het Nederlands wisselt in meervouden van s naar z
 * en van f naar v — "prijs" wordt "prijzen", "brief" wordt "brieven". Zonder
 * deze stap vindt een zoekopdracht op "prijs" de eigenschap "Noem geen
 * prijzen" niet.
 */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/z/g, 's')
    .replace(/v/g, 'f')
}

/** Elk woord uit de zoekopdracht moet ergens in de tekst voorkomen. */
function matchesSearch(haystack: string, words: string[]): boolean {
  const normalized = normalize(haystack)
  return words.every((word) => normalized.includes(word))
}

export function AssistantSettingsModal({
  available,
  onClose,
}: {
  available: boolean
  onClose: () => void
}) {
  const { settings, applySettings } = useAssistant()

  const [tab, setTab] = useState<Tab>('prompt')
  const [search, setSearch] = useState('')
  const [traits, setTraits] = useState<string[]>(settings.traits)
  const [customTraits, setCustomTraits] = useState<CustomTrait[]>(settings.customTraits)
  const [knowledge, setKnowledge] = useState(settings.knowledge)
  const [newTrait, setNewTrait] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const term = search.trim()

  const visibleGroups = useMemo(() => {
    const words = normalize(term).split(/\s+/).filter(Boolean)
    return TRAIT_GROUPS.map((group) => ({
      group,
      traits: ASSISTANT_TRAITS.filter(
        (t) =>
          t.group === group.id &&
          (words.length === 0 ||
            matchesSearch(`${t.label} ${t.instruction} ${group.label}`, words))
      ),
    })).filter((entry) => entry.traits.length > 0)
  }, [term])

  const selectedCount = traits.length + customTraits.length

  function addCustomTrait() {
    const label = newTrait.trim()
    if (!label) return
    setCustomTraits((prev) => [
      ...prev,
      { id: `eigen-${Date.now()}-${prev.length}`, label },
    ])
    setNewTrait('')
    setSaved(false)
  }

  function save() {
    setError(null)
    startTransition(async () => {
      const res = await saveAssistantSettings({
        enabled: settings.enabled,
        knowledge,
        traits,
        customTraits,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      applySettings({ knowledge, traits, customTraits })
      setSaved(true)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Instellingen van de antwoord assistent"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[86vh] w-full max-w-[720px] flex-col overflow-hidden rounded-panel border border-line bg-panel"
      >
        {/* Kop */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-[-0.015em]">
              Antwoord assistent
            </h2>
            <p className="mt-1 text-[12.5px] leading-[1.5] text-muted">
              Kies hoe de assistent schrijft en waar hij zijn informatie vandaan haalt. Hij
              stelt alleen voor — versturen doe je zelf.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="shrink-0 rounded-control p-1.5 text-faint transition-colors hover:bg-[var(--brand-05)] hover:text-fg"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!available && (
          <p className="shrink-0 border-b border-line bg-[color-mix(in_oklab,var(--c-warn)_10%,transparent)] px-5 py-2.5 text-[11.5px] text-warn">
            De database-migratie <code>lead_inbox_ai_settings</code> is nog niet gedraaid.
            Je kunt hier al kijken, maar opslaan lukt pas daarna.
          </p>
        )}

        {/* Tabbladen */}
        <div className="flex shrink-0 gap-0.5 border-b border-line px-5 pt-3">
          {(
            [
              ['prompt', 'Prompt'],
              ['kennisbank', 'Kennisbank'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-current={tab === key ? 'true' : undefined}
              className={[
                'rounded-t-control px-3.5 py-2 text-[12.5px] transition-colors',
                tab === key
                  ? 'border-b-2 border-[var(--brand-color)] font-semibold text-fg'
                  : 'border-b-2 border-transparent font-medium text-muted hover:text-fg',
              ].join(' ')}
            >
              {label}
              {key === 'prompt' && selectedCount > 0 && (
                <span className="ml-1.5 rounded-full bg-[var(--brand-12)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-brand-ink">
                  {selectedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Inhoud */}
        {tab === 'prompt' ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 space-y-2.5 border-b border-line px-5 py-3">
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Zoek een eigenschap — bijvoorbeeld formeel, kort, prijzen"
                  aria-label="Zoek een eigenschap"
                  className="w-full rounded-control border border-line bg-canvas py-1.5 pl-8 pr-3 text-[12.5px] outline-none transition-colors placeholder:text-faint focus:border-[var(--brand-color)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTrait}
                  onChange={(e) => setNewTrait(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCustomTrait()
                    }
                  }}
                  placeholder="Eigen eigenschap — bijvoorbeeld: noem altijd onze openingstijden"
                  aria-label="Eigen eigenschap toevoegen"
                  className="min-w-0 flex-1 rounded-control border border-line bg-canvas px-3 py-1.5 text-[12.5px] outline-none transition-colors placeholder:text-faint focus:border-[var(--brand-color)]"
                />
                <button
                  type="button"
                  onClick={addCustomTrait}
                  disabled={!newTrait.trim()}
                  aria-label="Eigenschap toevoegen"
                  className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-control bg-[var(--brand-color)] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {customTraits.length > 0 && !term && (
                <section className="mb-5">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                    Eigen eigenschappen
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {customTraits.map((trait) => (
                      <span
                        key={trait.id}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--brand-32)] bg-[var(--brand-12)] py-1 pl-3 pr-1.5 text-[11.5px] font-medium text-brand-ink"
                      >
                        <span className="truncate">{trait.label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomTraits((prev) => prev.filter((t) => t.id !== trait.id))
                            setSaved(false)
                          }}
                          aria-label={`Verwijder eigenschap ${trait.label}`}
                          className="shrink-0 rounded-full p-0.5 hover:bg-[var(--brand-20)]"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {visibleGroups.length === 0 ? (
                <p className="py-8 text-center text-[12.5px] text-muted">
                  Geen eigenschap gevonden voor &quot;{search.trim()}&quot;. Je kunt hem
                  hierboven zelf toevoegen.
                </p>
              ) : (
                visibleGroups.map(({ group, traits: groupTraits }) => (
                  <section key={group.id} className="mb-5 last:mb-0">
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                      {group.label}
                    </h3>
                    <p className="mt-0.5 text-[11.5px] text-muted">{group.hint}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {groupTraits.map((trait) => {
                        const active = traits.includes(trait.id)
                        return (
                          <button
                            key={trait.id}
                            type="button"
                            aria-pressed={active}
                            title={trait.instruction}
                            onClick={() => {
                              setTraits((prev) => toggleTrait(prev, trait.id))
                              setSaved(false)
                            }}
                            className={[
                              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-medium transition-colors',
                              active
                                ? 'border-[var(--brand-32)] bg-[var(--brand-12)] text-brand-ink'
                                : 'border-line bg-panel text-muted hover:bg-[var(--brand-05)] hover:text-fg',
                            ].join(' ')}
                          >
                            {active && (
                              <svg
                                className="h-3 w-3 shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={3}
                                stroke="currentColor"
                                aria-hidden
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                            )}
                            {trait.label}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <label
              htmlFor="assistant-knowledge"
              className="text-[12.5px] font-semibold text-fg"
            >
              Wat moet de assistent weten?
            </label>
            <p className="mt-1 text-[11.5px] leading-[1.55] text-muted">
              Alles wat je hier zet mag de assistent gebruiken als feit: wat je precies
              levert, veelgestelde vragen met het antwoord erop, wat je juist níet belooft.
              Staat iets hier niet, dan verzint hij het niet — dan laat hij het weg.
            </p>
            <textarea
              id="assistant-knowledge"
              value={knowledge}
              onChange={(e) => {
                setKnowledge(e.target.value.slice(0, KNOWLEDGE_LIMIT))
                setSaved(false)
              }}
              rows={16}
              placeholder={
                'Bijvoorbeeld:\n\nWij leveren … voor bedrijven in …\nEen kennismaking duurt 20 minuten en is gratis.\nWij werken niet met jaarcontracten.\nVeelgestelde vraag: “Hoe snel kunnen jullie starten?” — meestal binnen twee weken.'
              }
              className="mt-3 block w-full resize-y rounded-control border border-line bg-canvas px-3 py-2.5 text-[12.5px] leading-[1.6] text-fg outline-none transition-colors placeholder:text-faint focus:border-[var(--brand-color)]"
            />
            <p className="mt-1.5 text-right text-[11px] tabular-nums text-faint">
              {knowledge.length} / {KNOWLEDGE_LIMIT}
            </p>
          </div>
        )}

        {/* Voet */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
          <div className="min-w-0 text-[11.5px]">
            {error ? (
              <span className="text-neg">{error}</span>
            ) : saved ? (
              <span className="inline-flex items-center gap-1.5 text-pos">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Opgeslagen
              </span>
            ) : (
              <span className="text-muted">
                {selectedCount === 0
                  ? 'Nog geen eigenschappen gekozen.'
                  : selectedCount === 1
                    ? '1 eigenschap gekozen.'
                    : `${selectedCount} eigenschappen gekozen.`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-control px-3.5 py-2 text-[12.5px] font-medium text-fg transition-colors hover:bg-[var(--brand-05)]"
            >
              Sluiten
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded-control bg-[var(--brand-color)] px-4 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Opslaan…' : 'Opslaan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
