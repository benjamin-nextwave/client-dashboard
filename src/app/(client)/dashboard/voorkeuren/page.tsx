import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { createClient } from '@/lib/supabase/server'
import { PreferencesForm } from './_components/preferences-form'
import { getTranslator } from '@/lib/i18n/server'

export const metadata: Metadata = { title: 'Instellingen & uitleg' }
export const dynamic = 'force-dynamic'

export default async function VoorkeurenPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const { data: clientSettings } = await supabase
    .from('clients')
    .select('notification_email, notifications_enabled')
    .eq('id', client.id)
    .single()

  const t = await getTranslator()

  return (
    <div>
      <h1 className="text-[25px] font-semibold tracking-[-0.03em]">{t('settings.title')}</h1>
      <p className="mt-1 text-[12.5px] text-muted">{t('settings.description')}</p>

      <div className="mt-6 space-y-6">
        <PreferencesForm
          email={user.email ?? ''}
          displayName={profile?.display_name ?? ''}
          companyName={client.company_name}
          notificationEmail={clientSettings?.notification_email ?? null}
          notificationsEnabled={clientSettings?.notifications_enabled ?? true}
        />
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-bold text-fg">{t('settings.helpSection')}</h2>
        <p className="mt-1 text-[12.5px] text-muted">{t('settings.helpDescription')}</p>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[
            { title: t('settings.videoGeneral'), id: 'b38fb5e422e947df8e3e3632c7093ffd' },
            { title: t('settings.videoReply'), id: '41fbd7812a784bcea74b8e791ddb7279' },
            { title: t('settings.videoInbox'), id: '87e25d43233745d8bd3771c71706389f' },
          ].map((video) => (
            <div key={video.id} className="overflow-hidden rounded-panel border border-line bg-panel">
              <div className="px-5 py-3">
                <h3 className="text-[12.5px] font-semibold text-fg">{video.title}</h3>
              </div>
              <div className="relative aspect-video">
                <iframe
                  src={`https://www.loom.com/embed/${video.id}`}
                  className="absolute inset-0 h-full w-full"
                  frameBorder="0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
