import Link from 'next/link'

interface Props {
  clientId: string
}

const LINKS: Array<{
  href: (id: string) => string
  label: string
  description: string
  icon: React.ReactNode
  accent: string
}> = [
  {
    href: (id) => `/admin/clients/${id}/campagne`,
    label: 'Campagne',
    description: 'Onboarding, voorstel & mailvarianten',
    accent: 'from-indigo-500 to-violet-500',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5 9 16.5l4.5-4.5 4.5 4.5 1.5-3M3 21h18" />
      </svg>
    ),
  },
  {
    href: (id) => `/admin/clients/${id}/campagne-flow`,
    label: 'Campagne-flow',
    description: 'LinkedIn flow per campagne',
    accent: 'from-sky-500 to-cyan-500',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    href: (id) => `/admin/clients/${id}/campagne-leads`,
    label: 'Campagne leads',
    description: 'Leads beheren en filteren',
    accent: 'from-emerald-500 to-teal-500',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
  {
    href: (id) => `/admin/clients/${id}/contacten`,
    label: 'Contacten',
    description: 'CSV-imports & contactenlijst',
    accent: 'from-amber-500 to-orange-500',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
  {
    href: (id) => `/admin/clients/${id}/onboarding`,
    label: 'Onboarding',
    description: 'Status & taken',
    accent: 'from-rose-500 to-pink-500',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    ),
  },
  {
    href: (id) => `/admin/clients/${id}/voorvertoning`,
    label: 'Voorvertoning',
    description: 'Lijst die klant te zien krijgt',
    accent: 'from-violet-500 to-purple-500',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
  {
    href: (id) => `/admin/clients/${id}/updates`,
    label: 'Belangrijke updates',
    description: 'Thread met klant-updates',
    accent: 'from-red-500 to-rose-500',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
    ),
  },
  {
    href: (id) => `/admin/clients/${id}/commissies`,
    label: 'Commissies',
    description: 'Categorieën, prijzen & verdiensten',
    accent: 'from-emerald-500 to-teal-500',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    href: (id) => `/admin/clients/${id}/doorverwijzing`,
    label: 'Doorverwijzing',
    description: 'Contactgegevens beslisser per lead',
    accent: 'from-red-500 to-rose-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" />
      </svg>
    ),
  },
  {
    href: (id) => `/admin/clients/${id}/dnc`,
    label: 'DNC',
    description: 'Do Not Contact-lijst & sectoren',
    accent: 'from-slate-700 to-slate-900',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
  {
    href: (id) => `/admin/clients/${id}/edit`,
    label: 'Bewerken',
    description: 'Branding, campagnes, go-live',
    accent: 'from-gray-700 to-gray-900',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
      </svg>
    ),
  },
]

export function OverviewQuickLinks({ clientId }: Props) {
  return (
    <section>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        Snelle navigatie
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href(clientId)}
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >
            <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${link.accent} text-white shadow-sm`}>
              {link.icon}
            </div>
            <div className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700">
              {link.label}
            </div>
            <div className="mt-0.5 text-[11px] leading-snug text-gray-500">
              {link.description}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
