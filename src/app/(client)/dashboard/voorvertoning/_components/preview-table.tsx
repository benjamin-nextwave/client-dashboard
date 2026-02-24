'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { excludeContact } from '@/lib/actions/preview-actions'
import type { PreviewContact } from '@/lib/data/preview-data'

const RATING_OPTIONS = [
  { value: '5', emoji: '\u{1F929}', label: 'Uitstekend' },
  { value: '4', emoji: '\u{1F60A}', label: 'Goed' },
  { value: '3', emoji: '\u{1F610}', label: 'Neutraal' },
  { value: '2', emoji: '\u{1F615}', label: 'Matig' },
  { value: '1', emoji: '\u{1F61E}', label: 'Slecht' },
]

const WEBHOOK_URL =
  'https://hook.eu2.make.com/fgp9hm6v3s4pantw25ckrpa8tyr0bnm1'

interface Props {
  contacts: PreviewContact[]
  clientId: string
  clientName: string
}

export function PreviewTable({ contacts, clientId, clientName }: Props) {
  const router = useRouter()
  const [removing, setRemoving] = useState<string | null>(null)
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)
  const [search, setSearch] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [rating, setRating] = useState('')
  const [feedbackText, setFeedbackText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [wantsNewList, setWantsNewList] = useState(false)
  const [jobTitleFeedback, setJobTitleFeedback] = useState('')
  const [industryFeedback, setIndustryFeedback] = useState('')
  const [generalNotes, setGeneralNotes] = useState('')

  // Filter contacts: apply search (excluded contacts stay visible but marked red)
  const filtered = useMemo(() => {
    if (!search.trim()) return contacts
    const q = search.toLowerCase()
    return contacts.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        (c.jobTitle && c.jobTitle.toLowerCase().includes(q)) ||
        (c.industry && c.industry.toLowerCase().includes(q))
    )
  }, [contacts, search])

  function showNotification(type: 'success' | 'error' | 'info', message: string) {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  async function handleExclude(contactId: string) {
    setRemoving(contactId)
    setNotification(null)

    // Optimistically mark as excluded (show red) immediately
    setExcludedIds((prev) => new Set(prev).add(contactId))

    const result = await excludeContact(contactId)

    if ('error' in result) {
      // Revert optimistic exclusion on error
      setExcludedIds((prev) => {
        const next = new Set(prev)
        next.delete(contactId)
        return next
      })
      showNotification('error', result.error)
    } else {
      showNotification('success', 'Contact verwijderd uit de lijst.')
      router.refresh()
    }

    setRemoving(null)
  }

  function resetFeedbackForm() {
    setShowFeedback(false)
    setRating('')
    setFeedbackText('')
    setWantsNewList(false)
    setJobTitleFeedback('')
    setIndustryFeedback('')
    setGeneralNotes('')
  }

  function handleRequestNewList() {
    setWantsNewList(true)
    showNotification(
      'info',
      'Des te inhoudelijker de feedback, des te beter de volgende lijst zal zijn.'
    )
  }

  async function handleFeedbackSubmit() {
    if (!wantsNewList && !rating) return
    if (wantsNewList && (!jobTitleFeedback.trim() || !industryFeedback.trim())) return

    setSubmitting(true)
    try {
      const ratingOption = RATING_OPTIONS.find((r) => r.value === rating)
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_name: clientName,
          rating: rating,
          rating_label: ratingOption?.label ?? '',
          rating_emoji: ratingOption?.emoji ?? '',
          feedback: feedbackText,
          wants_new_list: wantsNewList,
          job_title_feedback: wantsNewList ? jobTitleFeedback : '',
          industry_feedback: wantsNewList ? industryFeedback : '',
          general_notes: wantsNewList ? generalNotes : '',
          total_contacts: contacts.length,
          submitted_at: new Date().toISOString(),
        }),
      })

      resetFeedbackForm()
      if (wantsNewList) {
        showNotification(
          'success',
          'Binnen 24 uur ontvangt u een nieuwe lijst binnen het dashboard.'
        )
      } else {
        showNotification(
          'success',
          'Bedankt voor je feedback! We gaan ernaar kijken.'
        )
      }
    } catch {
      showNotification(
        'error',
        'Feedback verzenden mislukt. Probeer het opnieuw.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-6">
      {notification && (
        <div
          className={`mb-4 rounded-md p-3 text-sm ${
            notification.type === 'success'
              ? 'bg-green-50 text-green-700'
              : notification.type === 'info'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-red-50 text-red-700'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Toolbar: search + feedback button */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder="Zoek op naam, bedrijf, functie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <button
          onClick={() => setShowFeedback(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
            />
          </svg>
          Deel feedback over de lijst
        </button>
      </div>

      {/* Feedback modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Feedback over de contactlijst
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Wat vind je van de kwaliteit van deze lijst?
            </p>

            {/* Emoji rating */}
            <div className="mt-4 flex justify-center gap-2">
              {RATING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRating(opt.value)}
                  className={`flex flex-col items-center rounded-lg px-3 py-2 text-2xl transition-all ${
                    rating === opt.value
                      ? 'bg-indigo-100 ring-2 ring-indigo-500'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <span>{opt.emoji}</span>
                  <span className="mt-1 text-xs text-gray-600">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Text feedback */}
            <textarea
              placeholder="Eventuele opmerkingen of suggesties..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={3}
              className="mt-4 w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            {/* Request new list button */}
            {!wantsNewList && (
              <button
                type="button"
                onClick={handleRequestNewList}
                className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
              >
                <span className="text-base">{'\u{1F621}'}</span> Deze lijst is zo slecht dat ik een nieuwe wil
              </button>
            )}

            {/* New list request fields */}
            {wantsNewList && (
              <div className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800">
                  Help ons een betere lijst samen te stellen:
                </p>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Wat moet er beter aan de functietitels? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="Bijv. meer C-level, minder junior posities..."
                    value={jobTitleFeedback}
                    onChange={(e) => setJobTitleFeedback(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Wat moet er beter aan de sector/industrie? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="Bijv. meer focus op IT, geen overheid..."
                    value={industryFeedback}
                    onChange={(e) => setIndustryFeedback(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Overige opmerkingen
                  </label>
                  <textarea
                    placeholder="Andere wensen of opmerkingen..."
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={resetFeedbackForm}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Annuleren
              </button>
              <button
                onClick={handleFeedbackSubmit}
                disabled={
                  submitting ||
                  (!wantsNewList && !rating) ||
                  (wantsNewList &&
                    (!jobTitleFeedback.trim() || !industryFeedback.trim()))
                }
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Verzenden...' : 'Versturen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="mb-2 text-sm text-gray-500">
        {search.trim()
          ? `${filtered.length} van ${contacts.length} contacten gevonden`
          : `${filtered.filter((c) => !c.isExcluded && !excludedIds.has(c.id)).length} actieve contacten${excludedIds.size > 0 || contacts.some((c) => c.isExcluded) ? ` (${contacts.filter((c) => c.isExcluded || excludedIds.has(c.id)).length} verwijderd)` : ''}`}
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-[22%] px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Naam
              </th>
              <th className="w-[22%] px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Bedrijf
              </th>
              <th className="w-[22%] px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Sector
              </th>
              <th className="w-[22%] px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Functie
              </th>
              <th className="w-[12%] px-2 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actie
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((contact) => {
              const isExcluded = contact.isExcluded || excludedIds.has(contact.id)
              return (
                <tr key={contact.id} className={isExcluded ? 'bg-red-50' : ''}>
                  <td className={`truncate px-3 py-3 text-sm ${isExcluded ? 'text-red-400 line-through' : 'text-gray-900'}`} title={contact.fullName}>
                    {contact.fullName}
                  </td>
                  <td className={`truncate px-3 py-3 text-sm ${isExcluded ? 'text-red-400 line-through' : 'text-gray-900'}`} title={contact.companyName ?? '-'}>
                    {contact.companyName ?? '-'}
                  </td>
                  <td className={`truncate px-3 py-3 text-sm ${isExcluded ? 'text-red-400 line-through' : 'text-gray-900'}`} title={contact.industry ?? '-'}>
                    {contact.industry ?? '-'}
                  </td>
                  <td className={`truncate px-3 py-3 text-sm ${isExcluded ? 'text-red-400 line-through' : 'text-gray-900'}`} title={contact.jobTitle ?? '-'}>
                    {contact.jobTitle ?? '-'}
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-right text-sm">
                    {isExcluded ? (
                      <span className="text-xs text-red-400">Verwijderd</span>
                    ) : (
                      <button
                        onClick={() => handleExclude(contact.id)}
                        disabled={removing === contact.id}
                        className="inline-flex items-center text-red-600 hover:text-red-800 disabled:opacity-50"
                        title="Verwijderen"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-sm text-gray-500"
                >
                  Geen contacten gevonden voor &ldquo;{search}&rdquo;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
