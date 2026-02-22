import type { Metadata } from 'next'
import { getAllFeedback } from '@/lib/data/feedback-data'
import { FeedbackManagement } from './_components/feedback-management'

export const metadata: Metadata = { title: 'Feedback - Admin' }
export const dynamic = 'force-dynamic'

export default async function AdminFeedbackPage() {
  const feedbackRequests = await getAllFeedback()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
      <p className="mt-1 text-sm text-gray-600">
        Beheer alle feedback verzoeken van klanten.
      </p>

      <div className="mt-6">
        <FeedbackManagement feedbackRequests={feedbackRequests} />
      </div>
    </div>
  )
}
