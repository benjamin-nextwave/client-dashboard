import { z } from 'zod'

export const AddDncEmailSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
})

export const AddDncDomainSchema = z.object({
  domain: z
    .string()
    .min(3, 'Domein is te kort')
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Ongeldig domein'),
})

export const DncBulkImportSchema = z.object({
  emails: z
    .array(z.string().email('Ongeldig e-mailadres'))
    .min(1, 'Minimaal één adres vereist')
    .max(10000, 'Maximaal 10.000 adressen per import'),
})

/**
 * Het gecombineerde invoerveld levert adressen en domeinen in één keer aan.
 * Beide lijsten mogen leeg zijn; de actie weigert pas als ze allebei leeg zijn.
 */
export const AddDncEntriesSchema = z.object({
  emails: z.array(z.string().email('Ongeldig e-mailadres')).max(10000, 'Maximaal 10.000 adressen per keer'),
  domains: z
    .array(z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Ongeldig domein'))
    .max(10000, 'Maximaal 10.000 domeinen per keer'),
})

export type AddDncEmail = z.infer<typeof AddDncEmailSchema>
export type AddDncDomain = z.infer<typeof AddDncDomainSchema>
export type DncBulkImport = z.infer<typeof DncBulkImportSchema>
