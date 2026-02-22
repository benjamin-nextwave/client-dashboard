import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getClientFeedback } from '@/lib/data/feedback-data'
import { FeedbackPage } from './_components/feedback-page'

export const metadata: Metadata = { title: 'Feedback' }
export const dynamic = 'force-dynamic'

export default async function FeedbackPageRoute() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const feedbackRequests = await getClientFeedback(client.id)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
      <p className="mt-1 text-sm text-gray-600">
        Dien een verzoek in voor een nieuwe functie, bug of verbetering.
      </p>

      <div className="mt-6">
        <FeedbackPage feedbackRequests={feedbackRequests} />
      </div>
    </div>
  )
}
