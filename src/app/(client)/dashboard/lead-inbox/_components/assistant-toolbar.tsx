'use client'

import { useState } from 'react'
import { useAssistant } from './assistant-context'
import { AssistantSettingsModal } from './assistant-settings-modal'

/**
 * Rechtsboven in de inbox. De rechtermarge houdt afstand tot de taalkiezer,
 * die met position: fixed op dezelfde hoogte in de hoek hangt.
 */
export function AssistantToolbar() {
  const { enabled, available, toggling, toggleError, setEnabled } = useAssistant()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <div className="flex shrink-0 items-center justify-end gap-2 px-4 pb-2.5 pr-[148px]">
        {toggleError && (
          <span className="mr-1 max-w-[520px] truncate text-[11px] text-neg" title={toggleError}>
            {toggleError}
          </span>
        )}

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={toggling}
          onClick={() => setEnabled(!enabled)}
          className={[
            'inline-flex items-center gap-2 rounded-full border py-1.5 pl-2.5 pr-3 text-[11.5px] font-semibold transition-colors disabled:opacity-60',
            enabled
              ? 'border-[var(--brand-32)] bg-[var(--brand-12)] text-brand-ink'
              : 'border-line bg-panel text-muted hover:bg-[var(--brand-05)]',
          ].join(' ')}
        >
          <span
            aria-hidden
            className={[
              'relative h-[14px] w-[26px] shrink-0 rounded-full transition-colors',
              enabled ? 'bg-brand' : 'bg-track',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-[2px] h-[10px] w-[10px] rounded-full bg-white transition-[left] duration-150',
                enabled ? 'left-[14px]' : 'left-[2px]',
              ].join(' ')}
            />
          </span>
          Antwoord assistent
        </button>

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Instellingen van de antwoord assistent"
          title="Instellingen van de antwoord assistent"
          className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full border border-line bg-panel text-muted transition-colors hover:bg-[var(--brand-05)] hover:text-fg"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.7}
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.646.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.7 7.7 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.5 6.5 0 0 1-.22.128c-.332.183-.582.495-.644.869l-.214 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.5 6.5 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.241.437-.613.43-.992a7.7 7.7 0 0 1 0-.255c.007-.378-.138-.75-.43-.991l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.281Z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>
      </div>

      {settingsOpen && (
        <AssistantSettingsModal available={available} onClose={() => setSettingsOpen(false)} />
      )}
    </>
  )
}
