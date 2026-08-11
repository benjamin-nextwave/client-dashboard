/**
 * De bewegende visual op de inlogpagina: één campagne die uitwaaiert naar
 * contacten, met een lichtpuntje per lijn dat de verzending voorstelt en een
 * ontvanger die oplicht zodra het puntje aankomt.
 *
 * Puur decoratief — geen data, geen cijfers. Alle beweging zit in CSS
 * (zie .auth-* in globals.css) zodat prefers-reduced-motion hem stilzet.
 *
 * Alles wat schaalt staat op cx/cy = 0 binnen een <g> die het op zijn plek
 * zet. Zo valt de oorsprong van de transform samen met het middelpunt van de
 * vorm en is transform-box niet nodig — dat verschoof de ringen.
 */

type Lane = {
  /** Baan van de afzender naar de ontvanger. */
  path: string
  /** Hoogte van de ontvanger op x = 610. */
  y: number
  /** Verspringing zodat de vier banen elkaar afwisselen. */
  delay: number
  /** Deze ontvanger heeft geantwoord — het groene vinkje. */
  replied?: boolean
}

const LANES: Lane[] = [
  { path: 'M156 210 C 330 210 400 62 592 62', y: 62, delay: 0 },
  { path: 'M156 210 C 330 210 424 158 592 158', y: 158, delay: 0.8 },
  { path: 'M156 210 C 330 210 424 262 592 262', y: 262, delay: 1.6, replied: true },
  { path: 'M156 210 C 330 210 400 358 592 358', y: 358, delay: 2.4 },
]

/** De cyclus duurt 3,2s; de puls moet net vóór het einde ervan pieken. */
const ARRIVAL_OFFSET = 3

export function OutreachScene() {
  return (
    <svg
      viewBox="0 0 720 420"
      aria-hidden
      className="h-full max-h-[420px] w-full max-w-[720px]"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Verbindingslijnen: eerst de rustende baan, daarna het puntje. */}
      {LANES.map((lane, i) => (
        <g key={`lane-${i}`}>
          <path
            d={lane.path}
            fill="none"
            stroke="rgb(255 255 255 / 0.11)"
            strokeWidth="1.25"
          />
          <path
            className="auth-flow"
            d={lane.path}
            pathLength={100}
            fill="none"
            stroke="var(--c-brand-lift)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="3 97"
            style={{ animationDelay: `${lane.delay}s` }}
          />
        </g>
      ))}

      {/* Afzender: de campagne. */}
      <g transform="translate(112 210)">
        <circle className="auth-breathe" r="60" fill="var(--brand-15)" />
        <circle r="40" fill="var(--brand-20)" />
        <circle
          r="40"
          fill="none"
          stroke="rgb(255 255 255 / 0.22)"
          strokeWidth="1.25"
        />
        <g
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="-13" y="-9.5" width="26" height="19" rx="3.5" />
          <path d="M-13 -6 L0 3 L13 -6" />
        </g>
      </g>

      {/* Ontvangers. */}
      {LANES.map((lane, i) => (
        <g key={`node-${i}`} transform={`translate(610 ${lane.y})`}>
          <circle
            className="auth-ping"
            r="17"
            fill="none"
            stroke="var(--c-brand-lift)"
            strokeWidth="1.5"
            style={{ animationDelay: `${lane.delay + ARRIVAL_OFFSET}s` }}
          />
          <circle r="17" fill="rgb(255 255 255 / 0.07)" />
          <circle
            r="17"
            fill="none"
            stroke="rgb(255 255 255 / 0.16)"
            strokeWidth="1.25"
          />
          {/* Contactje: hoofd en schouders. */}
          <g
            fill="none"
            stroke="rgb(255 255 255 / 0.62)"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <circle cy="-2.5" r="3.25" />
            <path d="M-5.5 6.5 C -5.5 2.5 5.5 2.5 5.5 6.5" />
          </g>

          {lane.replied && (
            <g transform="translate(13 -13)">
              <circle r="7.5" fill="var(--c-cat-meeting)" />
              <path
                d="M-3 0 L-0.75 2.25 L3 -2"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}
        </g>
      ))}
    </svg>
  )
}
