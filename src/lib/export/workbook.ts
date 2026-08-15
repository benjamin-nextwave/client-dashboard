import ExcelJS from 'exceljs'
import type { ExportData } from '@/lib/data/export-data'
import { MONTHLY_SALARY_CENTS, SALARY_HEADCOUNT } from '@/lib/commissions-shared'
import type { ExportSection } from './sections'

// Bouwt het Excel-bestand. Vormgeving is hier geen opsmuk maar leesbaarheid:
// een bevroren kopregel, een filterknop per kolom en een echt valutaformaat
// schelen bij elk gebruik werk. Bedragen gaan als getal in euro's het bestand
// in (niet als tekst), zodat Excel en elk dashboard ermee kunnen rekenen.

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F2937' },
}

const EURO_FORMAT = '€ #,##0.00'
const HAIRLINE = 'FFE5E7EB'

interface ColumnSpec<T> {
  header: string
  width: number
  /** 'euro' krijgt een valutaformaat en telt mee in de totaalregel. */
  kind?: 'text' | 'number' | 'euro'
  /** Voor kolommen waarvan een som niets betekent, zoals een stukprijs. */
  excludeFromTotal?: boolean
  value: (row: T) => string | number
}

function euros(cents: number): number {
  return Math.round(cents) / 100
}

/** "2026-08-13" → "2026-08" — een kant-en-klare draaitabel-dimensie. */
function monthOf(date: string): string {
  return date.slice(0, 7)
}

const WEEKDAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']

function weekdayOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return ''
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? ''
}

/**
 * Zet een tabblad neer met kopregel, filter en de juiste getalnotaties.
 * `totalsRow` voegt onderaan een vetgedrukte optelling toe over alle
 * euro-kolommen — precies waar je bij een export als eerste naar kijkt.
 */
function addSheet<T>(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: Array<ColumnSpec<T>>,
  rows: T[],
  options: { totalsRow?: boolean } = {}
): void {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  sheet.columns = columns.map((c) => ({ header: c.header, width: c.width }))

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  headerRow.fill = HEADER_FILL
  headerRow.height = 22
  headerRow.alignment = { vertical: 'middle' }

  for (const row of rows) {
    sheet.addRow(columns.map((c) => c.value(row)))
  }

  columns.forEach((c, i) => {
    const column = sheet.getColumn(i + 1)
    if (c.kind === 'euro') column.numFmt = EURO_FORMAT
    if (c.kind === 'number') column.numFmt = '#,##0'
  })

  // Zebrastrepen maken lange rijen leesbaar zonder de kolommen te vertroebelen.
  for (let i = 2; i <= rows.length + 1; i++) {
    const row = sheet.getRow(i)
    if (i % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }
    }
    row.border = { bottom: { style: 'hair', color: { argb: HAIRLINE } } }
  }

  if (options.totalsRow && rows.length > 0) {
    const total = sheet.addRow(
      columns.map((c, i) => {
        if (i === 0) return 'Totaal'
        if ((c.kind === 'euro' || c.kind === 'number') && !c.excludeFromTotal) {
          const sum = rows.reduce((acc, row) => {
            const v = c.value(row)
            return acc + (typeof v === 'number' ? v : 0)
          }, 0)
          // Optellen van euro-floats levert anders 113.00000000000001 op.
          return c.kind === 'euro' ? Math.round(sum * 100) / 100 : sum
        }
        return ''
      })
    )
    total.font = { bold: true }
    total.border = { top: { style: 'thin', color: { argb: 'FF9CA3AF' } } }
  }

  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    }
  }
}

function formatDateNl(date: string): string {
  const [y, m, d] = date.split('-')
  return y && m && d ? `${d}-${m}-${y}` : date
}

