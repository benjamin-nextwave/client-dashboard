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
      <div className="rounded-panel border border-line bg-panel p-5">
        <h2 className="mb-4 text-[15px] font-semibold tracking-[-0.02em]">{t('settings.accountTitle')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[12.5px] font-medium text-muted">{t('settings.fieldName')}</label>
            <p className="mt-1 text-[12.5px] text-fg">{displayName || t('settings.notSet')}</p>
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-muted">{t('settings.fieldEmail')}</label>
            <p className="mt-1 text-[12.5px] text-fg">{email}</p>
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-muted">{t('settings.fieldOrganization')}</label>
            <p className="mt-1 text-[12.5px] text-fg">{companyName}</p>
          </div>
          <p className="text-[11.5px] text-faint">{t('settings.contactToChange')}</p>
        </div>
      </div>

      {/* Notification preferences */}
      <div className="rounded-panel border border-line bg-panel p-5">
        <h2 className="mb-4 text-[15px] font-semibold tracking-[-0.02em]">{t('settings.notificationsTitle')}</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <p className="text-[12.5px] font-medium text-fg">{t('settings.notificationsToggleTitle')}</p>
              <p className="text-[11.5px] text-muted">{t('settings.notificationsToggleDesc')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notifEnabled}
              onClick={() => setNotifEnabled(!notifEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                notifEnabled ? 'bg-[var(--brand-color)]' : 'bg-track'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-panel shadow ring-0 transition duration-200 ease-in-out ${
                  notifEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>

          {notifEnabled && (
            <div>
              <label htmlFor="notif-email" className="block text-[12.5px] font-medium text-fg">
                {t('settings.notificationEmailLabel')}
              </label>
              <input
                id="notif-email"
                type="email"
                value={notifEmail}
                onChange={(e) => setNotifEmail(e.target.value)}
                placeholder={email}
                className="mt-1 block w-full rounded-md border border-line px-3 py-2 text-[12.5px] focus:border-[var(--brand-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-color)]"
              />
              <p className="mt-1 text-[11.5px] text-faint">{t('settings.notificationEmailHint')}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-md bg-[var(--brand-color)] px-4 py-2 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? `${t('common.save')}...` : t('common.save')}
            </button>
            {saved && (
              <span className="text-[12.5px] text-pos">{t('common.saved')}</span>
            )}
            {error && (
              <span className="text-[12.5px] text-neg">{error}</span>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard info */}
      <div className="rounded-panel border border-line bg-panel p-5">
        <h2 className="mb-4 text-[15px] font-semibold tracking-[-0.02em]">{t('settings.aboutTitle')}</h2>
        <div className="space-y-2 text-[12.5px] text-muted">
          <p>{t('settings.aboutLine1')}</p>
          <p>{t('settings.aboutLine2')}</p>
          <p className="text-[11.5px] text-faint pt-2">{t('settings.aboutLine3')}</p>
        </div>
      </div>
    </div>
  )
}
