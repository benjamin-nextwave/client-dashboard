import { redirect } from 'next/navigation'

/**
 * Contact & feedback is uit de zijbalk gehaald bij de herindeling: vragen lopen
 * nu via de assistent op Hulp & uitleg, die kan doorverbinden met een
 * medewerker. Deze route stuurt door naar het overzicht, zodat een oude
 * bladwijzer niet op een foutpagina uitkomt.
 *
 * De componenten in `_components/` en de acties in lib/actions/feedback-actions
 * zijn met opzet blijven staan.
 */
export default function FeedbackPageRoute() {
  redirect('/dashboard')
}
