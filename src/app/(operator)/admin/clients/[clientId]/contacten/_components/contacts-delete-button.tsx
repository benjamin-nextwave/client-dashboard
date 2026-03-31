'use client'

import { useState } from 'react'
import { deleteAllContacts } from '@/lib/actions/contact-actions'

interface ContactsDeleteButtonProps {
  clientId: string
  contactCount: number
}

export function ContactsDeleteButton({ clientId, contactCount }: ContactsDeleteButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteAllContacts(clientId)
    if ('error' in result) {
      alert(result.error)
      setDeleting(false)
      setConfirming(false)
      return
    }
    window.location.reload()
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
      >
        Alle contacten verwijderen
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-red-600">
        {contactCount.toLocaleString('nl-NL')} contacten verwijderen?
      </span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
      >
        {deleting ? 'Verwijderen...' : 'Bevestigen'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
      >
        Annuleren
      </button>
    </div>
  )
}
