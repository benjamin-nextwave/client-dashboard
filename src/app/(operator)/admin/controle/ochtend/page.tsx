import { PersonaPicker } from '../_components/persona-picker'

export const dynamic = 'force-dynamic'

export default function OchtendPage() {
  return (
    <PersonaPicker
      basePath="/admin/controle/ochtend"
      title="Dagelijkse controle"
      subtitle="Wie voert vandaag de controle uit? Kies een persoon — je krijgt daarna de vragenlijst die bij die rol hoort."
      backHref="/admin/controle"
    />
  )
}
