import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { TagListEditor } from './_components/tag-list-editor'
import { TargetAudienceNotes } from './_components/target-audience-notes'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ clientId: string }>
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

export default async function ClientTargetAudiencePage({ params }: PageProps) {
  const { clientId } = await params

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name, primary_color')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  const accent = (client.primary_color as string | null) ?? '#6366f1'

  const { data: audience } = await supabase
    .from('client_target_audience')
    .select('sectors_included, sectors_excluded, keywords, locations, job_titles, notes')
    .eq('client_id', clientId)
    .maybeSingle()

  const a = (audience ?? {}) as Record<string, unknown>

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/admin/clients/${clientId}`}
        className="group inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-indigo-600"
      >
        <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Terug naar klantoverzicht
      </Link>

      <header>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {client.company_name}
        </div>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-gray-900">
          Doelgroep
        </h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500">
          Wie mag deze klant benaderen en wie juist niet. Elk veld slaat direct op —
          typ een waarde en druk op Enter.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <TagListEditor
          clientId={clientId}
          list="sectors_included"
          accent={accent}
          tone="include"
          title="Sectoren — includeren"
          description="Branches waar de campagne op mikt."
          placeholder="Bijv. installatietechniek, logistiek…"
          initialValues={toStringList(a.sectors_included)}
        />
        <TagListEditor
          clientId={clientId}
          list="sectors_excluded"
          accent={accent}
          tone="exclude"
          title="Sectoren — uitsluiten"
          description="Branches die buiten de doelgroep vallen."
          placeholder="Bijv. recruitment, callcenters…"
          initialValues={toStringList(a.sectors_excluded)}
        />
        <TagListEditor
          clientId={clientId}
          list="job_titles"
          accent={accent}
          tone="include"
          title="Functietitels"
          description="Functies van de beslisser die we willen raken."
          placeholder="Bijv. operationeel directeur, HR-manager…"
          initialValues={toStringList(a.job_titles)}
        />
        <TagListEditor
          clientId={clientId}
          list="locations"
          accent={accent}
          tone="include"
          title="Locaties"
          description="Landen, provincies, steden of regio's."
          placeholder="Bijv. Noord-Brabant, België…"
          initialValues={toStringList(a.locations)}
        />
        <div className="md:col-span-2">
          <TagListEditor
            clientId={clientId}
            list="keywords"
            accent={accent}
            tone="include"
            title="Zoektermen"
            description="Vrije trefwoorden voor de lijstopbouw — technologieën, keurmerken, signalen."
            placeholder="Bijv. ISO 9001, groeiend team, SAP…"
            initialValues={toStringList(a.keywords)}
          />
        </div>
      </div>

      <TargetAudienceNotes
        clientId={clientId}
        initialNotes={(a.notes as string | null) ?? ''}
      />
    </div>
  )
}
