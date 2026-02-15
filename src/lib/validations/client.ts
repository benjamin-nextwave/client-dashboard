import { z } from 'zod'

export const clientFormSchema = z.object({
  companyName: z.string().min(1, 'Bedrijfsnaam is verplicht').max(100),
  email: z.string().email('Ongeldig e-mailadres'),
  password: z.string().min(8, 'Wachtwoord moet minimaal 8 tekens bevatten'),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Ongeldige kleurcode'),
  isRecruitment: z.coerce.boolean().default(false),
  meetingUrl: z.string().url('Ongeldige URL').optional().or(z.literal('')),
})

export const clientEditSchema = clientFormSchema
  .omit({ password: true })
  .extend({
    password: z
      .string()
      .min(8, 'Wachtwoord moet minimaal 8 tekens bevatten')
      .optional()
      .or(z.literal('')),
  })

export type ClientFormValues = z.infer<typeof clientFormSchema>
export type ClientEditValues = z.infer<typeof clientEditSchema>
