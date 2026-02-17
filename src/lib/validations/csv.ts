import { z } from 'zod'

export const CsvUploadMetaSchema = z.object({
  clientId: z.string().uuid('Ongeldig client ID'),
  filename: z.string().min(1, 'Bestandsnaam is verplicht'),
  headers: z.array(z.string()).min(1, 'Minimaal één kolom vereist'),
  totalRows: z.number().int('Moet een geheel getal zijn').positive('Moet positief zijn'),
  emailColumn: z.string().optional(),
  contactDate: z.string().optional(),
  columnMappings: z.record(z.string(), z.string()).optional(),
})

export const CsvBatchInsertSchema = z.object({
  uploadId: z.string().uuid('Ongeldig upload ID'),
  startIndex: z.number().int('Moet een geheel getal zijn').min(0, 'Index mag niet negatief zijn'),
  rows: z
    .array(z.record(z.string(), z.string()))
    .min(1, 'Minimaal één rij vereist')
    .max(500, 'Maximaal 500 rijen per batch'),
})

export type CsvUploadMeta = z.infer<typeof CsvUploadMetaSchema>
export type CsvBatchInsert = z.infer<typeof CsvBatchInsertSchema>
