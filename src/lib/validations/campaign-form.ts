import { z } from 'zod'

export const COMPANY_SIZES = [
  'self_employed',
  '2-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1001-5000',
] as const

export const COMPANY_SIZE_LABELS: Record<(typeof COMPANY_SIZES)[number], string> = {
  self_employed: 'Zelfstandig',
  '2-10': '2 – 10',
  '11-50': '11 – 50',
  '51-200': '51 – 200',
  '201-500': '201 – 500',
  '501-1000': '501 – 1.000',
  '1001-5000': '1.001 – 5.000',
}

export const GEO_RADII = [0, 25, 50, 100] as const
export type GeoRadius = (typeof GEO_RADII)[number]

export const GEO_RADIUS_LABELS: Record<GeoRadius, string> = {
  0: 'Alleen deze locatie',
  25: '+ 25 km',
  50: '+ 50 km',
  100: '+ 100 km',
}

export const locationEntrySchema = z.object({
  location: z.string().trim().min(1, 'Locatie is verplicht'),
  radiusKm: z.union([z.literal(0), z.literal(25), z.literal(50), z.literal(100)]),
})

export type LocationEntry = z.infer<typeof locationEntrySchema>

// Every field is nullable — null means the user skipped the question.
export const campaignFormSchema = z
  .object({
    companyName: z.string().trim().min(1, 'Verplicht of sla over').nullable(),
    senderName: z.string().trim().min(1, 'Verplicht of sla over').nullable(),
    sectors: z
      .array(z.string().trim().min(1))
      .min(1, 'Geef minimaal één sector of sla over')
      .nullable(),
    locations: z.array(locationEntrySchema).min(1, 'Geef minimaal één locatie of sla over').nullable(),
    companySizes: z
      .array(z.enum(COMPANY_SIZES))
      .min(1, 'Kies minimaal één bedrijfsgrootte of sla over')
      .nullable(),
    riskReversal: z.string().trim().min(1, 'Verplicht of sla over').nullable(),
    cta: z.string().trim().min(1, 'Verplicht of sla over').nullable(),
    offer: z.string().trim().min(1, 'Verplicht of sla over').nullable(),
    aboutCompany: z.string().trim().min(1, 'Verplicht of sla over').nullable(),
    examples: z.string().trim().min(1, 'Verplicht of sla over').nullable(),
    comments: z.string().trim().min(1, 'Verplicht of sla over').nullable(),
    positiveReplyEmail: z
      .string()
      .trim()
      .email('Ongeldig e-mailadres')
      .nullable(),
    domainsChoice: z.enum(['user', 'nextwave']).nullable(),
    domainsText: z.string().trim().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.domainsChoice === 'user' && (!val.domainsText || val.domainsText.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['domainsText'],
        message: 'Geef domeinsuggesties op, kies NextWave, of sla over',
      })
    }
  })

export type CampaignFormValues = z.infer<typeof campaignFormSchema>

// Set of field names that support skipping — used by the server action.
export const SKIPPABLE_FIELDS = [
  'companyName',
  'senderName',
  'sectors',
  'locations',
  'companySizes',
  'riskReversal',
  'cta',
  'offer',
  'aboutCompany',
  'examples',
  'comments',
  'positiveReplyEmail',
  'domains',
] as const

export type SkippableField = (typeof SKIPPABLE_FIELDS)[number]
