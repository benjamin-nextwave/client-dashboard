/**
 * Test script for getCampaignsForEmail (search-by-contact API).
 * Run with: npx tsx --env-file=.env.local src/scripts/test-search-by-contact.ts
 */

import { createClient } from '@supabase/supabase-js'

const TEST_EMAIL = 'sumit@appfoster.com'

const BASE_URL = 'https://api.instantly.ai/api/v2'
const API_KEY = process.env.INSTANTLY_API_KEY

if (!API_KEY) {
  console.error('INSTANTLY_API_KEY not set. Make sure .env.local is loaded.')
  process.exit(1)
}

async function main() {
  console.log(`\n=== Testing search-by-contact for: ${TEST_EMAIL} ===\n`)

  // 1. Call the API directly so we can log the raw response
  const params = new URLSearchParams({ search: TEST_EMAIL })
  const url = `${BASE_URL}/campaigns/search-by-contact?${params.toString()}`

  console.log(`GET ${url}\n`)

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    console.error(`API error: ${response.status} ${response.statusText}`)
    const body = await response.text()
    console.error('Response body:', body)
    process.exit(1)
  }

  // 2. Log raw response
  const rawData = await response.json()
  console.log('--- Raw API response ---')
  console.log(JSON.stringify(rawData, null, 2))
  console.log()

  // 3. Extract campaign IDs (handle both response formats)
  const items = Array.isArray(rawData) ? rawData : (rawData.items ?? [])
  const campaignIds: string[] = items.map((c: Record<string, unknown>) => c.id as string)

  console.log(`--- Campaign IDs (${campaignIds.length}) ---`)
  for (const id of campaignIds) {
    const name = items.find((c: Record<string, unknown>) => c.id === id)?.name ?? '?'
    console.log(`  ${id}  (${name})`)
  }
  console.log()

  // 4. Look up each campaign_id in client_campaigns
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — skipping DB lookup.')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('--- Client mapping (client_campaigns) ---')

  if (campaignIds.length === 0) {
    console.log('  No campaigns found — nothing to look up.')
    return
  }

  const { data: mappings, error } = await supabase
    .from('client_campaigns')
    .select('campaign_id, campaign_name, client_id, clients(company_name)')
    .in('campaign_id', campaignIds)

  if (error) {
    console.error('DB query error:', error.message)
    return
  }

  if (!mappings || mappings.length === 0) {
    console.log('  No matching client_campaigns entries found.')
    console.log('  These campaigns exist in Instantly but are not mapped to any client.')
    return
  }

  for (const m of mappings) {
    const clientName = (m.clients as Record<string, unknown>)?.company_name ?? '?'
    console.log(`  campaign=${m.campaign_id}  →  client=${m.client_id}  (${clientName})  [${m.campaign_name}]`)
  }

  // Show unmapped campaigns
  const mappedSet = new Set(mappings.map((m) => m.campaign_id))
  const unmapped = campaignIds.filter((id) => !mappedSet.has(id))
  if (unmapped.length > 0) {
    console.log()
    console.log('  Unmapped campaigns (in Instantly but NOT in client_campaigns):')
    for (const id of unmapped) {
      console.log(`    ${id}`)
    }
  }

  console.log('\n=== Done ===\n')
}

main().catch((err) => {
  console.error('Script failed:', err)
  process.exit(1)
})
