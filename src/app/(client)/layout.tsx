import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { SidebarNav } from '@/components/client/sidebar-nav'
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
      />
      <main className="flex-1 px-6 py-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
