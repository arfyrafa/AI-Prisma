import React, { useMemo } from 'react'

interface MarkdownViewerProps {
  content: string
  className?: string
}

interface TableBlock {
  type: 'table'
  headers: string[]
  rows: string[][]
}

interface CodeBlock {
  type: 'code'
  language?: string
  code: string
}

interface HeadingBlock {
  type: 'heading'
  level: number
  text: string
}

interface ListBlock {
  type: 'list'
  ordered: boolean
  items: string[]
}

interface BlockquoteBlock {
  type: 'blockquote'
  text: string
}

interface HrBlock {
  type: 'hr'
}

interface ParagraphBlock {
  type: 'paragraph'
  text: string
}

type ContentBlock =
  | TableBlock
  | CodeBlock
  | HeadingBlock
  | ListBlock
  | BlockquoteBlock
  | HrBlock
  | ParagraphBlock

function renderInline(text: string): React.ReactNode[] {
  // Regex to match code `code`, bold **text**, and italic *text*
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)

  return tokens.map((token, idx) => {
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={idx}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-sky-700 border border-slate-200/70"
        >
          {token.slice(1, -1)}
        </code>
      )
    }
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={idx} className="font-bold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      )
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return (
        <em key={idx} className="italic text-slate-800">
          {token.slice(1, -1)}
        </em>
      )
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>
  })
}

function parseMarkdownBlocks(rawText: string): ContentBlock[] {
  const lines = rawText.split(/\r?\n/)
  const blocks: ContentBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i++
      continue
    }

    // 1. Code Block (```)
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      if (i < lines.length) i++ // skip closing ```
      blocks.push({
        type: 'code',
        language: language || undefined,
        code: codeLines.join('\n'),
      })
      continue
    }

    // 2. Horizontal Rule (---, ***, ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    // 3. Headings (# H1, ## H2, ### H3)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2],
      })
      i++
      continue
    }

    // 4. Blockquote (> ...)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [trimmed.replace(/^>\s?/, '')]
      i++
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      blocks.push({
        type: 'blockquote',
        text: quoteLines.join(' '),
      })
      continue
    }

    // 5. Table (| col1 | col2 |)
    // Check if current line contains | and next line is separator | --- |
    if (
      trimmed.startsWith('|') &&
      trimmed.endsWith('|') &&
      i + 1 < lines.length &&
      lines[i + 1].trim().startsWith('|') &&
      lines[i + 1].includes('---')
    ) {
      const parseRow = (r: string) => {
        // Strip leading and trailing pipe
        const cleaned = r.trim().replace(/^\|/, '').replace(/\|$/, '')
        return cleaned.split('|').map((c) => c.trim())
      }

      const headers = parseRow(trimmed)
      i += 2 // skip header and separator row

      const rows: string[][] = []
      while (i < lines.length) {
        const tableLine = lines[i].trim()
        if (!tableLine.startsWith('|') || !tableLine.endsWith('|')) {
          break
        }
        rows.push(parseRow(tableLine))
        i++
      }

      blocks.push({
        type: 'table',
        headers,
        rows,
      })
      continue
    }

    // 6. Unordered List (- item or * item)
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push({
        type: 'list',
        ordered: false,
        items,
      })
      continue
    }

    // 7. Ordered List (1. item)
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push({
        type: 'list',
        ordered: true,
        items,
      })
      continue
    }

    // 8. Regular Paragraph (accumulate multi-line paragraphs)
    const paraLines: string[] = [trimmed]
    i++
    while (i < lines.length) {
      const nextLine = lines[i]
      const nextTrimmed = nextLine.trim()
      if (
        !nextTrimmed ||
        nextTrimmed.startsWith('```') ||
        nextTrimmed.startsWith('#') ||
        nextTrimmed.startsWith('>') ||
        (/^[-*]\s+/.test(nextTrimmed)) ||
        (/^\d+\.\s+/.test(nextTrimmed)) ||
        (nextTrimmed.startsWith('|') && nextTrimmed.endsWith('|')) ||
        /^(\-{3,}|\*{3,}|_{3,})$/.test(nextTrimmed)
      ) {
        break
      }
      paraLines.push(nextTrimmed)
      i++
    }

    blocks.push({
      type: 'paragraph',
      text: paraLines.join('\n'),
    })
  }

  return blocks
}

