'use client'

import { useActionState, useState } from 'react'
import {
  COMPANY_SIZES,
  COMPANY_SIZE_LABELS,
  GEO_RADII,
  GEO_RADIUS_LABELS,
  type GeoRadius,
  type LocationEntry,
} from '@/lib/validations/campaign-form'

interface Props {
  action: (
    prevState: { fieldErrors?: Record<string, string>; error?: string },
    formData: FormData
  ) => Promise<{ fieldErrors?: Record<string, string>; error?: string }>
  companyName: string
}

type SkipName =
  | 'companyName'
  | 'senderName'
  | 'sectors'
  | 'locations'
  | 'companySizes'
  | 'riskReversal'
  | 'cta'
  | 'offer'
  | 'aboutCompany'
  | 'examples'
  | 'comments'
  | 'positiveReplyEmail'
  | 'domains'

export function CampaignForm({ action, companyName }: Props) {
  const [state, formAction, pending] = useActionState(action, {})
  const errors = state.fieldErrors ?? {}

  const [skipped, setSkipped] = useState<Set<SkipName>>(new Set())
  const toggleSkip = (name: SkipName) =>
    setSkipped((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  const isSkipped = (name: SkipName) => skipped.has(name)

  // Dynamic field state
  const [sectors, setSectors] = useState<string[]>([''])
  const addSector = () => setSectors((prev) => [...prev, ''])
  const updateSector = (i: number, v: string) =>
    setSectors((prev) => prev.map((s, idx) => (idx === i ? v : s)))
  const removeSector = (i: number) =>
    setSectors((prev) => (prev.length === 1 ? [''] : prev.filter((_, idx) => idx !== i)))

  const [locations, setLocations] = useState<LocationEntry[]>([{ location: '', radiusKm: 0 }])
  const addLocation = () =>
    setLocations((prev) => [...prev, { location: '', radiusKm: 0 }])
  const updateLocation = (i: number, patch: Partial<LocationEntry>) =>
    setLocations((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const removeLocation = (i: number) =>
    setLocations((prev) =>
      prev.length === 1 ? [{ location: '', radiusKm: 0 }] : prev.filter((_, idx) => idx !== i)
    )

  const [sizes, setSizes] = useState<string[]>([])
  const toggleSize = (size: string) =>
    setSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]))

  const [domainsChoice, setDomainsChoice] = useState<'user' | 'nextwave'>('user')

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Q1 — Company name (editable, pre-filled) */}
      <Question
        number={1}
        title="Bedrijfsnaam"
        description="Wat is de naam van jouw bedrijf? Standaard gevuld op basis van je account, maar je kunt dit nog wijzigen."
        skipped={isSkipped('companyName')}
        onToggleSkip={() => toggleSkip('companyName')}
        skipName="companyName"
        error={errors.companyName}
      >
        <input
          type="text"
          name="companyName"
          defaultValue={companyName}
          className={inputClass(!!errors.companyName)}
        />
      </Question>

      {/* Q2 — Sender name */}
      <Question
        number={2}
        title="Afzender van de e-mails"
        description="Van wie moeten de e-mails verstuurd worden tijdens de campagne? Dit is de naam die ontvangers zien als afzender."
        skipped={isSkipped('senderName')}
        onToggleSkip={() => toggleSkip('senderName')}
        skipName="senderName"
        error={errors.senderName}
      >
        <input
          type="text"
          name="senderName"
          placeholder="Bv. Jan Jansen"
          className={inputClass(!!errors.senderName)}
        />
      </Question>

      {/* Q3 — Sectors */}
      <Question
        number={3}
        title="Branche of sector van jouw ideale klanten"
        description='Omschrijf in welke branche of sector jouw ideale klanten actief zijn. Hoe specifieker, hoe beter wij de juiste beslissers kunnen bereiken. Je kan meerdere sectoren opgeven.'
        skipped={isSkipped('sectors')}
        onToggleSkip={() => toggleSkip('sectors')}
        skipName="sectors"
        error={errors.sectors}
      >
        <div className="space-y-2">
          {sectors.map((sector, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                name="sectors"
                value={sector}
                onChange={(e) => updateSector(i, e.target.value)}
                placeholder={`Sector ${i + 1}`}
                className={inputClass(false)}
              />
              {sectors.length > 1 && (
                <RemoveButton onClick={() => removeSector(i)} label="Sector verwijderen" />
              )}
            </div>
          ))}
          <AddButton onClick={addSector} label="Sector toevoegen" />
        </div>
      </Question>

      {/* Q4 — Locations (multi) */}
      <Question
        number={4}
        title="Geografisch gebied"
        description='Omschrijf waar je klanten zoekt. Per locatie kies je hoe ver je bereik mag zijn. Je kan meerdere locaties opgeven — bv. "Utrecht" + 50 km én "Groningen" + 25 km.'
        skipped={isSkipped('locations')}
        onToggleSkip={() => toggleSkip('locations')}
        skipName="locations"
        error={errors.locations}
      >
        <input type="hidden" name="locations" value={JSON.stringify(locations)} />
        <div className="space-y-3">
          {locations.map((loc, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={loc.location}
                  onChange={(e) => updateLocation(i, { location: e.target.value })}
                  placeholder={`Locatie ${i + 1} (bv. Utrecht)`}
                  className={inputClass(false)}
                />
                {locations.length > 1 && (
                  <RemoveButton onClick={() => removeLocation(i)} label="Locatie verwijderen" />
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {GEO_RADII.map((r) => {
                  const active = loc.radiusKm === r
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => updateLocation(i, { radiusKm: r as GeoRadius })}
                      className={`rounded-lg border px-3 py-2 text-[11px] font-semibold transition-all ${
                        active
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm ring-2 ring-indigo-100'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {GEO_RADIUS_LABELS[r]}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <AddButton onClick={addLocation} label="Locatie toevoegen" />
        </div>
      </Question>

      {/* Q5 — Company size */}
      <Question
        number={5}
        title="Bedrijfsgrootte van ideale klant"
        description="Omschrijf wat de gemiddelde omvang van jouw ideale klant is. Je mag meerdere opties kiezen."
        skipped={isSkipped('companySizes')}
        onToggleSkip={() => toggleSkip('companySizes')}
        skipName="companySizes"
        error={errors.companySizes}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {COMPANY_SIZES.map((size) => {
            const checked = sizes.includes(size)
            return (
              <label
                key={size}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                  checked
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm ring-2 ring-indigo-100'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  name="companySizes"
                  value={size}
                  checked={checked}
                  onChange={() => toggleSize(size)}
                  className="sr-only"
                />
                <div
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 ${
                    checked ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 bg-white'
                  }`}
                >
                  {checked && (
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </div>
                {COMPANY_SIZE_LABELS[size]}
              </label>
            )
          })}
        </div>
      </Question>

      {/* Q6 */}
      <Question
        number={6}
        title="Risk Reversal"
        description='Een "risk reversal" haalt het risico bij de klant weg. Denk aan: vrijblijvende kennismaking, gratis proefperiode, niet goed = geld terug, betalen na resultaat, of gratis eerste advies. Wat doe jij om vertrouwen te winnen en drempels te verlagen? Geen vaste aanpak? Laat het weten, dan denken wij mee.'
        skipped={isSkipped('riskReversal')}
        onToggleSkip={() => toggleSkip('riskReversal')}
        skipName="riskReversal"
        error={errors.riskReversal}
      >
        <textarea name="riskReversal" rows={4} className={inputClass(!!errors.riskReversal)} />
      </Question>

      {/* Q7 */}
      <Question
        number={7}
        title="Call-to-Action (CTA)"
        description='Wat wil je dat mensen doen na het lezen van jouw mail? Denk aan "Een kennismakingsgesprek inplannen", "Een offerte aanvragen", "Een korte demo bekijken", of "Antwoord geven op de mail". Kies één duidelijke actie.'
        skipped={isSkipped('cta')}
        onToggleSkip={() => toggleSkip('cta')}
        skipName="cta"
        error={errors.cta}
      >
        <textarea name="cta" rows={3} className={inputClass(!!errors.cta)} />
      </Question>

      {/* Q8 */}
      <Question
        number={8}
        title="Jouw aanbod"
        description="Wat is het aanbod of de dienst/product die je wilt verkopen via deze campagne? Wat zijn de belangrijkste voordelen en waarom zouden klanten hiervoor kiezen?"
        skipped={isSkipped('offer')}
        onToggleSkip={() => toggleSkip('offer')}
        skipName="offer"
        error={errors.offer}
      >
        <textarea name="offer" rows={5} className={inputClass(!!errors.offer)} />
      </Question>

      {/* Q9 */}
      <Question
        number={9}
        title="Over jouw bedrijf"
        description="Geef zoveel mogelijk informatie over jouw bedrijf. Wat doen jullie, hoe lang bestaan jullie, unieke kenmerken, specialisaties, behaalde resultaten, certificeringen, teamgrootte, missie/visie. Hoe meer context, hoe beter."
        skipped={isSkipped('aboutCompany')}
        onToggleSkip={() => toggleSkip('aboutCompany')}
        skipName="aboutCompany"
        error={errors.aboutCompany}
      >
        <textarea name="aboutCompany" rows={6} className={inputClass(!!errors.aboutCompany)} />
      </Question>

      {/* Q10 */}
      <Question
        number={10}
        title="Voorbeelden of referenties"
        description='Heb je voorbeelden van eerdere campagnes, teksten of stijlen die je aanspreken? Plak een link of korte omschrijving ("de toon van [bedrijf X] vind ik sterk").'
        skipped={isSkipped('examples')}
        onToggleSkip={() => toggleSkip('examples')}
        skipName="examples"
        error={errors.examples}
      >
        <textarea name="examples" rows={4} className={inputClass(!!errors.examples)} />
      </Question>

      {/* Q11 */}
      <Question
        number={11}
        title="Opmerkingen of aanvullingen"
        description="Alles wat verder belangrijk is. Doelgroepdetails, uitsluitingen (wie juist níet benaderen), tone of voice, vragen."
        skipped={isSkipped('comments')}
        onToggleSkip={() => toggleSkip('comments')}
        skipName="comments"
        error={errors.comments}
      >
        <textarea name="comments" rows={4} className={inputClass(!!errors.comments)} />
      </Question>

      {/* Q12 — email */}
      <Question
        number={12}
        title="E-mailadres voor positieve reacties"
        description="Naar welk e-mailadres moeten positieve reacties op de campagne worden doorgestuurd?"
        skipped={isSkipped('positiveReplyEmail')}
        onToggleSkip={() => toggleSkip('positiveReplyEmail')}
        skipName="positiveReplyEmail"
        error={errors.positiveReplyEmail}
      >
        <input
          type="email"
          name="positiveReplyEmail"
          required
          placeholder="jij@bedrijf.nl"
          pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
          title="Voer een geldig e-mailadres in"
          className={inputClass(!!errors.positiveReplyEmail)}
        />
      </Question>

      {/* Q13 */}
      <Question
        number={13}
        title="Domeinen voor mailboxen"
        description="We hebben 2 domeinen nodig: één voor het versturen en één als backup. Gebruik géén domeinen die je al actief inzet voor bedrijfsmail of website. Voeg bijvoorbeeld een woord uit je slogan toe of gebruik de locatie (als je bedrijf 'bedrijf.nl' is, koop dan 'bedrijf-amsterdam.nl' en 'bedrijven.nl')."
        skipped={isSkipped('domains')}
        onToggleSkip={() => toggleSkip('domains')}
        skipName="domains"
        error={errors.domainsText}
      >
        <input type="hidden" name="domainsChoice" value={domainsChoice} />
        <div className="space-y-3">
          <textarea
            name="domainsText"
            rows={4}
            placeholder="Geef suggesties of toelichtingen"
            disabled={domainsChoice === 'nextwave'}
            className={`${inputClass(!!errors.domainsText)} ${
              domainsChoice === 'nextwave' ? 'cursor-not-allowed bg-gray-100 text-gray-400' : ''
            }`}
          />
          <button
            type="button"
            onClick={() => setDomainsChoice((prev) => (prev === 'user' ? 'nextwave' : 'user'))}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all ${
              domainsChoice === 'nextwave'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            {domainsChoice === 'nextwave' ? (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                NextWave kiest de domeinen
              </>
            ) : (
              'Laat het NextWave team domeinen kiezen'
            )}
          </button>
        </div>
      </Question>

      {/* Sticky submit */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/95 p-3 pl-5 shadow-lg backdrop-blur">
        <p className="text-xs text-gray-500">
          Je kunt het formulier maar één keer indienen.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-600/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {pending ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Indienen...
            </>
          ) : (
            <>
              Formulier indienen
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  )
}

function inputClass(hasError: boolean) {
  return `block w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all focus:outline-none focus:ring-4 ${
    hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
      : 'border-gray-200 focus:border-indigo-400 focus:ring-indigo-100'
  }`
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      {label}
    </button>
  )
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

function Question({
  number,
  title,
  description,
  error,
  skipped,
  onToggleSkip,
  skipName,
  children,
}: {
  number: number
  title: string
  description: string
  error?: string
  skipped: boolean
  onToggleSkip: () => void
  skipName: SkipName
  children: React.ReactNode
}) {
  return (
    <section
      className={`rounded-2xl border p-6 shadow-sm transition-colors ${
        skipped ? 'border-dashed border-gray-200 bg-gray-50/40' : 'border-gray-200 bg-white'
      }`}
    >
      {skipped && <input type="hidden" name={`skip_${skipName}`} value="1" />}

      <div className="mb-4 flex items-start gap-4">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ring-1 ${
            skipped
              ? 'bg-gray-100 text-gray-400 ring-gray-200'
              : 'bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 ring-indigo-100'
          }`}
        >
          {number}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className={`text-base font-semibold ${skipped ? 'text-gray-500' : 'text-gray-900'}`}>
              {title}
            </h3>
            <button
              type="button"
              onClick={onToggleSkip}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                skipped
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {skipped ? (
                <>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                  </svg>
                  Herstel
                </>
              ) : (
                'Overslaan'
              )}
            </button>
          </div>
          <p className={`mt-1 text-sm leading-relaxed ${skipped ? 'text-gray-400' : 'text-gray-600'}`}>
            {description}
          </p>
        </div>
      </div>

      <div className="pl-[52px]">
        {skipped ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Vraag overgeslagen — gebruik "Herstel" om alsnog te beantwoorden.
          </div>
        ) : (
          <>
            {children}
            {error && (
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-red-600">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
