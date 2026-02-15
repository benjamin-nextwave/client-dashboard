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

export type AddDncEmail = z.infer<typeof AddDncEmailSchema>
export type AddDncDomain = z.infer<typeof AddDncDomainSchema>
export type DncBulkImport = z.infer<typeof DncBulkImportSchema>
