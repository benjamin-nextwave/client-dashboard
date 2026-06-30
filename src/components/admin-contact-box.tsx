'use client'

import { useT } from '@/lib/i18n/client'

export interface AdminContactBoxEntry {
  name: string | null
  email: string | null
  linkedinUrl: string | null
  jobTitle: string | null
}

export interface AdminContactBoxData {
  contacts: AdminContactBoxEntry[]
  none: boolean
}

/** Returns true when there is anything worth showing to the client. */
export function hasAdminContactBox(d: AdminContactBoxData | null | undefined): boolean {
  return !!d && (d.none || d.contacts.length > 0)
}

export function AdminContactBox({ data }: { data: AdminContactBoxData }) {
  const t = useT()

  if (!hasAdminContactBox(data)) return null

  return (
    <div className="rounded-xl border-2 border-red-500 bg-red-50 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-red-800">{t('inbox.adminContactTitle')}</h2>

          {data.none ? (
            <p className="mt-1.5 text-sm font-medium text-red-700">
              {t('inbox.adminContactNone')}
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-red-700">{t('inbox.adminContactIntro')}</p>
              <div className="mt-3 space-y-3">
                {data.contacts.map((contact, i) => (
                  <ContactBlock key={i} contact={contact} t={t} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ContactBlock({
  contact,
  t,
}: {
  contact: AdminContactBoxEntry
  t: ReturnType<typeof useT>
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-white/60 p-3">
      <dl className="space-y-2">
        {contact.name && (
          <Row label={t('inbox.adminContactName')}>
            <span className="font-semibold text-red-900">{contact.name}</span>
          </Row>
        )}
        {contact.jobTitle && (
          <Row label={t('inbox.adminContactJobTitle')}>
            <span className="text-red-900">{contact.jobTitle}</span>
          </Row>
        )}
        {contact.email && (
          <Row label={t('inbox.adminContactEmail')}>
            <a
              href={`mailto:${contact.email}`}
              className="font-medium text-red-700 underline hover:text-red-900"
            >
              {contact.email}
            </a>
          </Row>
        )}
        {contact.linkedinUrl && (
          <Row label={t('inbox.adminContactLinkedIn')}>
            <a
              href={contact.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-red-700 underline hover:text-red-900"
            >
              {t('inbox.adminContactOpenLinkedIn')}
            </a>
          </Row>
        )}
      </dl>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <dt className="w-28 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-red-500">
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}