/** Tabblad met uitleg — zonder dit weet niemand over een half jaar nog wat 'geschat' betekende. */
function addExplanationSheet(workbook: ExcelJS.Workbook, data: ExportData, generatedAt: string): void {
  const sheet = workbook.addWorksheet('Toelichting')
  sheet.columns = [{ width: 34 }, { width: 96 }]

  const title = sheet.addRow(['Nextwave — data-export'])
  title.font = { bold: true, size: 16 }
  title.height = 26
  sheet.addRow([])

  const facts: Array<[string, string]> = [
    ['Periode', `${formatDateNl(data.from)} t/m ${formatDateNl(data.to)}`],
    [
      'Klanten',
      data.selectedClientNames.length === 0
        ? 'Alle klanten'
        : `${data.selectedClientNames.length} geselecteerd: ${data.selectedClientNames.join(', ')}`,
    ],
    [
      'Afgekeurde leads',
      data.includeRejected
        ? `Tellen mee in de omzet (${data.totals.rejectedCount} stuks, ${new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(euros(data.totals.rejectedRevenueCents))})`
        : `Tellen NIET mee in de omzet (${data.totals.rejectedCount} stuks uitgesloten)`,
    ],
    ['Aantal leads', String(data.totals.leadCount)],
    ['Gemaakt op', generatedAt],
  ]

  for (const [label, value] of facts) {
    const row = sheet.addRow([label, value])
    row.getCell(1).font = { bold: true }
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' }
  }

  sheet.addRow([])
  const heading = sheet.addRow(['Wat staat waar'])
  heading.font = { bold: true, size: 13 }

  const sheetNotes: Array<[string, string]> = [
    ['Samenvatting', 'Totalen over de hele periode, plus één regel per klant.'],
    ['Per dag', 'Per kalenderdag: omzet, de op die dag geboekte uitgaven en het verschil.'],
    ['Klant per dag', 'Omzet per klant per dag, met toegerekende kosten en winst (schatting).'],
    ['Categorie en campagne', 'Omzet uitgesplitst naar categorie en campagne per klant per dag.'],
    ['Uitgaven', 'Alle definitieve boekingen uit Rompslomp binnen de periode, exclusief btw.'],
    ['Leads', 'Elke lead apart, met mailadres, datum, campagne, categorie en status.'],
  ]
  for (const [label, value] of sheetNotes) {
    const row = sheet.addRow([label, value])
    row.getCell(1).font = { bold: true }
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' }
  }

  sheet.addRow([])
  const warning = sheet.addRow(['Let op bij de geschatte kolommen'])
  warning.font = { bold: true, size: 13, color: { argb: 'FFB45309' } }

  const notes: string[] = [
    'Omzet is een hard cijfer: die komt per lead uit de commissiecontrole, met de prijs van de categorie op dat moment.',
    'Kosten zijn dat niet. Rompslomp boekt een uitgave op een datum, niet op een klant of campagne. Er bestaat dus geen geboekt cijfer voor "de kosten van klant X".',
    'Waar dit bestand toch kosten of winst per klant toont, zijn die verdeeld naar rato van omzet over de hele periode: een klant die 30% van de omzet maakte, krijgt 30% van de kosten toegewezen. Die kolommen heten daarom expliciet "(schatting)".',
    'Salaris werkt hetzelfde: een vast bedrag per aangeraakte kalendermaand, dat naar rato van omzet over de klanten verdeeld wordt.',
    `Salaris in deze periode: ${data.totals.salaryMonths} maand(en) × ${SALARY_HEADCOUNT} personen × ${new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(euros(MONTHLY_SALARY_CENTS))}.`,
    'Op het tabblad "Per dag" staan alleen echte cijfers: de kosten daar zijn de uitgaven die op díé dag geboekt zijn. Een boekhoudpost hoort bij de dag waarop hij geboekt is, niet bij de dag waarop het werk gebeurde — verwacht daar dus pieken.',
  ]

  if (data.expensesError) {
    notes.push(
      `WAARSCHUWING: de uitgaven konden niet uit Rompslomp worden opgehaald (${data.expensesError}). Alle kosten- en winstkolommen in dit bestand staan daarom op nul of leeg. De omzet klopt wel.`
    )
  }
  if (data.expensesSkipped > 0) {
    notes.push(
      `Let op: ${data.expensesSkipped} boeking(en) in Rompslomp konden niet gelezen worden (bedrag of datum onleesbaar) en ontbreken in het kostentotaal.`
    )
  }

  for (const note of notes) {
    const row = sheet.addRow(['', note])
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' }
    row.height = 30
  }
}

