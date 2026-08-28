/**
 * Opmaakhulp voor mailteksten in de lead inbox. Puur weergave — wat er in de
 * database staat verandert hier niet.
 */

/**
 * Sommige berichten komen binnen met de regeleindes als losse tekens: een
 * backslash gevolgd door een n, in plaats van een echte enter. Dat gebeurt
 * wanneer een tekst onderweg één keer te vaak als JSON is ingepakt. In het
 * dashboard las je dan letterlijk "\n\n\n" midden in een bericht.
 *
 * Alleen voor de weergave teruggedraaid. Een dubbele backslash wordt met rust
 * gelaten en valt als eerste in de alternatie, zodat een Windows-pad als
 * C:\\nieuw niet halverwege wordt afgebroken.
 *
 * Een ontbrekende tekst wordt lege tekst. Bij een handvol replies is de
 * mailtekst nooit meegekomen (zie LeadReply.body); dit stond eerder als
 * `string` in het type, waardoor een null hier ongemerkt binnenkwam en de hele
 * detailpagina met een serverfout omviel.
 */
export function unescapeLiteralNewlines(text: string | null | undefined): string {
  if (!text) return ''
  return text.replace(/\\\\|\\r\\n|\\n|\\r/g, (match) =>
    match === '\\\\' ? match : '\n'
  )
}
