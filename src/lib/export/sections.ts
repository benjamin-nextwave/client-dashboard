// Welke tabbladen de export kan bevatten. Bewust los van workbook.ts: die
// importeert exceljs, en dat hoort niet in de browserbundel terecht te komen
// alleen omdat de dialoog de labels nodig heeft.

export type ExportSection = 'samenvatting' | 'perDag' | 'klantPerDag' | 'categorie' | 'uitgaven' | 'leads'

export const EXPORT_SECTIONS: Array<{ id: ExportSection; label: string; description: string }> = [
  { id: 'samenvatting', label: 'Samenvatting', description: 'Periodetotalen en een regel per klant' },
  { id: 'perDag', label: 'Per dag', description: 'Omzet, geboekte kosten en resultaat per dag' },
  { id: 'klantPerDag', label: 'Klant per dag', description: 'Omzet per klant per dag, met geschatte winst' },
  { id: 'categorie', label: 'Categorie en campagne', description: 'Omzet per categorie en campagne per dag' },
  { id: 'uitgaven', label: 'Uitgaven', description: 'Alle boekingen uit Rompslomp in de periode' },
  { id: 'leads', label: 'Leads', description: 'Elke lead los: mailadres, datum, campagne, categorie' },
]
