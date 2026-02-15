import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-gray-900">
              NextWave Admin
            </h1>
            <nav className="flex items-center gap-4">
              <Link
                href="/admin"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Klanten
              </Link>
              <Link
                href="/admin/errors"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Fouten
              </Link>
            </nav>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              Uitloggen
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
