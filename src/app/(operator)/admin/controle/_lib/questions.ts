// Hardcoded question lists for the operator daily check.
// The id is persisted in answers JSONB, so renaming labels is safe but
// changing ids would break history lookups.
//
// Question types control how the operator answers:
//   - 'text'           free-text answer (textarea)
//   - 'number'         numeric input — used by threshold-driven suggestions
//   - 'checkbox'       single checkmark — answered = "Ja", unanswered = ""
//   - 'checkbox_cross' checkmark of kruisje — answered = "Ja" of "Nee"
//   - 'date'           ISO date string ("YYYY-MM-DD") via date picker
//
// When a type is omitted it defaults to 'text' for backward compatibility
// with answers stored before the type field existed.

export type QuestionType = 'text' | 'number' | 'checkbox' | 'checkbox_cross' | 'date'
export type Persona = 'benjamin' | 'merlijn'

/**
 * Threshold-config: zodra het antwoord op de vraag aan de drempel voldoet,
 * stelt de UI voor om een taak aan te maken voor de aangewezen persoon.
 *
 *  - field 'op': vergelijking met threshold-waarde
 *      'lt' = answer < value   (te laag)
 *      'gt' = answer > value
 *      'lte', 'gte'
 *  - 'compareTo': vergelijking met een andere ingevoerde vraag óf een
 *      monthly-data veld. 'monthlyContacts' verwijst naar
 *      operator_client_monthly_data.contacts_to_approach voor de huidige
 *      maand. Als die niet is ingevuld, wordt de drempel niet getriggerd.
 *  - 'condition': extra voorwaarde die óók waar moet zijn voordat de
 *      suggestie verschijnt (bv. alleen suggestie als er al >= 500
 *      contacten benaderd zijn).
 */
export interface QuestionThreshold {
  op: 'lt' | 'lte' | 'gt' | 'gte'
  value?: number
  compareTo?: 'monthlyContacts'
  assignTo: Persona
  suggestion: string
  condition?: {
    questionId: string
    op: 'lt' | 'lte' | 'gt' | 'gte'
    value: number
  }
}

/**
 * Voorgestelde taak die verschijnt op basis van een antwoord op een vraag.
 * Wordt gebruikt voor zowel 'Nee'-antwoorden (iets is fout/ontbreekt) als
 * 'Ja'-antwoorden (er moet nog iets gedaan worden).
 */
export interface TaskSuggestion {
  assignTo: Persona
  suggestion: string
}

/** @deprecated bewaar voor backwards-compatibility met eerdere imports. */
export type SuggestOnNo = TaskSuggestion

export interface CheckQuestion {
  id: string
  label: string
  type?: QuestionType
  threshold?: QuestionThreshold
  /** Aanvullende context (uitklapbaar onder de vraag). */
  contextInfo?: string
  /** Bij 'Nee'-antwoord op een checkbox_cross-vraag: voorgestelde taak. */
  suggestOnNo?: TaskSuggestion
  /** Bij 'Ja'-antwoord op een checkbox_cross-vraag: voorgestelde taak.
   *  Handig voor vragen die direct een actie beschrijven (bv. "Update mail
   *  sturen naar de klant" → ja = doen). */
  suggestOnYes?: TaskSuggestion
  /** Bij een leeg checkbox-antwoord (niet aangevinkt): voorgestelde taak. */
  suggestOnUnchecked?: TaskSuggestion
}

// ---------------------------------------------------------------------------
// ONBOARDING — Merlijn (er is bewust geen Benjamin-onboardinglijst; klikt
// een gebruiker op een onboarding-klant terwijl hij als Benjamin werkt, dan
// krijgt hij dezelfde lijst te zien).
// ---------------------------------------------------------------------------

const SUPABASE_N8N_CONTEXT = `1. Ga naar Supabase → table editor → customers table → Insert → Insert row. Vul name in (bedrijfsnaam klant), notification email (email uit invulformulier of dashboard login). Status moet op "active" staan.
2. Ga naar https://docs.google.com/spreadsheets/d/1T8beLt1b86tPD9uAx9AnGjJhbr-xY384waBa4DSs7uo/edit?gid=0#gid=0
3. Vul voor iedere campagne die deze klant heeft een rij in, met:
   • campagne id van Instantly (uit de URL)
   • is_active op "klopt" zetten indien de klant live staat
   • customer id = de id die Supabase had aangemaakt (id UUID)
4. Ga naar de instellingen van het klantendashboard vanuit het operator dashboard.
   • Klik "Lead inbox (nieuw) zichtbaar" en zet deze aan.
   • Zet de andere 2 inboxen uit.
   • Scroll naar "Lead inbox customer ID" en vul daar de client id in. Sla op.
   • Ga terug naar de klant, scroll helemaal naar onder en vul de campaign id's in met campagnenaam. Sla op.`

