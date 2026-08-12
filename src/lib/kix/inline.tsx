import React from 'react'

// Lichte opmaak binnen één tekstblok. Bewust géén HTML-parser en géén
// dangerouslySetInnerHTML: de tekst komt uit een invoerveld en wordt hier tot
// React-elementen opgebouwd, zodat er nooit markup uit de tekst kan ontsnappen.
//
//   **vet**   *cursief*   `code`   ~~doorgestreept~~   ==markering==
//   [tekst](https://…)    kale https://… links

const PATTERN = new RegExp(
  [
    '\\*\\*(.+?)\\*\\*', // 1: vet
    '\\*(.+?)\\*', // 2: cursief
    '`(.+?)`', // 3: code
    '~~(.+?)~~', // 4: doorgestreept
    '==(.+?)==', // 5: markering
    '\\[([^\\]]+)\\]\\(([^)\\s]+)\\)', // 6: linktekst, 7: url
    '(https?:\\/\\/[^\\s<>"\']+)', // 8: kale url
  ].join('|'),
  'g'
)

/** Alleen protocollen die veilig in een href mogen staan. */
function safeHref(url: string): string | null {
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^mailto:/i.test(trimmed)) return trimmed
  return null
}

function link(href: string, label: string, key: string): React.ReactNode {
  const safe = safeHref(href)
  if (!safe) return <span key={key}>{label}</span>
  return (
    <a
      key={key}
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-800"
      onClick={(e) => e.stopPropagation()}
    >
      {label}
    </a>
  )
}

/** Zet één regel tekst om naar React-nodes met opmaak. */
function renderLine(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let n = 0

  PATTERN.lastIndex = 0
  while ((match = PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    const key = `${keyPrefix}-${n++}`
    const [, bold, italic, code, strike, mark, linkLabel, linkUrl, bareUrl] = match

    if (bold !== undefined) {
      nodes.push(<strong key={key} className="font-semibold text-gray-900">{renderLine(bold, key)}</strong>)
    } else if (italic !== undefined) {
      nodes.push(<em key={key}>{renderLine(italic, key)}</em>)
    } else if (code !== undefined) {
      nodes.push(
        <code key={key} className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em] text-rose-700">
          {code}
        </code>
      )
    } else if (strike !== undefined) {
      nodes.push(<s key={key} className="text-gray-400">{renderLine(strike, key)}</s>)
    } else if (mark !== undefined) {
      nodes.push(<mark key={key} className="rounded bg-amber-100 px-0.5 text-gray-900">{renderLine(mark, key)}</mark>)
    } else if (linkLabel !== undefined && linkUrl !== undefined) {
      nodes.push(link(linkUrl, linkLabel, key))
    } else if (bareUrl !== undefined) {
      nodes.push(link(bareUrl, bareUrl.replace(/^https?:\/\//, ''), key))
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

/**
 * Rendert tekst met opmaak, waarbij regeleinden behouden blijven. Een lege
 * string levert null op, zodat de aanroeper een plaatshouder kan tonen.
 */
export function renderInline(text: string): React.ReactNode {
  if (text.trim().length === 0) return null
  const lines = text.split('\n')
  return lines.map((line, i) => (
    <React.Fragment key={i}>
      {i > 0 && <br />}
      {renderLine(line, `l${i}`)}
    </React.Fragment>
  ))
}
