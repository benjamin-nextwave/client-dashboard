import { createClient } from '@/lib/supabase/server'
import { getCampaignDetail } from '@/lib/instantly/client'

export interface MailboxEntry {
  address: string
  domain: string
  /** Namen van de campagnes waaraan dit adres gekoppeld is. */
  campaigns: string[]
}

export interface SendingFootprint {
  mailboxes: number
  domains: number
  entries: MailboxEntry[]
  /**
   * 'instantly' — de echte koppeling campagne ↔ mailbox.
   * 'database'  — terugval: adressen die ooit verstuurd hebben, zonder campagne.
   */
  source: 'instantly' | 'database'
}

function normalise(value: string | null | undefined): string | null {
  if (!value) return null
  const address = value.trim().toLowerCase()
  return address.includes('@') ? address : null
}

function toFootprint(
  byAddress: Map<string, Set<string>>,
  source: SendingFootprint['source']
): SendingFootprint {
  const entries: MailboxEntry[] = Array.from(byAddress.entries())
    .map(([address, campaigns]) => ({
      address,
      domain: address.split('@')[1] ?? '',
      campaigns: Array.from(campaigns).sort((a, b) => a.localeCompare(b, 'nl')),
    }))
    .sort((a, b) => a.address.localeCompare(b.address, 'nl'))

  const domains = new Set(entries.map((e) => e.domain).filter(Boolean))
  return { mailboxes: entries.length, domains: domains.size, entries, source }
}

/**
 * De mailboxen die aan de campagnes van deze klant gekoppeld zijn, en de
 * domeinen erachter.
 *
 * Primaire bron is Instantly zelf: `email_list` op een campagne is de enige
 * plek die weet welke mailbox bij welke campagne hoort. De database kan dat
 * niet beantwoorden — cached_emails heeft geen campaign_id en synced_leads
 * bevat alleen leads die gereageerd hebben.
 *
 * Lukt de API-call niet (geen sleutel, storing, rate limit), dan valt de functie
 * terug op de oude afleiding uit de database. Dan klopt het aantal nog steeds
 * als "adressen die verstuurd hebben", maar zonder campagnekoppeling — `source`
 * vertelt de UI welke van de twee je ziet.
 */
export async function getSendingFootprint(
  clientId: string
): Promise<SendingFootprint> {
  const supabase = await createClient()

  const [campaignsResult, clientResult] = await Promise.all([
    supabase
      .from('client_campaigns')
      .select('campaign_id, campaign_name')
      .eq('client_id', clientId),
    supabase
      .from('clients')
      .select('instantly_api_key')
      .eq('id', clientId)
      .maybeSingle(),
  ])

  const campaigns = campaignsResult.data ?? []
  const apiKey = clientResult.data?.instantly_api_key ?? undefined

  // --- Primair: Instantly ---------------------------------------------------
  if (campaigns.length > 0) {
    const byAddress = new Map<string, Set<string>>()
    let anySucceeded = false

    const details = await Promise.all(
      campaigns.map(async (campaign) => {
        try {
          const detail = await getCampaignDetail(campaign.campaign_id, { apiKey })
          return { campaign, detail }
        } catch (error) {
          console.error(
            `[footprint] campagne ${campaign.campaign_id} niet opgehaald:`,
            error instanceof Error ? error.message : error
          )
          return null
        }
      })
    )

    for (const result of details) {
      if (!result) continue
      anySucceeded = true
      const name = result.detail.name || result.campaign.campaign_name
      for (const raw of result.detail.email_list ?? []) {
        const address = normalise(raw)
        if (!address) continue
        const set = byAddress.get(address) ?? new Set<string>()
        set.add(name)
        byAddress.set(address, set)
      }
    }

    // Zodra één campagne is opgehaald, is het antwoord van Instantly leidend —
    // óók als het nul mailboxen zijn. Een campagne zonder gekoppelde mailboxen
    // is een geldige uitkomst, en dan mogen we die niet stilzwijgend vervangen
    // door historische adressen uit de database: dat zou een verkeerd getal
    // tonen zonder dat iemand het merkt. Alleen bij een echte storing, waarbij
    // geen enkele call slaagde, vallen we terug.
    if (anySucceeded) {
      return toFootprint(byAddress, 'instantly')
    }
  }

  // --- Terugval: afleiden uit de database -----------------------------------
  const [leadsResult, emailsResult] = await Promise.all([
    supabase
      .from('synced_leads')
      .select('sender_account')
      .eq('client_id', clientId)
      .not('sender_account', 'is', null),
    supabase
      .from('cached_emails')
      .select('sender_account')
      .eq('client_id', clientId)
      .not('sender_account', 'is', null),
  ])

  const byAddress = new Map<string, Set<string>>()
  for (const row of [...(leadsResult.data ?? []), ...(emailsResult.data ?? [])]) {
    const address = normalise(row.sender_account)
    // Bewust alleen sender_account en niet from_address: dat laatste is bij een
    // binnenkomend bericht het adres van de prospect en zou hier als "eigen
    // mailbox" binnenglippen.
    if (address) byAddress.set(address, byAddress.get(address) ?? new Set<string>())
  }

  return toFootprint(byAddress, 'database')
}
