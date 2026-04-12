export type MailCategory =
  | 'reminder_variants'
  | 'reminder_preview'
  | 'reminder_dnc'
  | 'reminder_multiple'
  | 'new_variants'
  | 'new_proposal'

export const MAIL_CATEGORIES: {
  id: MailCategory
  group: string
  label: string
  hasTextInput?: boolean
}[] = [
  { id: 'reminder_variants', group: 'Reminder: onboarding niet voltooid', label: 'Mailvarianten zijn nog niet goedgekeurd' },
  { id: 'reminder_preview', group: 'Reminder: onboarding niet voltooid', label: 'Voorvertoning is niet goedgekeurd' },
  { id: 'reminder_dnc', group: 'Reminder: onboarding niet voltooid', label: 'DNC is niet goedgekeurd' },
  { id: 'reminder_multiple', group: 'Reminder: onboarding niet voltooid', label: 'Meerdere stappen zijn nog niet afgerond' },
  { id: 'new_variants', group: 'Beoordeling', label: 'Nieuwe mailvarianten staan in het dashboard voor beoordeling' },
  { id: 'new_proposal', group: 'Beoordeling', label: 'Nieuw voorstel voor de campagne staat in het dashboard voor beoordeling', hasTextInput: true },
]
