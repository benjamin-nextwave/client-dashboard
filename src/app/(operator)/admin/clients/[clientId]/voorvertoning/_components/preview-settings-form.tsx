'use client'

import { useState, useTransition } from 'react'
import {
  savePreviewSettings,
  type PreviewSettings,
  type JobTitleEntry,
  type IndustryEntry,
  type LocationEntry,
} from '@/lib/actions/preview-settings-actions'

const DEFAULT_JOB_TITLES = [
  'CEO', 'Eigenaar', 'Mede-eigenaar', 'Oprichter', 'Mede-oprichter',
  'DGA', 'Directeur', 'Managing Director', 'General Manager',
  'CFO', 'COO', 'CTO', 'CMO', 'CRO', 'CHRO',
  'VP', 'Vice President', 'Partner',
  'Head of Sales', 'Head of Marketing', 'Head of HR', 'Head of Operations', 'Head of Finance',
  'Sales Director', 'Marketing Director', 'HR Director', 'Operations Director', 'Finance Director',
  'Commercieel Directeur', 'Operationeel Directeur', 'Financieel Directeur',
  'Sales Manager', 'Marketing Manager', 'HR Manager', 'Operations Manager',
  'Business Development Manager', 'Account Manager',
  'Bestuurder', 'Voorzitter', 'Lid Raad van Bestuur',
  'Franchisenemer', 'Bedrijfsleider', 'Vestigingsmanager', 'Regiomanager',
  'Praktijkhouder', 'Managing Partner', 'Vennoot',
  'Inkoopdirecteur', 'Inkoper', 'Procurement Manager',
  'IT Director', 'IT Manager', 'CIO', 'CISO',
]

interface PreviewSettingsFormProps {
  clientId: string
  initialSettings: PreviewSettings | null
}

export function PreviewSettingsForm({ clientId, initialSettings }: PreviewSettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const [contactCount, setContactCount] = useState<string>(
    initialSettings?.contact_count?.toString() ?? ''
  )
  const [jobTitles, setJobTitles] = useState<JobTitleEntry[]>(
    initialSettings?.job_titles ?? []
  )
  const [industries, setIndustries] = useState<IndustryEntry[]>(
    initialSettings?.industries ?? []
  )
  const [locations, setLocations] = useState<LocationEntry[]>(
    initialSettings?.locations ?? []
  )
  const [launchDate, setLaunchDate] = useState<string>(
    initialSettings?.launch_date ?? ''
  )

  // Job title add state
  const [selectedTitle, setSelectedTitle] = useState('')
  const [titlePercentage, setTitlePercentage] = useState('')
  const [customTitle, setCustomTitle] = useState('')

  // Industry add state
  const [newIndustry, setNewIndustry] = useState('')
  const [industryPercentage, setIndustryPercentage] = useState('')

  // Location add state
  const [newLocation, setNewLocation] = useState('')
  const [locationPercentage, setLocationPercentage] = useState('')

  const availableTitles = DEFAULT_JOB_TITLES.filter(
    (t) => !jobTitles.some((jt) => jt.title === t)
  )

  function addJobTitle() {
    const title = selectedTitle === '__custom__' ? customTitle.trim() : selectedTitle
    const pct = Number(titlePercentage)
    if (!title || !pct || pct <= 0) return
    setJobTitles([...jobTitles, { title, percentage: pct }])
    setSelectedTitle('')
    setCustomTitle('')
    setTitlePercentage('')
  }

  function removeJobTitle(index: number) {
    setJobTitles(jobTitles.filter((_, i) => i !== index))
  }

  function addIndustry() {
    if (!newIndustry.trim() || !industryPercentage) return
    setIndustries([...industries, { name: newIndustry.trim(), percentage: Number(industryPercentage) }])
    setNewIndustry('')
    setIndustryPercentage('')
  }

  function removeIndustry(index: number) {
    setIndustries(industries.filter((_, i) => i !== index))
  }

  function addLocation() {
    if (!newLocation.trim() || !locationPercentage) return
    setLocations([...locations, { name: newLocation.trim(), percentage: Number(locationPercentage) }])
    setNewLocation('')
    setLocationPercentage('')
  }

  function removeLocation(index: number) {
    setLocations(locations.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaved(false)
    startTransition(async () => {
      const result = await savePreviewSettings(clientId, {
        contact_count: contactCount ? Number(contactCount) : null,
        job_titles: jobTitles,
        industries,
        locations,
        launch_date: launchDate || null,
      })
      if (!result.error) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Contact count + Launch date */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Algemeen</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Aantal contacten</label>
            <input
              type="number"
              value={contactCount}
              onChange={(e) => setContactCount(e.target.value)}
              placeholder="bijv. 2500"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Livegang datum</label>
            <input
              type="date"
              value={launchDate}
              onChange={(e) => setLaunchDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Job titles */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Functietitels</h2>

        {jobTitles.length > 0 && (
          <div className="space-y-1.5">
            {jobTitles.map((jt, i) => (
              <div key={i} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                <span className="text-sm text-gray-700">{jt.title}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{jt.percentage}%</span>
                  <button type="button" onClick={() => removeJobTitle(i)} className="text-gray-400 hover:text-red-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <select
            value={selectedTitle}
            onChange={(e) => setSelectedTitle(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Selecteer functietitel...</option>
            {availableTitles.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
            <option value="__custom__">Anders (handmatig invullen)</option>
          </select>
          {selectedTitle === '__custom__' && (
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Functietitel..."
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          )}
          <input
            type="number"
            value={titlePercentage}
            onChange={(e) => setTitlePercentage(e.target.value)}
            placeholder="%"
            min="1"
            max="100"
            className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addJobTitle}
            className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            +
          </button>
        </div>
      </div>

      {/* Industries */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Industrie</h2>

        {industries.length > 0 && (
          <div className="space-y-1.5">
            {industries.map((ind, i) => (
              <div key={i} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                <span className="text-sm text-gray-700">{ind.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{ind.percentage}%</span>
                  <button type="button" onClick={() => removeIndustry(i)} className="text-gray-400 hover:text-red-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newIndustry}
            onChange={(e) => setNewIndustry(e.target.value)}
            placeholder="bijv. IT & Software"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="number"
            value={industryPercentage}
            onChange={(e) => setIndustryPercentage(e.target.value)}
            placeholder="%"
            min="1"
            max="100"
            className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addIndustry}
            className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            +
          </button>
        </div>
      </div>

      {/* Locations */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Locatie</h2>

        {locations.length > 0 && (
          <div className="space-y-1.5">
            {locations.map((loc, i) => (
              <div key={i} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                <span className="text-sm text-gray-700">{loc.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{loc.percentage}%</span>
                  <button type="button" onClick={() => removeLocation(i)} className="text-gray-400 hover:text-red-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder="bijv. Noord-Holland"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="number"
            value={locationPercentage}
            onChange={(e) => setLocationPercentage(e.target.value)}
            placeholder="%"
            min="1"
            max="100"
            className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addLocation}
            className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            +
          </button>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-md bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? 'Opslaan...' : 'Opslaan'}
        </button>
        {saved && (
          <span className="text-sm text-green-600">Opgeslagen!</span>
        )}
      </div>
    </div>
  )
}
