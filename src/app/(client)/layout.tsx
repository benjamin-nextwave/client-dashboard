import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { SidebarNav } from '@/components/client/sidebar-nav'
import { ChatWidget } from '@/components/client/chat-widget'
import { SafariBanner } from '@/components/client/safari-banner'
import { LanguageSwitcher } from '@/components/client/language-switcher'
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
      <div
        className="flex min-h-screen bg-[#fafafa] text-gray-900"
        style={{ '--brand-color': brandColor } as React.CSSProperties}
      >
        <SidebarNav
          companyName={client.company_name}
          logoUrl={client.logo_url}
          signOutAction={signOut}
          inboxUrl={client.inbox_url ?? undefined}
          inboxVisible={client.inbox_visible ?? false}
        />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
            <SafariBanner />
            {children}
          </div>
        </main>
        <LanguageSwitcher />
        <ChatWidget />
      </div>
    </I18nProvider>
  )
}
