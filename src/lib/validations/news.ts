import { z } from 'zod'

const TITLE_MAX = 200
const BODY_MAX = 10_000

const titleField = z.string().max(TITLE_MAX, `Titel mag maximaal ${TITLE_MAX} tekens bevatten`)
const bodyField = z.string().max(BODY_MAX, `Tekst mag maximaal ${BODY_MAX} tekens bevatten`)

export const newsDraftSchema = z.object({
  title_nl: titleField,
  title_en: titleField,
  title_hi: titleField,
  body_nl: bodyField,
  body_en: bodyField,
  body_hi: bodyField,
  image_path: z.string().optional().or(z.literal('')),
})

export const newsPublishSchema = newsDraftSchema.refine(
  (data) =>
    data.title_nl.trim().length > 0 &&
    data.title_en.trim().length > 0 &&
    data.title_hi.trim().length > 0 &&
    data.body_nl.trim().length > 0 &&
    data.body_en.trim().length > 0 &&
    data.body_hi.trim().length > 0,
  {
    message:
      'Publiceren is pas mogelijk als alle drie de taalvarianten (NL, EN, Hindi) een titel en tekst hebben.',
    path: ['_publishGate'],
  }
)

export type NewsDraftValues = z.infer<typeof newsDraftSchema>
export type NewsPublishValues = z.infer<typeof newsPublishSchema>
