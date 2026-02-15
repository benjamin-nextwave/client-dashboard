'use client'

import { useState, useTransition } from 'react'
import { resolveError } from '@/lib/actions/error-log-actions'
import type { ErrorLog } from '@/lib/data/error-logs'

const errorTypeBadge: Record<
  ErrorLog['error_type'],
  { label: string; className: string }
> = {
  api_failure: {
    label: 'API fout',
    className:
      'inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800',
  },
  import_error: {
    label: 'Import fout',
    className:
      'inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800',
  },
  sync_error: {
    label: 'Sync fout',
    className:
      'inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800',
  },
}

export function ErrorLogTable({ errors }: { errors: ErrorLog[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  function handleResolve(errorId: string) {
    setPendingId(errorId)
    startTransition(async () => {
      await resolveError(errorId)
      setPendingId(null)
    })
  }

  if (errors.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">Geen fouten gevonden</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Klant
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Bericht
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Datum
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Actie
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {errors.map((error) => {
            const badge = errorTypeBadge[error.error_type]
            const isExpanded = expandedId === error.id

            return (
              <tr key={error.id} className="group">
                <td colSpan={6} className="p-0">
                  <div
                    className="grid cursor-pointer grid-cols-[1fr_auto_2fr_auto_auto_auto] items-center gap-0 hover:bg-gray-50"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : error.id)
                    }
                  >
                    <div className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {error.clients?.company_name ?? 'Onbekend'}
                    </div>
                    <div className="whitespace-nowrap px-6 py-4">
                      <span className={badge.className}>{badge.label}</span>
                    </div>
                    <div className="truncate px-6 py-4 text-sm text-gray-500">
                      {error.message.length > 80
                        ? `${error.message.slice(0, 80)}...`
                        : error.message}
                    </div>
                    <div className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(error.created_at).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="whitespace-nowrap px-6 py-4">
                      {error.is_resolved ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Opgelost
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          Open
                        </span>
                      )}
                    </div>
                    <div className="whitespace-nowrap px-6 py-4 text-right">
                      {!error.is_resolved && (
                        <button
                          type="button"
                          disabled={isPending && pendingId === error.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleResolve(error.id)
                          }}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isPending && pendingId === error.id
                            ? 'Bezig...'
                            : 'Oplossen'}
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                      <div className="text-sm">
                        <p className="font-medium text-gray-700">
                          Volledig bericht:
                        </p>
                        <p className="mt-1 text-gray-600">{error.message}</p>
                      </div>
                      {error.details && (
                        <div className="mt-3 text-sm">
                          <p className="font-medium text-gray-700">Details:</p>
                          <pre className="mt-1 overflow-x-auto rounded bg-gray-100 p-3 text-xs text-gray-600">
                            {JSON.stringify(error.details, null, 2)}
                          </pre>
                        </div>
                      )}
                      {error.is_resolved && error.resolved_at && (
                        <div className="mt-3 text-sm text-gray-500">
                          Opgelost op:{' '}
                          {new Date(error.resolved_at).toLocaleDateString(
                            'nl-NL',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
