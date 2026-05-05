import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'

// Resolve de customer_id voor de ingelogde klant via de slider-koppeling
// (clients.lead_inbox_visible + clients.lead_inbox_customer_id).
//
// requireLeadInboxCustomerId redirect naar /dashboard zodra een van beide
// ontbreekt — bedoeld voor server components (layout, page).
//
// getLeadInboxCustomerId geeft null terug bij geen toegang — bedoeld voor
// server actions, die zelf een nette ActionResult terugleveren.

export async function requireLeadInboxCustomerId(): Promise<string> {
  const branding = await getClientBranding()
  if (!branding?.lead_inbox_visible || !branding.lead_inbox_customer_id) {
    redirect('/dashboard')
  }
  return branding.lead_inbox_customer_id
}

export async function getLeadInboxCustomerId(): Promise<string | null> {
  const branding = await getClientBranding()
  if (!branding?.lead_inbox_visible || !branding.lead_inbox_customer_id) {
    return null
  }
  return branding.lead_inbox_customer_id
}
