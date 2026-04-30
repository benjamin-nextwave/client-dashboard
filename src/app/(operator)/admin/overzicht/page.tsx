import { getActivityTimeline } from '@/lib/data/activity-timeline'
import { ActivityTimeline } from './_components/activity-timeline'

export const dynamic = 'force-dynamic'

export default async function OverzichtPage() {
  const events = await getActivityTimeline()

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900">Activiteiten</h2>
        <p className="mt-1.5 text-sm text-gray-500">
          Tijdlijn van alle klant-acties. Vink af wat je hebt gezien zodat je morgen direct weet wat nieuw is.
        </p>
      </div>

      <ActivityTimeline events={events} />
    </div>
  )
}
