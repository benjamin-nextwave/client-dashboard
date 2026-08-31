import { redirect } from 'next/navigation'

/**
 * De takenlijst is verhuisd naar /admin/taken en toont daar alle taken bij
 * elkaar, zonder splitsing per persoon. Deze route blijft bestaan zodat
 * bestaande bladwijzers en links uit de controle-flow niet doodlopen.
 */
export default function MiddagPage() {
  redirect('/admin/taken')
}