export function MarkdownViewer({ content, className = '' }: MarkdownViewerProps) {
  const blocks = useMemo(() => parseMarkdownBlocks(content || ''), [content])

  if (!content || !content.trim()) {
    return (
      <p className="text-xs text-slate-400 italic">Dokumen belum memiliki konten isi.</p>
    )
  }

  return (
    <div className={`space-y-3.5 text-xs sm:text-sm text-slate-800 ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            if (block.level === 1) {
              return (
                <div
                  key={idx}
                  className="mt-6 mb-3 border-b border-slate-200 pb-2 first:mt-0"
                >
                  <h2 className="flex items-center gap-2 text-base sm:text-lg font-black text-slate-900">
                    <span className="h-4 w-1.5 rounded-full bg-sky-600" />
                    {renderInline(block.text)}
                  </h2>
                </div>
              )
            }
            if (block.level === 2) {
              return (
                <h3
                  key={idx}
                  className="mt-5 mb-2 text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2"
                >
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  {renderInline(block.text)}
                </h3>
              )
            }
            return (
              <h4
                key={idx}
                className="mt-4 mb-1 text-xs sm:text-sm font-bold text-slate-800"
              >
                {renderInline(block.text)}
              </h4>
            )
          }

          case 'table': {
            return (
              <div
                key={idx}
                className="my-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
              >
                <div className="overflow-x-auto max-w-full">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/90 text-slate-700">
                        {block.headers.map((head, hIdx) => (
                          <th
                            key={hIdx}
                            className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border-r border-slate-200/60 last:border-r-0"
                          >
                            {renderInline(head)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11.5px] text-slate-700">
                      {block.rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className="hover:bg-sky-50/50 even:bg-slate-50/40 transition-colors"
                        >
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className="px-3.5 py-2 whitespace-nowrap border-r border-slate-100/80 last:border-r-0 max-w-[320px] truncate"
                              title={cell}
                            >
                              {renderInline(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-3 py-1 text-[10px] text-slate-400">
                  <span className="font-semibold">
                    Tabel: {block.rows.length} Baris × {block.headers.length} Kolom
                  </span>
                  <span className="font-medium text-sky-600">
                    ↔ Geser tabel secara horizontal untuk melihat semua parameter
                  </span>
                </div>
              </div>
            )
          }

          case 'code': {
            return (
              <div
                key={idx}
                className="my-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-inner"
              >
                {block.language && (
                  <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-3.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    <span>{block.language}</span>
                  </div>
                )}
                <pre className="overflow-x-auto p-4 text-xs font-mono text-sky-300 leading-relaxed">
                  <code>{block.code}</code>
                </pre>
              </div>
            )
          }

          case 'blockquote': {
            return (
              <blockquote
                key={idx}
                className="my-3 rounded-r-xl border-l-4 border-sky-500 bg-sky-50/60 px-4 py-2.5 text-xs font-medium leading-relaxed text-sky-950"
              >
                {renderInline(block.text)}
              </blockquote>
            )
          }

          case 'list': {
            if (block.ordered) {
              return (
                <ol key={idx} className="my-2 space-y-1.5 pl-2">
                  {block.items.map((item, iIdx) => (
                    <li
                      key={iIdx}
                      className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed text-slate-700"
                    >
                      <span className="font-mono text-xs font-bold text-sky-600 shrink-0">
                        {iIdx + 1}.
                      </span>
                      <span>{renderInline(item)}</span>
                    </li>
                  ))}
                </ol>
              )
            }
            return (
              <ul key={idx} className="my-2 space-y-1.5 pl-2">
                {block.items.map((item, iIdx) => (
                  <li
                    key={iIdx}
                    className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed text-slate-700"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                    <span>{renderInline(item)}</span>
                  </li>
                ))}
              </ul>
            )
          }

          case 'hr': {
            return <hr key={idx} className="my-5 border-slate-200" />
          }

          case 'paragraph': {
            return (
              <p
                key={idx}
                className="leading-relaxed text-slate-700 whitespace-pre-line"
              >
                {renderInline(block.text)}
              </p>
            )
          }

          default:
            return null
        }
      })}
    </div>
  )
}