function addSummarySheet(workbook: ExcelJS.Workbook, data: ExportData): void {
  const sheet = workbook.addWorksheet('Samenvatting')
  sheet.columns = [{ width: 40 }, { width: 20 }, { width: 60 }]

  const title = sheet.addRow(['Totalen over de periode'])
  title.font = { bold: true, size: 14 }
  sheet.addRow([])

  const { totals } = data
  const unknown = 'onbekend'

  const lines: Array<[string, number | string, string]> = [
    ['Omzet (commissies)', euros(totals.revenueCents), 'Som van alle meegetelde leads'],
    [
      'Uitgaven (Rompslomp)',
      totals.expensesCents === null ? unknown : -euros(totals.expensesCents),
      totals.expensesCents === null ? 'Koppeling gaf geen cijfers' : 'Definitieve boekingen, exclusief btw',
    ],
    [
      'Netto (omzet - uitgaven)',
      totals.netCents === null ? unknown : euros(totals.netCents),
      totals.netCents === null ? 'Niet te bepalen zonder uitgaven' : '',
    ],
    [
      `Salaris (${totals.salaryMonths} mnd × ${SALARY_HEADCOUNT} pers.)`,
      -euros(totals.salaryCents),
      'Vast bedrag per aangeraakte kalendermaand',
    ],
    [
      'Bedrag over na salaris',
      totals.afterSalaryCents === null ? unknown : euros(totals.afterSalaryCents),
      totals.afterSalaryCents === null ? 'Niet te bepalen zonder uitgaven' : '',
    ],
  ]

  for (const [label, value, note] of lines) {
    const row = sheet.addRow([label, value, note])
    row.getCell(1).font = { bold: true }
    if (typeof value === 'number') row.getCell(2).numFmt = EURO_FORMAT
    row.getCell(3).font = { color: { argb: 'FF6B7280' }, size: 10 }
  }

  sheet.addRow([])
  const countsTitle = sheet.addRow(['Aantallen'])
  countsTitle.font = { bold: true, size: 13 }

  const counts: Array<[string, number, string]> = [
    ['Leads totaal', totals.leadCount, ''],
    [
      'Waarvan afgekeurd',
      totals.rejectedCount,
      data.includeRejected ? 'Tellen mee in de omzet hierboven' : 'Tellen niet mee in de omzet hierboven',
    ],
    ['Klanten met leads', totals.clientCount, ''],
    ['Dagen met omzet', totals.activeDays, ''],
  ]
  for (const [label, value, note] of counts) {
    const row = sheet.addRow([label, value, note])
    row.getCell(1).font = { bold: true }
    row.getCell(2).numFmt = '#,##0'
    row.getCell(3).font = { color: { argb: 'FF6B7280' }, size: 10 }
  }

  sheet.addRow([])
  sheet.addRow([])

  // Per klant, als eigen tabelblok onder de totalen.
  const perClientTitle = sheet.addRow(['Per klant'])
  perClientTitle.font = { bold: true, size: 13 }

  const headers = [
    'Klant',
    'Leads',
    'Afgekeurd',
    'Dagen',
    'Eerste lead',
    'Laatste lead',
    'Omzet',
    'Toegerekende kosten (schatting)',
    'Winst (schatting)',
    'Toegerekend salaris (schatting)',
    'Winst na salaris (schatting)',
  ]
  const headerRow = sheet.addRow(headers)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = HEADER_FILL
  headerRow.height = 30
  headerRow.alignment = { wrapText: true, vertical: 'middle' }

  const firstDataRow = headerRow.number + 1
  for (const c of data.clientTotals) {
    const row = sheet.addRow([
      c.companyName,
      c.leadCount,
      c.rejectedCount,
      c.activeDays,
      c.firstLeadDate ?? '',
      c.lastLeadDate ?? '',
      euros(c.revenueCents),
      euros(c.estimatedCostCents),
      euros(c.estimatedProfitCents),
      euros(c.estimatedSalaryCents),
      euros(c.estimatedProfitAfterSalaryCents),
    ])
    for (let i = 7; i <= 11; i++) row.getCell(i).numFmt = EURO_FORMAT
  }

  if (data.clientTotals.length > 0) {
    const lastDataRow = firstDataRow + data.clientTotals.length - 1
    const totalRow = sheet.addRow([
      'Totaal',
      data.clientTotals.reduce((s, c) => s + c.leadCount, 0),
      data.clientTotals.reduce((s, c) => s + c.rejectedCount, 0),
      '',
      '',
      '',
      euros(data.clientTotals.reduce((s, c) => s + c.revenueCents, 0)),
      euros(data.clientTotals.reduce((s, c) => s + c.estimatedCostCents, 0)),
      euros(data.clientTotals.reduce((s, c) => s + c.estimatedProfitCents, 0)),
      euros(data.clientTotals.reduce((s, c) => s + c.estimatedSalaryCents, 0)),
      euros(data.clientTotals.reduce((s, c) => s + c.estimatedProfitAfterSalaryCents, 0)),
    ])
    totalRow.font = { bold: true }
    totalRow.border = { top: { style: 'thin', color: { argb: 'FF9CA3AF' } } }
    for (let i = 7; i <= 11; i++) totalRow.getCell(i).numFmt = EURO_FORMAT

    sheet.autoFilter = {
      from: { row: headerRow.number, column: 1 },
      to: { row: lastDataRow, column: headers.length },
    }
  }

  // Kolom 3 draagt zowel korte toelichtingen als de brede getalkolommen; smal
  // houden zou de toelichting afkappen, breed houden de tabel scheeftrekken.
  sheet.getColumn(3).width = 22
  for (let i = 4; i <= headers.length; i++) {
    sheet.getColumn(i).width = i >= 7 ? 22 : 14
  }
}

