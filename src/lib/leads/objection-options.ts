/**
 * De vaste keuze naast de prijslijst van de klant: deze lead hoort helemaal
 * niet in rekening te worden gebracht.
 *
 * Staat bewust in een eigen module en niet bij de server-actie: uit een
 * 'use server'-bestand mogen alleen async functies worden geëxporteerd, en de
 * bezwaarmodal draait in de browser.
 */
export const UNBILLED_OPTION = 'onbetaald'
export const UNBILLED_LABEL = 'Onbetaalde lead / geen interesse'
