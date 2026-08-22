'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ReferralModal, type ReferralDraft } from './referral-modal'

/**
 * Het blok op een doorverwijzing-lead. Zodra de lead geopend wordt, kijkt de
 * server of er een adres bekend is — uit de reactie zelf of uit de gegevens
 * die NextWave heeft opgezocht. Is dat zo, dan verschijnt de knop; zo niet,
 * dan de mededeling dat NextWave er nog naar kijkt.
 *
 * De mail zelf wordt pas geschreven als er op de knop geklikt wordt. Bij het
 * openen van een lead alleen ontleden scheelt een hoop onnodig schrijfwerk.
 */

type Analyse =
  | { status: 'loading' }
  | {
      status: 'ready'
      toEmail: string
      source: 'nextwave' | 'mail' | null
      referredName: string | null
      referredRole: string | null
    }
  | { status: 'awaiting'; referredName: string | null; referredRole: string | null }
  | { status: 'error'; message: string }

export function ReferralOutreach({
  leadId,
  leadEmail,
  leadName,
  sendingAccount,
  alreadySentTo,
}: {
  leadId: string
  leadEmail: string
  leadName: string | null
  sendingAccount: string
  /** Adres waar al naartoe gemaild is, of null. */
  alreadySentTo: string | null
}) {
  const [analyse, setAnalyse] = useState<Analyse>({ status: 'loading' })
  const [draft, setDraft] = useState<ReferralDraft | null>(null)
  const [composing, setComposing] = useState(false)
  const [composeError, setComposeError] = useState<string | null>(null)
  const [justSent, setJustSent] = useState<string | null>(null)
  const started = useRef(false)

  const run = useCallback(
    async (step: 'analyse' | 'compose') => {
      const res = await fetch('/api/lead-inbox/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, step }),
      })
      const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) {
        throw new Error(
          typeof payload.error === 'string' ? payload.error : 'Er ging iets mis.'
        )
      }
      return payload
    },
    [leadId]
  )

  useEffect(() => {
    if (alreadySentTo) return
    if (started.current) return
    started.current = true

    void (async () => {
      try {
        const p = await run('analyse')
        if (p.status === 'ready') {
          setAnalyse({
            status: 'ready',
            toEmail: String(p.toEmail),
            source: (p.source as 'nextwave' | 'mail' | null) ?? null,
            referredName: (p.referredName as string | null) ?? null,
            referredRole: (p.referredRole as string | null) ?? null,
          })
        } else {
          setAnalyse({
            status: 'awaiting',
            referredName: (p.referredName as string | null) ?? null,
            referredRole: (p.referredRole as string | null) ?? null,
          })
        }
      } catch (err) {
        setAnalyse({
          status: 'error',
          message: err instanceof Error ? err.message : 'Er ging iets mis.',
        })
      }
    })()
  }, [alreadySentTo, run])

  async function openModal() {
    if (analyse.status !== 'ready') return
    setComposeError(null)
    setComposing(true)
    try {
      const p = await run('compose')
      setDraft({
        toEmail: String(p.toEmail),
        fromEmail: String(p.fromEmail ?? sendingAccount),
        subject: String(p.subject ?? ''),
        body: String(p.body ?? ''),
        referredName: (p.referredName as string | null) ?? null,
        referredRole: (p.referredRole as string | null) ?? null,
        source: (p.source as 'nextwave' | 'mail' | null) ?? null,
      })
    } catch (err) {
      setComposeError(err instanceof Error ? err.message : 'Er ging iets mis.')
    } finally {
      setComposing(false)
    }
  }

  const sentTo = justSent ?? alreadySentTo
  if (sentTo) {
    return (
      <Frame>
        <div className="flex items-center gap-2.5 text-[12.5px] text-pos">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <span>
            De doorverwijzing is benaderd op{' '}
            <strong className="font-semibold">{sentTo}</strong>.
          </span>
        </div>
      </Frame>
    )
  }

  if (analyse.status === 'loading') {
    return (
      <Frame>
        <div className="flex items-center gap-2 text-[12.5px] text-muted">
          <Spinner />
          De doorverwijzing wordt bekeken…
        </div>
      </Frame>
    )
  }

  if (analyse.status === 'error') {
    return (
      <Frame>
        <p className="text-[12.5px] text-neg">{analyse.message}</p>
      </Frame>
    )
  }

  if (analyse.status === 'awaiting') {
    return (
      <Frame>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--c-warn)_15%,transparent)] text-warn">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.9} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </span>
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold tracking-[-0.01em]">
              Wachten op de contactgegevens
            </h3>
            <p className="mt-1 text-[12.5px] leading-[1.55] text-muted">
              {analyse.referredName
                ? `Er is doorverwezen naar ${analyse.referredName}${
                    analyse.referredRole ? ` (${analyse.referredRole})` : ''
                  }, maar zonder e-mailadres.`
                : 'In deze reactie staat geen e-mailadres van de persoon naar wie is doorverwezen.'}{' '}
              NextWave zoekt de gegevens op en zet ze erbij. Zodra dat gebeurd is, kun je hier
              de doorverwijzing benaderen.
            </p>
          </div>
        </div>
      </Frame>
    )
  }

  return (
    <>
      <div className="rounded-panel border border-[var(--brand-32)] bg-[var(--brand-06)] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold tracking-[-0.01em]">
              Er is doorverwezen naar iemand anders
            </h3>
            <p className="mt-1 text-[12.5px] leading-[1.55] text-muted">
              {analyse.referredName ? `${analyse.referredName} — ` : ''}
              <span className="font-medium text-fg">{analyse.toEmail}</span>
              {analyse.source === 'nextwave' ? ' · door NextWave opgezocht' : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={openModal}
            disabled={composing}
            className="inline-flex shrink-0 items-center gap-2 rounded-control bg-[var(--brand-color)] px-6 py-3 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {composing ? (
              <>
                <Spinner />
                De mail wordt geschreven…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.9} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.77 59.77 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
                Doorverwijzing benaderen
              </>
            )}
          </button>
        </div>

        {composeError && <p className="mt-2.5 text-[11.5px] text-neg">{composeError}</p>}
      </div>

      {draft && (
        <ReferralModal
          leadId={leadId}
          leadEmail={leadEmail}
          leadName={leadName}
          draft={draft}
          onClose={() => setDraft(null)}
          onSent={() => {
            setJustSent(draft.toEmail)
            setDraft(null)
          }}
        />
      )}
    </>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-panel border border-line bg-panel px-5 py-4">{children}</div>
  )
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4l3-3-3-3v4a8 8 0 1 0 8 8h-2a6 6 0 1 1-12 0z"
        className="opacity-75"
      />
    </svg>
  )
}