export function buildExportWorkbook(
  data: ExportData,
  sections: ExportSection[],
  generatedAt: string
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Nextwave dashboard'
  workbook.created = new Date()

  addExplanationSheet(workbook, data, generatedAt)

  const wants = (section: ExportSection): boolean => sections.includes(section)

  if (wants('samenvatting')) {
    addSummarySheet(workbook, data)
  }

  if (wants('perDag')) {
    addSheet(
      workbook,
      'Per dag',
      [
        { header: 'Datum', width: 13, value: (r) => r.date },
        { header: 'Maand', width: 10, value: (r) => monthOf(r.date) },
        { header: 'Weekdag', width: 12, value: (r) => weekdayOf(r.date) },
        { header: 'Leads', width: 10, kind: 'number', value: (r) => r.leadCount },
        { header: 'Omzet', width: 16, kind: 'euro', value: (r) => euros(r.revenueCents) },
        { header: 'Kosten geboekt op deze dag', width: 26, kind: 'euro', value: (r) => euros(r.bookedExpensesCents) },
        { header: 'Resultaat', width: 16, kind: 'euro', value: (r) => euros(r.resultCents) },
      ],
      data.days,
      { totalsRow: true }
    )
  }

  if (wants('klantPerDag')) {
    addSheet(
      workbook,
      'Klant per dag',
      [
        { header: 'Datum', width: 13, value: (r) => r.date },
        { header: 'Maand', width: 10, value: (r) => monthOf(r.date) },
        { header: 'Klant', width: 26, value: (r) => r.companyName },
        { header: 'Leads', width: 10, kind: 'number', value: (r) => r.leadCount },
        { header: 'Omzet', width: 16, kind: 'euro', value: (r) => euros(r.revenueCents) },
        {
          header: 'Toegerekende kosten (schatting)',
          width: 28,
          kind: 'euro',
          value: (r) => euros(r.estimatedCostCents),
        },
        { header: 'Winst (schatting)', width: 20, kind: 'euro', value: (r) => euros(r.estimatedProfitCents) },
        {
          header: 'Toegerekend salaris (schatting)',
          width: 28,
          kind: 'euro',
          value: (r) => euros(r.estimatedSalaryCents),
        },
        {
          header: 'Winst na salaris (schatting)',
          width: 26,
          kind: 'euro',
          value: (r) => euros(r.estimatedProfitAfterSalaryCents),
        },
      ],
      data.clientDays,
      { totalsRow: true }
    )
  }

  if (wants('categorie')) {
    addSheet(
      workbook,
      'Categorie en campagne',
      [
        { header: 'Datum', width: 13, value: (r) => r.date },
        { header: 'Maand', width: 10, value: (r) => monthOf(r.date) },
        { header: 'Klant', width: 26, value: (r) => r.companyName },
        { header: 'Categorie', width: 34, value: (r) => r.categoryName },
        { header: 'Campagne', width: 30, value: (r) => r.campaignName },
        { header: 'Aantal leads', width: 14, kind: 'number', value: (r) => r.leadCount },
        {
          header: 'Prijs per lead',
          width: 16,
          kind: 'euro',
          excludeFromTotal: true,
          value: (r) => euros(r.unitPriceCents),
        },
        { header: 'Omzet', width: 16, kind: 'euro', value: (r) => euros(r.revenueCents) },
      ],
      data.categories,
      { totalsRow: true }
    )
  }

  if (wants('uitgaven')) {
    addSheet(
      workbook,
      'Uitgaven',
      [
        { header: 'Datum', width: 13, value: (r) => r.date },
        { header: 'Maand', width: 10, value: (r) => monthOf(r.date) },
        { header: 'Leverancier', width: 30, value: (r) => r.supplier },
        { header: 'Omschrijving', width: 46, value: (r) => r.description },
        { header: 'Rubriek', width: 40, value: (r) => r.category },
        { header: 'Bedrag (excl. btw)', width: 20, kind: 'euro', value: (r) => euros(r.amountCents) },
      ],
      data.expenses,
      { totalsRow: true }
    )
  }

  if (wants('leads')) {
    addSheet(
      workbook,
      'Leads',
      [
        { header: 'Datum', width: 13, value: (r) => r.entryDate },
        { header: 'Maand', width: 10, value: (r) => monthOf(r.entryDate) },
        { header: 'Klant', width: 26, value: (r) => r.companyName },
        { header: 'Mailadres', width: 38, value: (r) => r.leadEmail },
        { header: 'Campagne', width: 30, value: (r) => r.campaignName },
        { header: 'Categorie', width: 34, value: (r) => r.categoryName },
        {
          header: 'Prijs categorie',
          width: 16,
          kind: 'euro',
          excludeFromTotal: true,
          value: (r) => euros(r.unitPriceCents),
        },
        { header: '50% korting', width: 13, value: (r) => (r.isHalfPrice ? 'ja' : 'nee') },
        { header: 'Meegeteld in omzet', width: 20, kind: 'euro', value: (r) => euros(r.revenueCents) },
        { header: 'Afgerond', width: 12, value: (r) => (r.isChecked ? 'ja' : 'nee') },
        { header: 'Afgekeurd', width: 12, value: (r) => (r.isRejected ? 'ja' : 'nee') },
        { header: 'Notitie', width: 40, value: (r) => r.note },
        { header: 'Ingevoerd op', width: 22, value: (r) => (r.createdAt ? r.createdAt.slice(0, 19).replace('T', ' ') : '') },
      ],
      data.leads,
      { totalsRow: true }
    )
  }

  return workbook
}

/**
 * Bestandsnaam die je over een half jaar nog snapt: wie, welke periode, wanneer
 * gemaakt. Zonder tijdstempel zou een tweede download van dezelfde periode als
 * "(1)" in de downloadmap belanden.
 */
export function buildExportFilename(data: ExportData, generatedAtStamp: string): string {
  const who =
    data.selectedClientNames.length === 0
      ? 'alle klanten'
      : data.selectedClientNames.length === 1
        ? data.selectedClientNames[0]
        : `${data.selectedClientNames.length} klanten`

  const safeWho = who
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return `Nextwave export - ${safeWho} - ${data.from} tm ${data.to} (${generatedAtStamp}).xlsx`
}
