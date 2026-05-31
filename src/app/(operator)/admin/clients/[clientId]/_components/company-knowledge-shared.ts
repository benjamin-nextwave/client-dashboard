export const COMPANY_KNOWLEDGE_KEYS = [
  'essentie',
  'diensten',
  'icp',
  'grootte',
  'kernwaarden',
  'opgericht',
  'uniek',
] as const

export type CompanyKnowledgeKey = (typeof COMPANY_KNOWLEDGE_KEYS)[number]
export type CompanyKnowledgeChecklist = Record<CompanyKnowledgeKey, boolean>

export function isCompanyKnowledgeKey(value: string): value is CompanyKnowledgeKey {
  return (COMPANY_KNOWLEDGE_KEYS as readonly string[]).includes(value)
}

export function emptyCompanyKnowledgeChecklist(): CompanyKnowledgeChecklist {
  return Object.fromEntries(
    COMPANY_KNOWLEDGE_KEYS.map((k) => [k, false])
  ) as CompanyKnowledgeChecklist
}

export function normalizeCompanyKnowledgeChecklist(input: unknown): CompanyKnowledgeChecklist {
  const base = emptyCompanyKnowledgeChecklist()
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (isCompanyKnowledgeKey(k) && typeof v === 'boolean') {
        base[k] = v
      }
    }
  }
  return base
}
