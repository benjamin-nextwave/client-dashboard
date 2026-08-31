import { getAllTasks, getManualTaskClientOptions } from '@/lib/data/controle'
import { TaskBoard } from './_components/task-board'

export const dynamic = 'force-dynamic'

export default async function TakenPage() {
  // Zonder persona: alle taken bij elkaar, ongeacht voor wie ze zijn.
  const [tasks, clientOptions] = await Promise.all([
    getAllTasks(),
    getManualTaskClientOptions(),
  ])

  return <TaskBoard tasks={tasks} clientOptions={clientOptions} />
}
