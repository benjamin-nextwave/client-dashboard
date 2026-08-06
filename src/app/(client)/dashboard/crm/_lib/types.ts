import type { LeadLabel, LeadSource } from '@/lib/data/campaign-leads'

export type CrmStageId =
  | 'nieuw'
  | 'contact'
  | 'gekwalificeerd'
  | 'voorstel'
  | 'gewonnen'
  | 'verloren'

export type CrmPriority = 'laag' | 'normaal' | 'hoog'

export type CrmActivityType =
  | 'notitie'
  | 'telefoon'
  | 'email'
  | 'meeting'
  | 'taak'
  | 'fase'

export type CrmLabel = {
  id: string
  name: string
  color: string
}

export type CrmActivity = {
  id: string
  recordId: string
  type: CrmActivityType
  body: string
  occurredAt: string
  createdAt: string
}

/**
 * De bewerkbare CRM-laag bovenop een bron-lead. Bestaat pas in de DB zodra de
 * klant iets wijzigt; tot die tijd is `record` op een CrmEntry null en gelden
 * de defaults uit constants.ts.
 */
export type CrmRecord = {
  id: string
  leadKey: string
  stage: CrmStageId
  priority: CrmPriority
  ownerName: string | null
  contactName: string | null
  companyName: string | null
  jobTitle: string | null
  phone: string | null
  website: string | null
  linkedinUrl: string | null
  dealValue: number | null
  expectedCloseDate: string | null
  nextAction: string | null
  nextActionAt: string | null
  notes: string | null
  labelIds: string[]
  activities: CrmActivity[]
  createdAt: string
  updatedAt: string
}

/** Velden die de klant via het detailpaneel mag aanpassen. */
export type CrmRecordPatch = Partial<
  Pick<
    CrmRecord,
    | 'stage'
    | 'priority'
    | 'ownerName'
    | 'contactName'
    | 'companyName'
    | 'jobTitle'
    | 'phone'
    | 'website'
    | 'linkedinUrl'
    | 'dealValue'
    | 'expectedCloseDate'
    | 'nextAction'
    | 'nextActionAt'
    | 'notes'
  >
>

/**
 * Eén rij in het CRM: de read-only bron-lead (exact dezelfde lead als op het
 * leads- en inbox-tabblad) plus de bewerkbare CRM-laag.
 */
export type CrmEntry = {
  /** Lowercase e-mailadres — koppelsleutel naar crm_records.lead_key. */
  key: string
  email: string
  leadName: string | null
  leadCompany: string | null
  leadLabel: LeadLabel
  source: LeadSource
  receivedAt: string
  sentSubject: string | null
  sentBody: string | null
  replySubject: string | null
  replyBody: string | null
  hasReferral: boolean
  record: CrmRecord | null
}

export type ActionResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; error: string }
