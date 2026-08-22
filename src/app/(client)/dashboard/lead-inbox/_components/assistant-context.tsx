'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AssistantSettings } from '../_lib/assistant'
import { setAssistantEnabled } from '../_lib/assistant-actions'
import type { CustomTrait } from '@/lib/lead-inbox/assistant-traits'
import type { SliderValues } from '@/lib/lead-inbox/assistant-sliders'

/**
 * De schakelaar staat in de zijkolom (layout) en het conceptantwoord op de
 * leadpagina (children). Die twee praten via deze context.
 *
 * De concepten leven hier en niet in de leadpagina zelf, zodat heen en weer
 * klikken tussen leads niet elke keer een nieuw antwoord laat schrijven.
 */

export type DraftState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; body: string }
  | { status: 'error'; message: string }
  | { status: 'discarded' }
  | { status: 'sent' }

interface AssistantContextValue {
  enabled: boolean
  available: boolean
  settings: AssistantSettings
  toggling: boolean
  toggleError: string | null
  setEnabled: (value: boolean) => void
  applySettings: (next: {
    knowledge: string
    traits: string[]
    customTraits: CustomTrait[]
    sliders: SliderValues
  }) => void
  draftFor: (leadId: string) => DraftState
  requestDraft: (leadId: string) => void
  discardDraft: (leadId: string) => void
  markSent: (leadId: string) => void
  updateDraft: (leadId: string, body: string) => void
}

const AssistantContext = createContext<AssistantContextValue | null>(null)

export function useAssistant(): AssistantContextValue {
  const value = useContext(AssistantContext)
  if (!value) {
    throw new Error('useAssistant moet binnen AssistantProvider gebruikt worden')
  }
  return value
}

export function AssistantProvider({
  initialSettings,
  children,
}: {
  initialSettings: AssistantSettings
  children: ReactNode
}) {
  const [settings, setSettings] = useState<AssistantSettings>(initialSettings)
  const [toggling, setToggling] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({})

  // Voorkomt dat twee renders vlak na elkaar hetzelfde antwoord twee keer
  // aanvragen.
  const inFlight = useRef<Set<string>>(new Set())

  const setEnabled = useCallback((value: boolean) => {
    setToggleError(null)
    setSettings((prev) => ({ ...prev, enabled: value }))
    setToggling(true)
    void setAssistantEnabled(value)
      .then((res) => {
        if (!res.ok) {
          setToggleError(res.error)
          setSettings((prev) => ({ ...prev, enabled: !value }))
        }
      })
      .finally(() => setToggling(false))
  }, [])

  const applySettings = useCallback(
    (next: {
      knowledge: string
      traits: string[]
      customTraits: CustomTrait[]
      sliders: SliderValues
    }) => {
      setSettings((prev) => ({ ...prev, ...next }))
      // Andere instellingen betekent andere antwoorden; wat er nog staat is
      // geschreven met de oude voorkeuren.
      setDrafts({})
      inFlight.current.clear()
    },
    []
  )

  const draftFor = useCallback(
    (leadId: string): DraftState => drafts[leadId] ?? { status: 'idle' },
    [drafts]
  )

  const requestDraft = useCallback((leadId: string) => {
    if (inFlight.current.has(leadId)) return
    inFlight.current.add(leadId)
    setDrafts((prev) => ({ ...prev, [leadId]: { status: 'loading' } }))

    void (async () => {
      try {
        const res = await fetch('/api/lead-inbox/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId }),
        })
        const payload = (await res.json().catch(() => ({}))) as {
          body?: string
          error?: string
        }
        if (!res.ok || !payload.body) {
          setDrafts((prev) => ({
            ...prev,
            [leadId]: {
              status: 'error',
              message: payload.error ?? 'Het opstellen is niet gelukt.',
            },
          }))
          return
        }
        setDrafts((prev) => ({
          ...prev,
          [leadId]: { status: 'ready', body: payload.body as string },
        }))
      } catch {
        setDrafts((prev) => ({
          ...prev,
          [leadId]: { status: 'error', message: 'De server was niet bereikbaar.' },
        }))
      } finally {
        inFlight.current.delete(leadId)
      }
    })()
  }, [])

  const discardDraft = useCallback((leadId: string) => {
    inFlight.current.delete(leadId)
    setDrafts((prev) => ({ ...prev, [leadId]: { status: 'discarded' } }))
  }, [])

  const markSent = useCallback((leadId: string) => {
    setDrafts((prev) => ({ ...prev, [leadId]: { status: 'sent' } }))
  }, [])

  const updateDraft = useCallback((leadId: string, body: string) => {
    setDrafts((prev) => ({ ...prev, [leadId]: { status: 'ready', body } }))
  }, [])

  const value = useMemo<AssistantContextValue>(
    () => ({
      enabled: settings.enabled,
      available: settings.available,
      settings,
      toggling,
      toggleError,
      setEnabled,
      applySettings,
      draftFor,
      requestDraft,
      discardDraft,
      markSent,
      updateDraft,
    }),
    [
      settings,
      toggling,
      toggleError,
      setEnabled,
      applySettings,
      draftFor,
      requestDraft,
      discardDraft,
      markSent,
      updateDraft,
    ]
  )

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>
}
