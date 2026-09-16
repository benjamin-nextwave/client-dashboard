import { amsterdamDateString } from '@/lib/commissions-shared'
import { getExpenseClientOptions, getExpenses } from '@/lib/data/expenses'
import { ExpensesView } from './_components/expenses-view'

export const dynamic = 'force-dynamic'

export default async function UitgavesPage() {
  const [expenses, clients] = await Promise.all([getExpenses(), getExpenseClientOptions()])
  const today = amsterdamDateString()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Uitgaves</h1>
        <p className="mt-1 text-sm text-gray-500">
          Alles wat er maandelijks uitgaat, met per post een oordeel en wat we ermee doen. Deze lijst
          houden we zelf bij — vraag in de chat om <code className="font-mono text-xs">/uitgaves</code> om
          er posten aan toe te voegen of een besparingsronde te doen.
        </p>
      </header>

      <ExpensesView expenses={expenses} clients={clients} today={today} />
    </div>
  )
}
