import { redirect } from 'next/navigation'

/**
 * De voorvertoning is verborgen: het item staat niet meer in de zijbalk en deze
 * route stuurt door naar het overzicht, zodat een oude bladwijzer of een link
 * uit een oude mail niet op een foutpagina uitkomt.
 *
 * De componenten in `_components/` en de bijbehorende acties zijn met opzet
 * blijven staan. Terugzetten is dit bestand herstellen en het navigatie-item in
 * `components/client/sidebar-nav.tsx` weer toevoegen.
 */
export default function VoorvertoningPage() {
  redirect('/dashboard')
}
