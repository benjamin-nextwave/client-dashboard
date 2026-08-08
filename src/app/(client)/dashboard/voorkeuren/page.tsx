import { redirect } from 'next/navigation'

/**
 * Instellingen is bij de herindeling vervallen. De uitlegvideo's staan nu op
 * Hulp & uitleg; de blokken Account en Meldingen zijn eruit gehaald.
 *
 * Let op: hiermee kan de klant zijn notificatie-adres niet meer zelf wijzigen.
 * De kolommen notification_email en notifications_enabled op `clients` blijven
 * gewoon werken — ze zijn alleen niet meer via het dashboard te bereiken.
 */
export default function VoorkeurenPage() {
  redirect('/dashboard')
}
