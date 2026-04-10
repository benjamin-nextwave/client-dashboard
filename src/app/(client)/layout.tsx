import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { SidebarNav } from '@/components/client/sidebar-nav'
import { ChatWidget } from '@/components/client/chat-widget'
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

  const brandColor = client.primary_color || '#3B82F6'

  return (
    <div
      className="flex min-h-screen bg-gray-50"
      style={{ '--brand-color': brandColor } as React.CSSProperties}
    >
      <SidebarNav
        companyName={client.company_name}
        logoUrl={client.logo_url}
        signOutAction={signOut}
        inboxUrl={client.inbox_url ?? undefined}
        inboxVisible={client.inbox_visible ?? false}
      />
      <main className="flex-1 px-6 py-8 overflow-auto">
        <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
          <svg className="h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Let op:</span> De inbox wordt momenteel niet ondersteund in Safari. Gebruik Google Chrome (eventueel incognito) voor de beste ervaring.
          </p>
        </div>
        {children}
      </main>
      <ChatWidget />
    </div>
  )
}
