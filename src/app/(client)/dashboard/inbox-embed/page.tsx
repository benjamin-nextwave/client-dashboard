import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { InboxEmbedFrame } from './_components/inbox-embed-frame'

export const metadata: Metadata = { title: 'E-mail Inbox' }
export const dynamic = 'force-dynamic'

const INBOX_PROXY_BASE_URL = 'https://instantly-inbox-proxy.nextwave-proxy.workers.dev'

export default async function InboxEmbedPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  if (!client.inbox_url) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">Inbox niet geconfigureerd</h2>
          <p className="mt-1 text-sm text-gray-600">
            Neem contact op met uw accountbeheerder om de inbox in te stellen.
          </p>
        </div>
      </div>
    )
  }

  // Haal het Instantly whitelabel domein uit de inbox_url
  let targetHost = ''
  try {
    targetHost = new URL(client.inbox_url).hostname
  } catch {
    // inbox_url is geen volledige URL, gebruik het direct als hostname
    targetHost = client.inbox_url
  }

  return <InboxEmbedFrame proxyBaseUrl={INBOX_PROXY_BASE_URL} targetHost={targetHost} />
}
