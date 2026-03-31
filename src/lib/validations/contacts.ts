import { z } from 'zod'

export const ContactColumnSchema = z.object({
  clientId: z.string().uuid('Ongeldig client ID'),
  name: z.string().min(1, 'Kolomnaam is verplicht').max(100, 'Kolomnaam mag maximaal 100 tekens zijn'),
})

export const ContactImportSchema = z.object({
  clientId: z.string().uuid('Ongeldig client ID'),
  /** Mapping: CSV header → { action: 'existing', columnId } | { action: 'new', name } | { action: 'skip' } */
  columnMapping: z.array(z.object({
    csvHeader: z.string(),
    action: z.enum(['existing', 'new', 'skip']),
    columnId: z.string().uuid().optional(),
    newName: z.string().optional(),
  })),
})

export const ContactBatchInsertSchema = z.object({
  clientId: z.string().uuid('Ongeldig client ID'),
  /** Array of rows, each row is { columnId: value } */
  rows: z
    .array(z.record(z.string(), z.string()))
    .min(1, 'Minimaal één rij vereist')
    .max(500, 'Maximaal 500 rijen per batch'),
})

export type ContactColumn = z.infer<typeof ContactColumnSchema>
export type ContactImport = z.infer<typeof ContactImportSchema>
export type ContactBatchInsert = z.infer<typeof ContactBatchInsertSchema>
