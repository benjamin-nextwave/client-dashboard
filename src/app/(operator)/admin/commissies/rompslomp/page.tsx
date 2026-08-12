import Link from 'next/link'
import {
  getCompanies,
  getConfiguredCompanyId,
  isRompslompConfigured,
  resolveCompanyId,
  rompslompGet,
} from '@/lib/rompslomp/client'
import { getExpenseTotals } from '@/lib/rompslomp/expenses'
import { amsterdamDateString, formatEuroCents } from '@/lib/commissions-shared'

export const dynamic = 'force-dynamic'

/**
 * Diagnosepagina voor de Rompslomp-koppeling. Doet niets anders dan ophalen en
 * laten zien wat er terugkomt — bedoeld om te controleren of het token werkt en
 * of de uitgaven goed gelezen worden, zonder in de boekhouding te hoeven kijken.
 */
export default async function RompslompStatusPage() {
  const configured = isRompslompConfigured()

  const today = amsterdamDateString()
  const from = today.slice(0, 8) + '01'

  const companies = configured ? await getCompanies() : null
  const companyId = configured ? await resolveCompanyId() : null
  const totals = configured ? await getExpenseTotals(from, today) : null

  // Eén ruwe uitgave, zodat bij een onverwachte vorm zichtbaar is welke velden
  // Rompslomp precies teruggeeft.
  const sample =
    configured && companyId?.ok
      ? await rompslompGet<unknown>(`/companies/${companyId.value}/expenses`, { per_page: 1 })
      : null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/admin/commissies/financieel"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Terug naar financieel overzicht
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Rompslomp-koppeling</h1>
        <p className="mt-1 text-sm text-gray-500">
          Deze pagina leest alleen. Er wordt niets aangemaakt, gewijzigd of verwijderd in je boekhouding.
        </p>
      </header>

      <Row label="API-token ingesteld">
        {configured ? (
          <Badge tone="ok">Ja</Badge>
        ) : (
          <div className="space-y-1">
            <Badge tone="fail">Nee</Badge>
            <p className="text-xs text-gray-500">
              Zet <code className="font-mono">ROMPSLOMP_API_TOKEN</code> in <code className="font-mono">.env.local</code>{' '}
              (lokaal) en in de Vercel-omgevingsvariabelen (productie).
            </p>
          </div>
        )}
      </Row>

      {configured && (
        <>
          <Row label="Administraties (/me)">
            {companies?.ok ? (
              companies.value.length > 0 ? (
                <ul className="space-y-0.5">
                  {companies.value.map((c) => (
                    <li key={c.id} className="text-sm text-gray-700">
                      {c.name} <span className="font-mono text-xs text-gray-400">#{c.id}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Badge tone="warn">Geen administraties gevonden</Badge>
              )
            ) : (
              <Fail>{companies?.error}</Fail>
            )}
          </Row>

          <Row label="Gebruikt bedrijfsnummer">
            {companyId?.ok ? (
              <span className="font-mono text-sm text-gray-700">
                {companyId.value}
                <span className="ml-2 font-sans text-xs text-gray-400">
                  {getConfiguredCompanyId() ? 'uit .env.local' : 'automatisch gevonden'}
                </span>
              </span>
            ) : (
              <Fail>{companyId?.error}</Fail>
            )}
          </Row>

          <Row label={`Uitgaven ${from} t/m ${today}`}>
            {totals?.ok ? (
              <div className="space-y-2">
                <div className="text-lg font-semibold text-gray-900">
                  {formatEuroCents(totals.value.totalCents)}
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {totals.value.expenses.length}{' '}
                    {totals.value.expenses.length === 1 ? 'uitgave' : 'uitgaven'}
                  </span>
                </div>
                {totals.value.skipped > 0 && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    {totals.value.skipped} {totals.value.skipped === 1 ? 'rij is' : 'rijen zijn'} overgeslagen omdat
                    bedrag of datum niet te lezen was. Kijk hieronder bij de ruwe respons welke velden Rompslomp
                    gebruikt — dan pas ik de koppeling daarop aan.
                  </p>
                )}
                {totals.value.expenses.length > 0 && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        <th className="py-1.5">Datum</th>
                        <th className="py-1.5">Leverancier</th>
                        <th className="py-1.5">Omschrijving</th>
                        <th className="py-1.5 text-right">Bedrag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {totals.value.expenses.slice(0, 15).map((e) => (
                        <tr key={e.id} className="border-b border-gray-100 last:border-0">
                          <td className="py-1.5 text-xs text-gray-500">{e.date}</td>
                          <td className="py-1.5 text-gray-700">{e.supplier || '—'}</td>
                          <td className="py-1.5 text-gray-500">{e.description || '—'}</td>
                          <td className="py-1.5 text-right tabular-nums text-gray-900">
                            {formatEuroCents(e.amountCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <Fail>{totals?.error}</Fail>
            )}
          </Row>

          <Row label="Ruwe respons (eerste uitgave)">
            {sample?.ok ? (
              <pre className="max-h-80 overflow-auto rounded-lg bg-gray-900 p-3 font-mono text-[11px] leading-relaxed text-gray-100">
                {JSON.stringify(sample.value, null, 2).slice(0, 4000)}
              </pre>
            ) : (
              <Fail>{sample?.error}</Fail>
            )}
          </Row>
        </>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      {children}
    </section>
  )
}

function Badge({ tone, children }: { tone: 'ok' | 'warn' | 'fail'; children: React.ReactNode }) {
  const cls = {
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    fail: 'border-rose-200 bg-rose-50 text-rose-700',
  }[tone]
  return (
    <span className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>
  )
}

function Fail({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
      {children ?? 'Onbekende fout.'}
    </div>
  )
}
