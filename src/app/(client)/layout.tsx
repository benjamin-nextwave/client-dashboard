import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { SidebarNav } from '@/components/client/sidebar-nav'
import { LanguageSwitcher } from '@/components/client/language-switcher'
import { VoiceglowChat } from '@/components/client/voiceglow-chat'
import { I18nProvider } from '@/lib/i18n/client'
import { getLocale } from '@/lib/i18n/server'
import { createClient } from '@/lib/supabase/server'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const client = await getClientBranding()

  if (!client) {
    redirect('/login')
  }

  const locale = await getLocale()
  const brandColor = client.primary_color || '#3B82F6'

  return (
    <I18nProvider locale={locale}>
      {/* client-theme draagt alle ontwerptokens én de merk-tinten. Die moeten op
          hetzelfde element staan als --brand-color, anders rekenen ze met de
          standaardkleur in plaats van met die van de klant. */}
      <div
        className="client-theme flex min-h-screen bg-canvas font-[family-name:var(--font-instrument-sans)] text-fg"
        style={{ '--brand-color': brandColor } as React.CSSProperties}
      >
        <SidebarNav
          signOutAction={signOut}
          inboxUrl={client.inbox_url ?? undefined}
          inboxVisible={client.inbox_visible ?? false}
          leadInboxVisible={(client.lead_inbox_visible ?? false) && !!client.lead_inbox_customer_id}
          accountEmail={client.user_email}
          accountLogoUrl={client.logo_url}
          accountCompanyName={client.company_name}
        />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
            {children}
          </div>
        </main>
        <LanguageSwitcher />
        <VoiceglowChat />
      </div>
    </I18nProvider>
  )
}
