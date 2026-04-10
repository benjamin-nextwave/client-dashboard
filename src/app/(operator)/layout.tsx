import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OperatorHeader } from './_components/operator-header'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <OperatorHeader signOutAction={signOut} />
      <main className="mx-auto max-w-[1600px] px-6 py-8 lg:px-10">
        {children}
      </main>
    </div>
  )
}
