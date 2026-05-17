import { redirect } from 'next/navigation'

// Verouderde route: persona is nu verplicht. Stuur door naar de persona-keuze
// zodat oude bookmarks/links blijven werken.
export default function LegacyOchtendSessiePage() {
  redirect('/admin/controle/ochtend')
}
