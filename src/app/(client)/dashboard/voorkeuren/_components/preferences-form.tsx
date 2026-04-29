'use client'

import { useState, useTransition } from 'react'
import { updateNotificationSettings } from '@/lib/actions/preferences-actions'
import { useT } from '@/lib/i18n/client'

interface PreferencesFormProps {
  email: string
  displayName: string
  companyName: string
  notificationEmail: string | null
  notificationsEnabled: boolean
}

export function PreferencesForm({
  email,
  displayName,
  companyName,
  notificationEmail,
  notificationsEnabled: initialEnabled,
}: PreferencesFormProps) {
  const t = useT()
  const [notifEmail, setNotifEmail] = useState(notificationEmail ?? email)
  const [notifEnabled, setNotifEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    setSaved(false)
    setError(null)
    startTransition(async () => {
      const result = await updateNotificationSettings(notifEmail, notifEnabled)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Account info */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{t('settings.accountTitle')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">{t('settings.fieldName')}</label>
            <p className="mt-1 text-sm text-gray-900">{displayName || t('settings.notSet')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">{t('settings.fieldEmail')}</label>
            <p className="mt-1 text-sm text-gray-900">{email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">{t('settings.fieldOrganization')}</label>
            <p className="mt-1 text-sm text-gray-900">{companyName}</p>
          </div>
          <p className="text-xs text-gray-400">{t('settings.contactToChange')}</p>
        </div>
      </div>

      {/* Notification preferences */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{t('settings.notificationsTitle')}</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{t('settings.notificationsToggleTitle')}</p>
              <p className="text-xs text-gray-500">{t('settings.notificationsToggleDesc')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notifEnabled}
              onClick={() => setNotifEnabled(!notifEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                notifEnabled ? 'bg-[var(--brand-color)]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  notifEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>

          {notifEnabled && (
            <div>
              <label htmlFor="notif-email" className="block text-sm font-medium text-gray-700">
                {t('settings.notificationEmailLabel')}
              </label>
              <input
                id="notif-email"
                type="email"
                value={notifEmail}
                onChange={(e) => setNotifEmail(e.target.value)}
                placeholder={email}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[var(--brand-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-color)]"
              />
              <p className="mt-1 text-xs text-gray-400">{t('settings.notificationEmailHint')}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-md bg-[var(--brand-color)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? `${t('common.save')}...` : t('common.save')}
            </button>
            {saved && (
              <span className="text-sm text-green-600">{t('common.saved')}</span>
            )}
            {error && (
              <span className="text-sm text-red-600">{error}</span>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard info */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{t('settings.aboutTitle')}</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p>{t('settings.aboutLine1')}</p>
          <p>{t('settings.aboutLine2')}</p>
          <p className="text-xs text-gray-400 pt-2">{t('settings.aboutLine3')}</p>
        </div>
      </div>
    </div>
  )
}