const TAM_MAILBOXEN_CONTEXT = `TAM 3.000 → 2 domeinen, 6 mailboxen
TAM 5.000 → 3 domeinen, 9 mailboxen
TAM 7.000 → 4 domeinen, 12 mailboxen
TAM 9.000+ → 6 domeinen, 18 mailboxen`

const VOORVERTONING_CONTEXT = `Check invulformulier en vraag aan Claude wat een realistische verdeling is. Vul de data dan zelf in.`

export const ONBOARDING_QUESTIONS_MERLIJN: CheckQuestion[] = [
  {
    id: 'mailboxen_aangeschaft',
    label: 'Zijn de mailboxen aangeschaft?',
    type: 'checkbox_cross',
    contextInfo: TAM_MAILBOXEN_CONTEXT,
    suggestOnNo: {
      assignTo: 'merlijn',
      suggestion: `Mailboxen aanschaffen volgens TAM-verdeling:

${TAM_MAILBOXEN_CONTEXT}`,
    },
  },
  {
    id: 'mailboxen_warmup',
    label: 'Staan de mailboxen in de warmup?',
    type: 'checkbox_cross',
    suggestOnNo: {
      assignTo: 'merlijn',
      suggestion: 'Mailboxen in warmup zetten',
    },
  },
  {
    id: 'mailboxen_slow_ramp',
    label: 'Zijn de mailboxen goed ingesteld ivm slow ramp, response rate etc?',
    type: 'checkbox_cross',
    suggestOnNo: {
      assignTo: 'merlijn',
      suggestion: 'Mailboxen herinstellen voor slow ramp en response rate',
    },
  },
  {
    id: 'instantly_instellingen',
    label: 'Is de campagne al gemaakt en zijn de Instantly-instellingen correct ivm tijdzone, sending limit etc?',
    type: 'checkbox_cross',
    suggestOnNo: {
      assignTo: 'merlijn',
      suggestion: 'Campagne aanmaken en Instantly-instellingen corrigeren (tijdzone, sending limit, etc.)',
    },
  },
  {
    id: 'n8n_supabase_toegevoegd',
    label: 'Is de klant toegevoegd aan de n8n sheet, en de Supabase table?',
    type: 'checkbox_cross',
    contextInfo: SUPABASE_N8N_CONTEXT,
    suggestOnNo: {
      assignTo: 'merlijn',
      suggestion: `Klant toevoegen aan n8n-sheet en Supabase:

${SUPABASE_N8N_CONTEXT}`,
    },
  },
  {
    id: 'mailopzetjes_ingediend',
    label: 'Zijn de mailopzetjes gemaakt en ingediend? (controleer of de PDF is geüpload)',
    type: 'checkbox_cross',
    suggestOnNo: {
      assignTo: 'benjamin',
      suggestion: 'Mailopzetjes maken en PDF uploaden',
    },
  },
  {
    id: 'voorvertoning_ingevuld',
    label: 'Is de voorvertoning ingevuld?',
    type: 'checkbox_cross',
    contextInfo: VOORVERTONING_CONTEXT,
    suggestOnNo: {
      assignTo: 'merlijn',
      suggestion: `Voorvertoning invullen.

${VOORVERTONING_CONTEXT}`,
    },
  },
  {
    id: 'clay_scenario_gemaakt',
    label: 'Is het clay scenario gemaakt?',
    type: 'checkbox_cross',
    suggestOnNo: {
      assignTo: 'benjamin',
      suggestion: 'Clay-scenario maken',
    },
  },
  {
    id: 'klant_mailen',
    label: 'Is het handig om de klant even kort te mailen?',
    type: 'checkbox_cross',
    suggestOnYes: {
      assignTo: 'merlijn',
      suggestion: 'Klant kort mailen',
    },
  },
]

