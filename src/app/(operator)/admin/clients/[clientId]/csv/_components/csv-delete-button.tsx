'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteCsvUpload } from '@/lib/actions/csv-actions'

interface CsvDeleteButtonProps {
  uploadId: string
}

export function CsvDeleteButton({ uploadId }: CsvDeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('Weet je zeker dat je deze CSV wilt verwijderen?')) return

    setIsDeleting(true)
    const result = await deleteCsvUpload(uploadId)
    if ('error' in result) {
      alert(result.error)
      setIsDeleting(false)
      return
    }
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="inline-flex items-center rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      title="CSV verwijderen"
    >
      {isDeleting ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      )}
    </button>
  )
}
