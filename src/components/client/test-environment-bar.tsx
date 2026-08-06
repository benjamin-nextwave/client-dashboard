import { outboundWritesEnabled } from '@/lib/safety/write-guard'

/**
 * Permanente waarschuwingsbalk zodra schrijf-acties naar buiten geblokkeerd zijn.
 *
 * Server Component: leest process.env rechtstreeks, zodat de vlag nooit in de
 * browserbundel belandt.
 *
 * Bewust `fixed` onderaan en niet in de documentstroom: de inbox-embed
 * (/dashboard/inbox-embed) positioneert zijn iframe met vaste pixelwaarden die
 * afhangen van de hoogte van de pagina-container. Een balk in de stroom zou die
 * uitsnede verschuiven. Op productie rendert dit component sowieso niets, dus
 * daar is er geen enkel verschil.
 *
 * De streepjesachtergrond en het formaat zijn met opzet lelijk: dit mag nooit
 * voor een echt ontwerp-element worden aangezien.
 */
export function TestEnvironmentBar() {
  if (outboundWritesEnabled()) return null

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] border-t-2 border-orange-600 px-4 py-2 text-center text-[13px] font-semibold text-orange-950"
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, #fed7aa, #fed7aa 10px, #fdba74 10px, #fdba74 20px)',
      }}
    >
      TESTOMGEVING — e-mails via Instantly zijn geblokkeerd. Er wordt niets naar
      buiten verstuurd.
    </div>
  )
}
