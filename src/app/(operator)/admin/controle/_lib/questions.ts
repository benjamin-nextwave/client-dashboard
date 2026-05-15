// Hardcoded question lists for the operator daily check.
// The id is persisted in answers JSONB, so renaming labels is safe but
// changing ids would break history lookups.
//
// Question types control how the operator answers:
//   - 'text'           free-text answer (textarea)
//   - 'checkbox'       single checkmark — answered = "Ja", unanswered = ""
//   - 'checkbox_cross' checkmark of kruisje — answered = "Ja" of "Nee"
//   - 'date'           ISO date string ("YYYY-MM-DD") via date picker
//
// When a type is omitted it defaults to 'text' for backward compatibility
// with answers stored before the type field existed.

export type QuestionType = 'text' | 'checkbox' | 'checkbox_cross' | 'date'

export interface CheckQuestion {
  id: string
  label: string
  type?: QuestionType
}

export const ONBOARDING_QUESTIONS: CheckQuestion[] = [
  { id: 'mailboxen_aangeschaft', label: 'Zijn de mailboxen aangeschaft?', type: 'checkbox' },
  { id: 'mailboxen_warmup', label: 'Staan de mailboxen in de warmup?', type: 'checkbox' },
  { id: 'mailboxen_slow_ramp', label: 'Zijn de mailboxen goed ingesteld ivm slow ramp, response rate etc?', type: 'checkbox' },
  { id: 'instantly_instellingen', label: 'Zijn de instantly instellingen correct ivm tijdzone, sending limit etc?', type: 'checkbox' },
  { id: 'campagnes_aangemaakt', label: 'Zijn de campagnes alvast aangemaakt binnen Instantly?', type: 'checkbox' },
  { id: 'n8n_supabase_toegevoegd', label: 'Is de klant toegevoegd aan de n8n sheet, en de Supabase table?', type: 'checkbox' },
  { id: 'mailopzetjes_ingediend', label: 'Zijn de mailopzetjes gemaakt en ingediend?', type: 'checkbox' },
  { id: 'voorvertoning_ingevuld', label: 'Is de voorvertoning ingevuld?', type: 'checkbox' },
  { id: 'clay_scenario_gemaakt', label: 'Is het clay scenario gemaakt?', type: 'checkbox' },
  { id: 'taken_voor_livegang', label: 'Welke taken zijn er nog te doen voorafgaand aan de livegang?', type: 'text' },
  { id: 'klant_mailen', label: 'Is het handig om de klant even kort te mailen?', type: 'checkbox_cross' },
]

// NOTE: the four "live" questions about contact volumes and campagne-tijden zijn
// inhoudelijk veranderd — zij krijgen daarom NIEUWE ids zodat de eerdere
// antwoorden in operator_client_checks niet onbedoeld worden gemixt met de
// nieuwe vraagstelling. Het oude id blijft in de JSONB-historie bewaard met
// het oude label.
export const LIVE_QUESTIONS: CheckQuestion[] = [
  { id: 'contacten_benaderd_subtotaal', label: 'Hoeveel contacten zijn al benaderd?', type: 'text' },
  { id: 'contacten_onbenaderd', label: 'Hoeveel contacten zijn er nog onbenaderd?', type: 'text' },
  { id: 'reply_rate', label: 'Wat is de reply rate?', type: 'text' },
  { id: 'aantal_leads', label: 'Wat is het aantal leads dat de campagne heeft behaald?', type: 'text' },
  { id: 'mailboxen_volume', label: 'Zitten de mailboxen op de max sending volume, of bouwt het op?', type: 'checkbox_cross' },
  { id: 'campagne_op_schema', label: 'Loopt de campagne op schema?', type: 'checkbox_cross' },
  { id: 'campagne_startdatum', label: 'Startdatum campagne', type: 'date' },
  { id: 'campagne_einddatum_maand', label: 'Einddatum deze maand', type: 'date' },
  { id: 'aanpassingen_targets', label: 'Welke aanpassingen kan ik maken om de campagne de targets te laten hitten?', type: 'text' },
  { id: 'variabelen_kloppen', label: 'Kloppen de variabelen van de gebruikte mailvarianten?', type: 'checkbox_cross' },
  { id: 'recente_varianten_flowchart', label: 'Staan de meest recente mailvarianten in de flowchart van de klant?', type: 'checkbox' },
  { id: 'csv_in_contactenlijst', label: 'Staat een csv van de contacten in de contactenlijst van de klant?', type: 'checkbox' },
  { id: 'update_mail_naar_klant', label: 'Update mail sturen naar de klant', type: 'text' },
]

/**
 * Sentinel value used in answers when the operator clicks "Sla vraag over".
 * Stored as a regular answer string so the JSONB shape blijft consistent.
 */
export const SKIPPED_ANSWER = '__SKIPPED__'
