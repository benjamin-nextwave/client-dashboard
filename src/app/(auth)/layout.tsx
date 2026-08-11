import type { Metadata } from 'next'
import Image from 'next/image'
import { OutreachScene } from '@/components/auth/outreach-scene'

export const metadata: Metadata = {
  title: 'Inloggen',
}

/** Legenda onder de visual — beschrijft de stappen, toont geen cijfers. */
const STAGES = [
  { label: 'Verzonden', dot: 'rgb(255 255 255 / 0.35)' },
  { label: 'Geopend', dot: 'var(--c-brand-lift)' },
  { label: 'Beantwoord', dot: 'var(--c-cat-meeting)' },
]

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // client-theme draagt de ontwerptokens; --brand-color staat op hetzelfde
    // element omdat de merk-tinten anders op de standaardkleur bevriezen. Hier
    // is dat bewust het Nextwave-blauw en niet de klantkleur: bij het inloggen
    // is nog niet bekend wie er inlogt.
    <div
      className="client-theme min-h-screen bg-canvas font-[family-name:var(--font-instrument-sans)] text-fg"
      style={{ '--brand-color': '#3B82F6' } as React.CSSProperties}
    >
      <div className="grid min-h-screen lg:h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
        {/* Merkkolom. Het Nextwave-logo is wit, dus het moet op donker staan —
            dezelfde inkt als de zijbalk van het dashboard. */}
        <section className="relative flex flex-col overflow-hidden bg-ink px-8 py-10 lg:px-14 lg:py-12">
          <div
            aria-hidden
            className="auth-glow-top auth-breathe pointer-events-none absolute -left-40 -top-48 h-[560px] w-[560px] rounded-full"
          />
          <div
            aria-hidden
            className="auth-glow-bottom pointer-events-none absolute -bottom-56 -right-40 h-[520px] w-[520px] rounded-full"
          />
          <div aria-hidden className="auth-grid pointer-events-none absolute inset-0" />

          <div className="relative flex h-full min-h-0 flex-col">
            <Image
              src="/nextwave-logo-wide.png"
              alt="Nextwave Solutions"
              width={560}
              height={165}
              priority
              className="h-auto w-[168px]"
            />

            <div className="auth-rise mt-10 max-w-[27rem] lg:mt-14">
              <h2 className="text-[26px] font-semibold leading-[1.2] tracking-[-0.01em] text-white lg:text-[30px]">
                Van eerste mail
                <br />
                tot afspraak in de agenda.
              </h2>
              <p className="mt-3 text-[13.5px] leading-relaxed text-white/55">
                Uw campagnes, leads en antwoorden bij elkaar in één overzicht.
              </p>
            </div>

            {/* De visual vult wat er overblijft en krimpt mee op lage vensters —
                min-h-0 is nodig omdat een flex-kind anders niet kleiner wordt
                dan zijn inhoud. Op smalle schermen vervalt hij en wordt de
                kolom een compacte kop. */}
            <div className="hidden min-h-0 flex-1 items-center justify-center py-8 lg:flex">
              <OutreachScene />
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 lg:mt-0">
              {STAGES.map((stage) => (
                <span
                  key={stage.label}
                  className="flex items-center gap-2 text-[11.5px] font-medium tracking-[0.02em] text-white/45"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: stage.dot }}
                  />
                  {stage.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Formulierkolom. */}
        <section className="flex items-center justify-center overflow-y-auto px-6 py-14 lg:px-12">
          <div className="w-full max-w-[380px]">{children}</div>
        </section>
      </div>
    </div>
  )
}
