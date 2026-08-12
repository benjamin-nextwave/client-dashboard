// Bloktypes voor KIX-pagina's. Deze vorm wordt als JSON opgeslagen in
// client_kix_pages.blocks, dus elke wijziging hier moet oude opgeslagen
// pagina's blijven kunnen lezen. Daarom heeft `normalizeBlocks` hieronder een
// vangnet voor onbekende of half-gevulde blokken: liever een leeg blok tonen
// dan de hele pagina laten crashen.

export type KixListStyle = 'bullet' | 'number' | 'check'

export type KixCalloutTone = 'info' | 'warn' | 'error' | 'success' | 'note'

export interface KixListItem {
  id: string
  text: string
  checked: boolean
}

export interface KixFlowStep {
  id: string
  text: string
}

/** Eén getekende vorm op het tekenvlak. Punten zijn percentages (0–100). */
export interface KixStroke {
  id: string
  tool: 'pen' | 'line' | 'arrow' | 'rect' | 'ellipse'
  color: string
  width: number
  points: Array<{ x: number; y: number }>
}

interface BlockBase {
  id: string
}

export type KixBlock =
  | (BlockBase & { type: 'paragraph'; text: string })
  | (BlockBase & { type: 'heading'; text: string; level: 1 | 2 | 3 })
  | (BlockBase & { type: 'quote'; text: string })
  | (BlockBase & { type: 'callout'; text: string; tone: KixCalloutTone; emoji: string })
  | (BlockBase & { type: 'code'; text: string; language: string })
  | (BlockBase & { type: 'divider' })
  | (BlockBase & { type: 'list'; style: KixListStyle; items: KixListItem[] })
  | (BlockBase & { type: 'table'; columns: string[]; rows: string[][] })
  | (BlockBase & { type: 'toggle'; title: string; text: string; open: boolean })
  | (BlockBase & { type: 'columns'; left: string; right: string })
  | (BlockBase & { type: 'drawing'; height: number; strokes: KixStroke[] })
  | (BlockBase & { type: 'image'; url: string; caption: string })
  | (BlockBase & { type: 'progress'; label: string; value: number })
  | (BlockBase & { type: 'flow'; steps: KixFlowStep[] })
  | (BlockBase & { type: 'bookmark'; url: string; title: string; description: string })

export type KixBlockType = KixBlock['type']

export interface KixPageSummary {
  id: string
  clientId: string
  title: string
  icon: string
  createdAt: string
  updatedAt: string
  blockCount: number
}

export interface KixPage extends KixPageSummary {
  blocks: KixBlock[]
}

// ---------------------------------------------------------------------------
// Nieuwe blokken
// ---------------------------------------------------------------------------

/**
 * Id voor een blok of lijstitem. Bewust geen crypto.randomUUID(): dat ontbreekt
 * in oudere browsers zonder https-context, en deze ids hoeven alleen binnen één
 * pagina uniek te zijn.
 */
export function kixId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function createBlock(type: KixBlockType): KixBlock {
  const id = kixId()
  switch (type) {
    case 'paragraph':
      return { id, type, text: '' }
    case 'heading':
      return { id, type, text: '', level: 2 }
    case 'quote':
      return { id, type, text: '' }
    case 'callout':
      return { id, type, text: '', tone: 'info', emoji: '💡' }
    case 'code':
      return { id, type, text: '', language: '' }
    case 'divider':
      return { id, type }
    case 'list':
      return { id, type, style: 'bullet', items: [{ id: kixId(), text: '', checked: false }] }
    case 'table':
      return {
        id,
        type,
        columns: ['Kolom 1', 'Kolom 2'],
        rows: [
          ['', ''],
          ['', ''],
        ],
      }
    case 'toggle':
      return { id, type, title: '', text: '', open: true }
    case 'columns':
      return { id, type, left: '', right: '' }
    case 'drawing':
      return { id, type, height: 320, strokes: [] }
    case 'image':
      return { id, type, url: '', caption: '' }
    case 'progress':
      return { id, type, label: '', value: 0 }
    case 'flow':
      return {
        id,
        type,
        steps: [
          { id: kixId(), text: '' },
          { id: kixId(), text: '' },
        ],
      }
    case 'bookmark':
      return { id, type, url: '', title: '', description: '' }
  }
}

/** Kopie van een blok met verse ids, zodat dupliceren geen ids deelt. */
export function duplicateBlock(block: KixBlock): KixBlock {
  const copy = JSON.parse(JSON.stringify(block)) as KixBlock
  copy.id = kixId()
  if (copy.type === 'list') copy.items = copy.items.map((i) => ({ ...i, id: kixId() }))
  if (copy.type === 'flow') copy.steps = copy.steps.map((s) => ({ ...s, id: kixId() }))
  if (copy.type === 'drawing') copy.strokes = copy.strokes.map((s) => ({ ...s, id: kixId() }))
  return copy
}

