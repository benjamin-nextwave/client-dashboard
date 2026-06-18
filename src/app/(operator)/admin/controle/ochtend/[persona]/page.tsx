import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getClientsWithLastCheck, type ControleShift } from '@/lib/data/controle'
import { ClientSelectionList } from '../_components/client-selection-list'
import { ShiftPicker } from '../../_components/shift-picker'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ persona: string }>
  searchParams: Promise<{ shift?: string }>
}

const PERSONA_LABEL: Record<'benjamin' | 'merlijn', string> = {
  benjamin: 'Benjamin',
  merlijn: 'Merlijn',
}

const SHIFT_LABEL: Record<ControleShift, string> = {
  ochtend: 'Ochtendcontrole',
  avond: 'Avondcontrole',
  wekelijks: 'Wekelijkse analyse',
}

export default async function OchtendPersonaPage({ params, searchParams }: PageProps) {
  const [{ persona }, { shift: shiftParam }] = await Promise.all([params, searchParams])
  if (persona !== 'benjamin' && persona !== 'merlijn') notFound()

  // Benjamin kiest eerst een ronde (ochtend/avond). Merlijn slaat deze stap
  // over en heeft geen shift.
  const shift: ControleShift | null =
    persona === 'benjamin' &&
    (shiftParam === 'ochtend' || shiftParam === 'avond' || shiftParam === 'wekelijks')
      ? shiftParam
      : null

  if (persona === 'benjamin' && shift === null) {
    return (
      <ShiftPicker
        basePath="/admin/controle/ochtend/benjamin"
        backHref="/admin/controle/ochtend"
      />
    )
  }

  const clients = await getClientsWithLastCheck(persona, shift ?? undefined)
  const label = PERSONA_LABEL[persona]

  // Voor Benjamin gaat "terug" naar de ronde-keuze; voor Merlijn naar de
  // persona-keuze.
  const backHref =
    persona === 'benjamin' ? '/admin/controle/ochtend/benjamin' : '/admin/controle/ochtend'
  const backLabel = persona === 'benjamin' ? 'Andere ronde kiezen' : 'Andere persoon kiezen'

  return (
    <div className="space-y-6 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            {backLabel}
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
            Dagelijkse controle — {label}
            {shift && (
              <span className="ml-2 align-middle text-lg font-semibold text-indigo-600">
                · {SHIFT_LABEL[shift]}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Selecteer de klanten die je vandaag wilt controleren. Oudst gecheckte klanten staan bovenaan.
          </p>
        </div>
      </div>

      <ClientSelectionList clients={clients} persona={persona} shift={shift} />
    </div>
  )
}
