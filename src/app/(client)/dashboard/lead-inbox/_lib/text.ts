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
 */
export function unescapeLiteralNewlines(text: string): string {
  return text.replace(/\\\\|\\r\\n|\\n|\\r/g, (match) =>
    match === '\\\\' ? match : '\n'
  )
}
