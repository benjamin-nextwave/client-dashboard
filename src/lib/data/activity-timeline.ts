import { createAdminClient } from '@/lib/supabase/admin'

export interface TimelineEvent {
  key: string
  clientId: string
  clientName: string
  clientColor: string | null
  type: string
  label: string
  description: string
  timestamp: string
  seen: boolean
  note: string | null
  nextAction: string | null
}

type EventDef = {
  type: string
  label: string
  description: string
  nextAction: string | null
  timestampKey: string
}

const EVENT_DEFS: EventDef[] = [
  {
    type: 'form_submitted',
    label: 'Invulformulier ingediend',
    description: 'De klant heeft het invulformulier ingevuld en verzonden.',
    nextAction: 'Mailopzetjes maken en voorvertoning aanvullen (NextWave)',
    timestampKey: 'campaign_form_submitted_at',
  },
  {
    type: 'variants_approved',
    label: 'Mailvarianten goedgekeurd',
    description: 'De klant heeft de mailvarianten uit de onboarding goedgekeurd.',
    nextAction: 'Voorvertoning ter goedkeuring aanbieden',
    timestampKey: 'campaign_variants_approved_at',
  },
  {
    type: 'preview_approved',
    label: 'Voorvertoning goedgekeurd',
    description: 'De klant heeft de voorvertoning goedgekeurd.',
    nextAction: 'DNC-lijst laten invullen door klant',
    timestampKey: 'campaign_preview_approved_at',
  },
  {
    type: 'dnc_confirmed',
    label: 'DNC-lijst bevestigd',
    description: 'De klant heeft de DNC-lijst als klaar gemarkeerd.',
    nextAction: 'Onboarding is volledig afgerond — klaar voor livegang',
    timestampKey: 'campaign_dnc_confirmed_at',
  },
  {
    type: 'variants_acknowledged',
    label: 'Nieuwe mailvarianten goedgekeurd',
    description: 'De klant heeft de nieuw voorgestelde mailvarianten goedgekeurd.',
    nextAction: null,
    timestampKey: 'mail_variants_last_acknowledged_at',
  },
  {
    type: 'proposal_acknowledged',
    label: 'Campagnevoorstel goedgekeurd',
    description: 'De klant heeft het campagnevoorstel goedgekeurd.',
    nextAction: null,
    timestampKey: 'campaign_proposal_acknowledged_at',
  },
  {
    type: 'variants_published',
    label: 'Mailvarianten aangeboden ter goedkeuring',
    description: 'Er zijn tekstuele mailvarianten gepubliceerd in het klantdashboard.',
    nextAction: 'Wacht op goedkeuring van de klant',
    timestampKey: 'campaign_variants_last_published_at',
  },
  {
    type: 'client_mailed',
    label: 'Klant gemaild over mailvarianten',
    description: 'De klant is per e-mail genotificeerd over nieuwe mailvarianten.',
    nextAction: null,
    timestampKey: 'campaign_client_mailed_at',
  },
  {
    type: 'pdf_uploaded',
    label: 'Mailvarianten PDF geüpload',
    description: 'Er is een nieuwe PDF met mailvarianten geüpload voor de klant.',
    nextAction: 'Klant notificeren en goedkeuring vragen',
    timestampKey: 'campaign_variants_pdf_uploaded_at',
  },
  {
    type: 'proposal_published',
    label: 'Campagnevoorstel gepubliceerd',
    description: 'Er is een nieuw campagnevoorstel gepubliceerd voor de klant.',
    nextAction: 'Wacht op goedkeuring van de klant',
    timestampKey: 'campaign_proposal_published_at',
  },
]

export async function getActivityTimeline(): Promise<TimelineEvent[]> {
  const supabase = createAdminClient()

  const [clientsRes, seenRes] = await Promise.all([
    supabase
      .from('clients')
      .select(
        'id, company_name, primary_color, is_hidden, ' +
        'campaign_form_submitted_at, campaign_variants_approved_at, ' +
        'campaign_preview_approved_at, campaign_dnc_confirmed_at, ' +
        'mail_variants_last_acknowledged_at, campaign_proposal_acknowledged_at, ' +
        'campaign_variants_pdf_uploaded_at, campaign_proposal_published_at, ' +
        'campaign_variants_last_published_at, campaign_client_mailed_at'
      )
      .eq('is_hidden', false),
    supabase.from('operator_seen_events').select('event_key, note'),
  ])

  const clients = (clientsRes.data ?? []) as unknown as Record<string, unknown>[]
  const seenMap = new Map(
    (seenRes.data ?? []).map((r: { event_key: string; note: string | null }) => [r.event_key, r.note])
  )

  const events: TimelineEvent[] = []

  for (const client of clients) {
    const clientId = client.id as string
    const clientName = client.company_name as string
    const clientColor = (client.primary_color as string) ?? null

    for (const def of EVENT_DEFS) {
      const ts = client[def.timestampKey] as string | null
      if (!ts) continue

      const key = `${clientId}:${def.type}:${ts}`

      events.push({
        key,
        clientId,
        clientName,
        clientColor,
        type: def.type,
        label: def.label,
        description: def.description,
        timestamp: ts,
        seen: seenMap.has(key),
        note: seenMap.get(key) ?? null,
        nextAction: def.nextAction,
      })
    }
  }

  // Sort newest first
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return events
}
