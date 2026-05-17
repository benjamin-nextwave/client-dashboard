import { PersonaPicker } from '../_components/persona-picker'

export const dynamic = 'force-dynamic'

export default function MiddagPage() {
  return (
    <PersonaPicker
      basePath="/admin/controle/middag"
      title="Takenlijst"
      subtitle="Wiens takenlijst wil je openen? Je ziet daarna alleen taken die aan die persoon zijn toegewezen."
      backHref="/admin/controle"
    />
  )
}
