import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getClientFeedback } from '@/lib/data/feedback-data'
import { FeedbackPage } from './_components/feedback-page'

export const metadata: Metadata = { title: 'Contact & feedback' }
export const dynamic = 'force-dynamic'

export default async function FeedbackPageRoute() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const feedbackRequests = await getClientFeedback(client.id)

  return <FeedbackPage feedbackRequests={feedbackRequests} />
}
