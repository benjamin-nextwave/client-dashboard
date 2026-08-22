/**
 * Schuifregelaars van de antwoord-assistent.
 *
 * Sommige eigenschappen zijn geen knop maar een spectrum: tussen formeel en
 * informeel zit van alles. Een knop dwingt tot kiezen, een schuifregelaar niet.
 *
 * Elke regelaar heeft 21 standen (0 t/m 20). De stand gaat als getal mee in de
 * prompt, samen met de betekenis van beide uiteinden en een omschrijving van de
 * band waarin de stand valt. Elke klik verandert dus de tekst die het model
 * krijgt; om de vier standen verandert bovendien de omschrijving.
 *
 * Waarom niet 21 losse zinnen per regelaar? Die zouden onderling nauwelijks
 * verschillen en elkaar in de weg gaan zitten. Een getal op een geijkte schaal
 * is preciezer én eerlijker over wat er werkelijk gebeurt.
 */

export const SLIDER_STEPS = 20
export const SLIDER_DEFAULT = 10

export interface SliderBand {
  /** Bovengrens van deze band, inclusief. */
  upTo: number
  label: string
}

export interface AssistantSlider {
  id: string
  /** Wat er boven de regelaar staat. */
  title: string
  leftLabel: string
  rightLabel: string
  /** Uitleg van één regel onder de regelaar. */
  hint: string
  /** Betekenis van stand 0 en stand 20, letterlijk in de prompt. */
  leftMeaning: string
  rightMeaning: string
  bands: SliderBand[]
  /** Extra regel die alleen bij bepaalde standen geldt. */
  extra?: (value: number) => string | null
}

export const ASSISTANT_SLIDERS: AssistantSlider[] = [
  {
    id: 'aanspreekvorm',
    title: 'Aanspreekvorm',
    leftLabel: 'Formeel',
    rightLabel: 'Informeel',
    hint: 'Bepaalt u/uw of je/jij, en hoe los de rest van de zinnen klinken.',
    leftMeaning:
      'strikt formeel: u en uw, volledige zinnen, geen afkortingen, beleefd op afstand',
    rightMeaning:
      'heel informeel: je en jij, spreektaal, korte zinnen, alsof je een bekende mailt',
    bands: [
      { upTo: 3, label: 'strikt formeel' },
      { upTo: 7, label: 'overwegend formeel' },
      { upTo: 9, label: 'formeel maar toegankelijk' },
      { upTo: 12, label: 'gewoon en toegankelijk' },
      { upTo: 16, label: 'informeel' },
      { upTo: 20, label: 'heel los en informeel' },
    ],
    // Het Nederlands kent geen tussenvorm tussen u en jij; dat moet dus hard
    // gezegd worden, anders wisselt het model er binnen één mail tussen.
    extra: (value) =>
      value < 10
        ? 'Gebruik in dit bericht consequent "u" en "uw".'
        : 'Gebruik in dit bericht consequent "je" en "jij".',
  },
  {
    id: 'lengte',
    title: 'Lengte',
    leftLabel: 'Kort antwoord',
    rightLabel: 'Lang antwoord',
    hint: 'Hoeveel zinnen het antwoord ongeveer telt.',
    leftMeaning: 'zo kort mogelijk: twee zinnen, alleen het hoognodige',
    rightMeaning: 'uitgebreid: alle ruimte om het volledig uit te leggen',
    bands: [
      { upTo: 3, label: 'heel kort' },
      { upTo: 7, label: 'kort' },
      { upTo: 12, label: 'gemiddeld' },
      { upTo: 16, label: 'ruim' },
      { upTo: 20, label: 'uitgebreid' },
    ],
    extra: (value) => {
      const target = Math.max(2, Math.round(2 + value * 0.7))
      const from = Math.max(2, target - 1)
      return `Mik op ongeveer ${from} tot ${target + 1} zinnen, de aanhef en de groet niet meegeteld.`
    },
  },
  {
    id: 'diepgang',
    title: 'Diepgang',
    leftLabel: 'Oppervlakkig',
    rightLabel: 'Inhoudelijk',
    hint: 'Hoe ver je ingaat op de vragen van de lead.',
    leftMeaning:
      'blijf aan de oppervlakte: raak de kern aan, leg niets uit en verwijs voor details naar een gesprek',
    rightMeaning:
      'ga inhoudelijk in op elke vraag, onderbouwd met wat er in de kennisbank staat',
    bands: [
      { upTo: 3, label: 'alleen de kern' },
      { upTo: 7, label: 'beknopt, met een enkele toelichting' },
      { upTo: 12, label: 'beantwoordt de hoofdvraag met uitleg' },
      { upTo: 16, label: 'beantwoordt alle vragen met uitleg' },
      { upTo: 20, label: 'volledig en onderbouwd' },
    ],
  },
  {
    id: 'toon',
    title: 'Toon',
    leftLabel: 'Vrolijk',
    rightLabel: 'Serieus',
    hint: 'De sfeer: opgewekt en luchtig, of ingetogen en ernstig.',
    leftMeaning:
      'opgewekt en luchtig: enthousiast, warm, af en toe een knipoog',
    rightMeaning:
      'ingetogen en ernstig: nuchter, feitelijk, geen luchtigheid of grapjes',
    bands: [
      { upTo: 3, label: 'uitgesproken vrolijk' },
      { upTo: 7, label: 'opgewekt' },
      { upTo: 12, label: 'neutraal vriendelijk' },
      { upTo: 16, label: 'serieus' },
      { upTo: 20, label: 'uitgesproken ernstig' },
    ],
  },
]

export const SLIDERS_BY_ID: Map<string, AssistantSlider> = new Map(
  ASSISTANT_SLIDERS.map((s) => [s.id, s])
)

export type SliderValues = Record<string, number>

/** Standen zoals ze gelden zolang de klant niets versleept heeft. */
export function defaultSliderValues(): SliderValues {
  return Object.fromEntries(ASSISTANT_SLIDERS.map((s) => [s.id, SLIDER_DEFAULT]))
}

/** Onbekende sleutels weg, standen binnen bereik, ontbrekende op het midden. */
export function normalizeSliderValues(raw: unknown): SliderValues {
  const out = defaultSliderValues()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out

  for (const slider of ASSISTANT_SLIDERS) {
    const value = (raw as Record<string, unknown>)[slider.id]
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    out[slider.id] = Math.min(SLIDER_STEPS, Math.max(0, Math.round(value)))
  }
  return out
}

export function bandFor(slider: AssistantSlider, value: number): string {
  for (const band of slider.bands) {
    if (value <= band.upTo) return band.label
  }
  return slider.bands[slider.bands.length - 1].label
}

/** De regels die achter de basisprompt komen, één blok per regelaar. */
export function sliderInstructions(values: SliderValues): string[] {
  const normalized = normalizeSliderValues(values)
  return ASSISTANT_SLIDERS.map((slider) => {
    const value = normalized[slider.id]
    const parts = [
      `${slider.title}: stand ${value} van ${SLIDER_STEPS} — ${bandFor(slider, value)}.`,
      `Op deze schaal betekent 0 "${slider.leftMeaning}" en ${SLIDER_STEPS} "${slider.rightMeaning}".`,
      `Schrijf zoals stand ${value} klinkt, niet zoals een van de uiteinden.`,
    ]
    const extra = slider.extra?.(value)
    if (extra) parts.push(extra)
    return parts.join(' ')
  })
}
