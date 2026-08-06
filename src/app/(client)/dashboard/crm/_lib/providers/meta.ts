import type { CrmProvider } from './types'

interface ProviderMeta {
  name: string
  /** Eén regel over wat de koppeling doet. */
  summary: string
  tokenLabel: string
  tokenPlaceholder: string
  /** Waar de klant het token vandaan haalt. */
  tokenHelp: string
  hasDomain: boolean
  domainLabel: string
  domainHelp: string
  /** Welke velden er daadwerkelijk meegaan. */
  mapping: string
  badge: string
}

export const PROVIDER_META: Record<CrmProvider, ProviderMeta> = {
  hubspot: {
    name: 'HubSpot',
    summary: 'Maakt of werkt contacten bij, gekoppeld op e-mailadres.',
    tokenLabel: 'Private App-token',
    tokenPlaceholder: 'pat-eu1-…',
    // Geen tekstuele uitleg: die staat in de uitlegvideo, met de scopes
    // eronder om te kopiëren.
    tokenHelp: '',
    hasDomain: false,
    domainLabel: '',
    domainHelp: '',
    mapping:
      'Voornaam, achternaam, e-mail, telefoon, functie, bedrijf, website, leadstatus en levenscyclusfase.',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  pipedrive: {
    name: 'Pipedrive',
    summary: 'Maakt of werkt personen bij, inclusief gekoppelde organisatie.',
    tokenLabel: 'API-token',
    tokenPlaceholder: '3f7a…',
    tokenHelp:
      'Pipedrive → je profiel rechtsboven → Persoonlijke voorkeuren → API → kopieer je persoonlijke API-token.',
    hasDomain: true,
    domainLabel: 'Bedrijfsdomein (optioneel)',
    domainHelp:
      'Het stukje voor .pipedrive.com in je webadres. Laat leeg om de standaard API-server te gebruiken.',
    mapping:
      'Naam, e-mail, telefoon en organisatie. Pipedrive heeft geen standaardvelden voor functie, website of LinkedIn — die gaan niet mee.',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
}

export const PROVIDER_IDS: CrmProvider[] = ['hubspot', 'pipedrive']
