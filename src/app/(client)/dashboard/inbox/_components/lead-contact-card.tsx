'use client'

interface LeadContactCardProps {
  lead: {
    first_name: string | null
    last_name: string | null
    company_name: string | null
    job_title: string | null
    email: string
    linkedin_url: string | null
    vacancy_url: string | null
  }
  isRecruitment: boolean
}

export function LeadContactCard({ lead, isRecruitment }: LeadContactCardProps) {
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ')

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        {fullName || 'Onbekende contactpersoon'}
      </h2>

      <div className="space-y-3">
        {lead.company_name && (
          <div>
            <p className="text-xs font-medium text-gray-500">Bedrijf</p>
            <p className="text-sm text-gray-900">{lead.company_name}</p>
          </div>
        )}

        {lead.job_title && (
          <div>
            <p className="text-xs font-medium text-gray-500">Functie</p>
            <p className="text-sm text-gray-900">{lead.job_title}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-gray-500">E-mail</p>
          <a
            href={`mailto:${lead.email}`}
            className="text-sm text-blue-600 hover:underline"
          >
            {lead.email}
          </a>
        </div>

        {lead.linkedin_url && (
          <div>
            <p className="text-xs font-medium text-gray-500">LinkedIn</p>
            <a
              href={lead.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Profiel bekijken
            </a>
          </div>
        )}

        {isRecruitment && lead.vacancy_url && (
          <div>
            <p className="text-xs font-medium text-gray-500">Vacature</p>
            <a
              href={lead.vacancy_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Vacature bekijken
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
