// Client-side CSV-download. Gebruikt puntkomma als scheidingsteken en een
// UTF-8 BOM, zodat Excel (NL) de kolommen en accenten correct toont.

function escapeCell(value: string | number): string {
  const s = String(value)
  if (/[";\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function downloadCsv(
  filename: string,
  header: string[],
  rows: Array<Array<string | number>>
): void {
  const lines = [header, ...rows].map((row) => row.map(escapeCell).join(';'))
  const content = '﻿' + lines.join('\r\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Centen → Dutch decimal string voor CSV, bv. 1250 → "12,50". */
export function centsToCsvAmount(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}
