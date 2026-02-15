'use client'

import { useState } from 'react'

interface Campaign {
  id: string
  name: string
}

interface CampaignSelectorProps {
  campaigns: Campaign[]
  selectedIds?: string[]
}

export function CampaignSelector({ campaigns, selectedIds = [] }: CampaignSelectorProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds))

  const filtered = campaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  function toggleCampaign(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <fieldset>
      <legend className="block text-sm font-medium text-gray-700">
        Campagnes
      </legend>

      {campaigns.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">Geen campagnes gevonden</p>
      ) : (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek campagnes..."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-gray-200 p-2">
            {filtered.map((campaign) => (
              <label
                key={campaign.id}
                className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  name="campaign_ids"
                  value={campaign.id}
                  checked={selected.has(campaign.id)}
                  onChange={() => toggleCampaign(campaign.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {selected.has(campaign.id) && (
                  <input
                    type="hidden"
                    name="campaign_names"
                    value={campaign.name}
                  />
                )}
                <span className="text-sm text-gray-700">{campaign.name}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="px-2 py-1.5 text-sm text-gray-400">
                Geen resultaten
              </p>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {selected.size} campagne{selected.size !== 1 ? 's' : ''} geselecteerd
          </p>
        </>
      )}
    </fieldset>
  )
}
