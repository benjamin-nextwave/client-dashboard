// Hardcoded question lists for the operator daily check.
// The id is persisted in answers JSONB, so renaming labels is safe but
// changing ids would break history lookups.

export interface CheckQuestion {
  id: string
  label: string
}

export const ONBOARDING_QUESTIONS: CheckQuestion[] = [
  { id: 'mailboxen_aangeschaft', label: 'Zijn de mailboxen aangeschaft?' },
  { id: 'mailboxen_warmup', label: 'Staan de mailboxen in de warmup?' },
  { id: 'campagnes_aangemaakt', label: 'Zijn de campagnes alvast aangemaakt binnen Instantly?' },
  { id: 'n8n_supabase_toegevoegd', label: 'Is de klant toegevoegd aan de n8n sheet, en de Supabase table?' },
  { id: 'mailopzetjes_ingediend', label: 'Zijn de mailopzetjes gemaakt en ingediend?' },
  { id: 'voorvertoning_ingevuld', label: 'Is de voorvertoning ingevuld?' },
  { id: 'clay_scenario_gemaakt', label: 'Is het clay scenario gemaakt?' },
  { id: 'taken_voor_livegang', label: 'Welke taken zijn er nog te doen voorafgaand aan de livegang?' },
  { id: 'klant_mailen', label: 'Is het handig om de klant even kort te mailen?' },
]

export const LIVE_QUESTIONS: CheckQuestion[] = [
  { id: 'contacten_database', label: 'Hoeveel contacten zitten er in de database?' },
  { id: 'contacten_benaderd', label: 'Hoeveel contacten zijn er benaderd in totaal?' },
  { id: 'reply_rate', label: 'Wat is de reply rate?' },
  { id: 'aantal_leads', label: 'Wat is het aantal leads dat de campagne heeft behaald?' },
  { id: 'mailboxen_volume', label: 'Zitten de mailboxen op de max sending volume, of bouwt het op?' },
  { id: 'campagne_op_schema', label: 'Loopt de campagne op schema?' },
  { id: 'campagne_loopt_al', label: 'Hoe lang loopt de campagne al?' },
  { id: 'campagne_moet_nog', label: 'Hoe lang moet de campagne nog lopen?' },
  { id: 'aanpassingen_targets', label: 'Welke aanpassingen kan ik maken om de campagne de targets te laten hitten?' },
  { id: 'variabelen_kloppen', label: 'Kloppen de variabelen van de gebruikte mailvarianten?' },
  { id: 'recente_varianten_flowchart', label: 'Staan de meest recente mailvarianten in de flowchart van de klant?' },
  { id: 'csv_in_contactenlijst', label: 'Staat een csv van de contacten in de contactenlijst van de klant?' },
  { id: 'update_mail_naar_klant', label: 'Update mail sturen naar de klant' },
]
