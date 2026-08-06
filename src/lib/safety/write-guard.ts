/**
 * Beveiliging tegen schrijf-acties naar buiten vanuit een niet-productie-omgeving.
 *
 * Bewust omgekeerd geformuleerd: niet "blokkeer wanneer dit een testomgeving is",
 * maar "sta alleen toe wanneer expliciet aangezet". Een vergeten of verkeerd
 * gespelde environment variable leidt dan tot blokkeren in plaats van tot een
 * echte e-mail naar een echte prospect.
 *
 * Zet ALLOW_OUTBOUND_WRITES=true uitsluitend in de Vercel Production-scope.
 */

/**
 * Niet op moduleniveau uitlezen: dat wordt één keer per cold start bevroren.
 * Als functie is de waarde altijd die van het huidige request.
 */
export function outboundWritesEnabled(): boolean {
  return process.env.ALLOW_OUTBOUND_WRITES === 'true'
}

/**
 * Aparte error-klasse zodat aanroepers dit kunnen onderscheiden van een echte
 * API-storing. Een netwerkfout betekent "probeer opnieuw"; dit betekent
 * "dit gaat hier nooit werken".
 */
export class OutboundBlockedError extends Error {
  readonly action: string

  constructor(action: string) {
    super(
      `Testomgeving — "${action}" is geblokkeerd. Er is niets verstuurd. ` +
        `Deze actie werkt alleen op de live omgeving.`
    )
    this.name = 'OutboundBlockedError'
    this.action = action
  }
}

/** Gooit een OutboundBlockedError wanneer schrijf-acties niet zijn toegestaan. */
export function assertOutboundAllowed(action: string): void {
  if (outboundWritesEnabled()) return

  console.warn(
    `[guard] geblokkeerd: ${action} — ALLOW_OUTBOUND_WRITES staat niet op 'true'`
  )
  throw new OutboundBlockedError(action)
}

/** Type-guard voor gebruik in catch-blokken. */
export function isOutboundBlocked(err: unknown): err is OutboundBlockedError {
  return err instanceof OutboundBlockedError
}