// ---------------------------------------------------------------------------
// Inlezen van opgeslagen JSON
// ---------------------------------------------------------------------------

const BLOCK_TYPES: readonly KixBlockType[] = [
  'paragraph', 'heading', 'quote', 'callout', 'code', 'divider', 'list',
  'table', 'toggle', 'columns', 'drawing', 'image', 'progress', 'flow', 'bookmark',
]

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/**
 * Maakt van willekeurige opgeslagen JSON een geldige bloklijst. Alles wat niet
 * klopt wordt stil vervangen door een leeg equivalent — een pagina openen mag
 * nooit stukgaan op één raar blok.
 */
export function normalizeBlocks(raw: unknown): KixBlock[] {
  return arr(raw)
    .map((entry): KixBlock | null => {
      if (typeof entry !== 'object' || entry === null) return null
      const b = entry as Record<string, unknown>
      const type = str(b.type) as KixBlockType
      if (!BLOCK_TYPES.includes(type)) return null
      const id = str(b.id) || kixId()

      switch (type) {
        case 'paragraph':
        case 'quote':
          return { id, type, text: str(b.text) }
        case 'heading': {
          const level = num(b.level, 2)
          return { id, type, text: str(b.text), level: level === 1 || level === 3 ? level : 2 }
        }
        case 'callout': {
          const tone = str(b.tone, 'info') as KixCalloutTone
          return {
            id,
            type,
            text: str(b.text),
            tone: (['info', 'warn', 'error', 'success', 'note'] as string[]).includes(tone) ? tone : 'info',
            emoji: str(b.emoji, '💡'),
          }
        }
        case 'code':
          return { id, type, text: str(b.text), language: str(b.language) }
        case 'divider':
          return { id, type }
        case 'list': {
          const style = str(b.style, 'bullet') as KixListStyle
          const items = arr(b.items).map((i) => {
            const item = (typeof i === 'object' && i !== null ? i : {}) as Record<string, unknown>
            return { id: str(item.id) || kixId(), text: str(item.text), checked: bool(item.checked) }
          })
          return {
            id,
            type,
            style: (['bullet', 'number', 'check'] as string[]).includes(style) ? style : 'bullet',
            items: items.length > 0 ? items : [{ id: kixId(), text: '', checked: false }],
          }
        }
        case 'table': {
          const columns = arr(b.columns).map((c) => str(c))
          const safeColumns = columns.length > 0 ? columns : ['Kolom 1']
          const rows = arr(b.rows).map((r) => {
            const cells = arr(r).map((c) => str(c))
            // Rijen korter of langer dan de kop rechttrekken.
            return Array.from({ length: safeColumns.length }, (_, i) => cells[i] ?? '')
          })
          return { id, type, columns: safeColumns, rows }
        }
        case 'toggle':
          return { id, type, title: str(b.title), text: str(b.text), open: bool(b.open, true) }
        case 'columns':
          return { id, type, left: str(b.left), right: str(b.right) }
        case 'drawing': {
          const strokes = arr(b.strokes)
            .map((s): KixStroke | null => {
              const stroke = (typeof s === 'object' && s !== null ? s : {}) as Record<string, unknown>
              const tool = str(stroke.tool, 'pen') as KixStroke['tool']
              if (!(['pen', 'line', 'arrow', 'rect', 'ellipse'] as string[]).includes(tool)) return null
              const points = arr(stroke.points)
                .map((p) => {
                  const pt = (typeof p === 'object' && p !== null ? p : {}) as Record<string, unknown>
                  return { x: num(pt.x, 0), y: num(pt.y, 0) }
                })
              if (points.length === 0) return null
              return {
                id: str(stroke.id) || kixId(),
                tool,
                color: str(stroke.color, '#1f2937'),
                width: num(stroke.width, 3),
                points,
              }
            })
            .filter((s): s is KixStroke => s !== null)
          return { id, type, height: num(b.height, 320), strokes }
        }
        case 'image':
          return { id, type, url: str(b.url), caption: str(b.caption) }
        case 'progress':
          return { id, type, label: str(b.label), value: Math.min(100, Math.max(0, num(b.value, 0))) }
        case 'flow': {
          const steps = arr(b.steps).map((s) => {
            const step = (typeof s === 'object' && s !== null ? s : {}) as Record<string, unknown>
            return { id: str(step.id) || kixId(), text: str(step.text) }
          })
          return { id, type, steps: steps.length > 0 ? steps : [{ id: kixId(), text: '' }] }
        }
        case 'bookmark':
          return { id, type, url: str(b.url), title: str(b.title), description: str(b.description) }
      }
    })
    .filter((b): b is KixBlock => b !== null)
}
