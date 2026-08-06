import type { CrmProvider } from './types'

/** HubSpot ondersteunt batches van 100; 5 batches passen ruim binnen de time-out. */
export const HUBSPOT_MAX_CONTACTS = 500

/** Pipedrive kost 1–3 losse calls per lead, dus een lagere grens. */
export const PIPEDRIVE_MAX_CONTACTS = 100

export function maxContactsFor(provider: CrmProvider): number {
  return provider === 'pipedrive' ? PIPEDRIVE_MAX_CONTACTS : HUBSPOT_MAX_CONTACTS
}