// ---------------------------------------------------------------------------
// LIVE — Merlijn (10 klanten per dag, operationele controle)
// ---------------------------------------------------------------------------
export const LIVE_QUESTIONS_MERLIJN: CheckQuestion[] = [
  {
    id: 'contacten_benaderd_subtotaal',
    label: 'Hoeveel contacten zijn al benaderd?',
    type: 'number',
  },
  {
    id: 'contacten_onbenaderd',
    label: 'Hoeveel contacten zijn er nog onbenaderd?',
    type: 'number',
  },
  {
    id: 'campagne_contacten_totaal',
    label: 'Heeft de campagne meer dan {{aantal}} contacten?',
    type: 'number',
    threshold: {
      op: 'lt',
      compareTo: 'monthlyContacts',
      assignTo: 'merlijn',
      suggestion: 'Campagne heeft te weinig contacten voor het maandtarget — contactenlijst aanvullen',
    },
  },
  {
    id: 'reply_rate',
    label: 'Wat is de reply rate? (in %)',
    type: 'number',
    threshold: {
      op: 'lt',
      value: 5,
      assignTo: 'benjamin',
      suggestion: 'Reply rate ligt onder 5% — analyseren en bijsturen',
    },
  },
  {
    id: 'aantal_leads',
    label: 'Wat is het aantal leads dat de campagne heeft behaald?',
    type: 'number',
    threshold: {
      op: 'lt',
      value: 1,
      assignTo: 'benjamin',
      suggestion: 'Minder dan 1 lead na 500+ benaderde contacten — campagne analyseren',
      condition: {
        questionId: 'contacten_benaderd_subtotaal',
        op: 'gte',
        value: 500,
      },
    },
  },
  {
    id: 'mailboxen_volume',
    label: 'Zitten de mailboxen op de max sending volume, of bouwt het op?',
    type: 'checkbox_cross',
    suggestOnNo: {
      assignTo: 'merlijn',
      suggestion: 'Mailboxen niet op max sending volume — checken en bijstellen',
    },
  },
  {
    id: 'recente_varianten_flowchart',
    label: 'Staan de meest recente mailvarianten in de flowchart van de klant?',
    type: 'checkbox_cross',
    suggestOnNo: {
      assignTo: 'merlijn',
      suggestion: 'Recente mailvarianten in flowchart van de klant zetten',
    },
  },
  {
    id: 'bedrijfsnaam_afzender_spelling',
    label: 'Kloppen de bedrijfsnaam en afzender naam volledig, zitten er spelfouten in?',
    type: 'checkbox',
  },
  {
    id: 'update_mail_naar_klant_merlijn',
    label: 'Moet er een update mail naar de klant gestuurd worden?',
    type: 'checkbox_cross',
    suggestOnYes: {
      assignTo: 'merlijn',
      suggestion: 'Update mail sturen naar de klant',
    },
  },
  {
    id: 'csv_in_contactenlijst',
    label: 'Staat een csv van de contacten in de contactenlijst van de klant?',
    type: 'checkbox_cross',
    suggestOnNo: {
      assignTo: 'merlijn',
      suggestion: 'CSV van contacten in contactenlijst van de klant zetten',
    },
  },
  {
    id: 'voorvertoning_verwijderd',
    label: 'Is de voorvertoning weer verwijderd?',
    type: 'checkbox_cross',
    suggestOnNo: {
      assignTo: 'merlijn',
      suggestion: 'Voorvertoning verwijderen uit het klantendashboard',
    },
  },
]

// ---------------------------------------------------------------------------
// LIVE — Benjamin (strategische controle)
// ---------------------------------------------------------------------------
export const LIVE_QUESTIONS_BENJAMIN: CheckQuestion[] = [
  {
    id: 'campagne_op_schema',
    label: 'Loopt de campagne op schema?',
    type: 'checkbox_cross',
    suggestOnNo: {
      assignTo: 'benjamin',
      suggestion: 'Campagne loopt niet op schema — analyseren en bijsturen',
    },
  },
  {
    id: 'aanpassingen_targets',
    label: 'Welke aanpassingen kan ik maken om de campagne de targets te laten hitten?',
    type: 'text',
  },
  {
    id: 'variabelen_kloppen',
    label: 'Kloppen de variabelen van de gebruikte mailvarianten?',
    type: 'checkbox_cross',
    suggestOnNo: {
      assignTo: 'benjamin',
      suggestion: 'Variabelen van mailvarianten corrigeren',
    },
  },
  {
    id: 'update_mail_naar_klant_benjamin',
    label: 'Moet er een update mail naar de klant gestuurd worden?',
    type: 'checkbox_cross',
    suggestOnYes: {
      assignTo: 'benjamin',
      suggestion: 'Update mail sturen naar de klant',
    },
  },
]

// ---------------------------------------------------------------------------
// Backwards-compat exports (history view leest labels uit de stored payload
// dus deze constanten zijn voor type-import voldoende — we bewaren ze als
// alias zodat code die nog 'ONBOARDING_QUESTIONS' importeert blijft werken).
// ---------------------------------------------------------------------------
export const ONBOARDING_QUESTIONS = ONBOARDING_QUESTIONS_MERLIJN
export const LIVE_QUESTIONS = LIVE_QUESTIONS_MERLIJN

/**
 * Helper: kies de juiste live-vragenlijst per persona.
 */
export function liveQuestionsFor(persona: Persona): CheckQuestion[] {
  return persona === 'benjamin' ? LIVE_QUESTIONS_BENJAMIN : LIVE_QUESTIONS_MERLIJN
}

/**
 * Helper: kies de onboardinglijst. Benjamin krijgt bewust dezelfde lijst
 * als Merlijn — er is geen aparte Benjamin-onboarding (spec).
 * Persona blijft als parameter voor symmetrie met liveQuestionsFor en
 * om uitbreidbaarheid open te houden.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function onboardingQuestionsFor(persona: Persona): CheckQuestion[] {
  return ONBOARDING_QUESTIONS_MERLIJN
}

/**
 * Sentinel value used in answers when the operator clicks "Sla vraag over".
 * Stored as a regular answer string so the JSONB shape blijft consistent.
 */
export const SKIPPED_ANSWER = '__SKIPPED__'
