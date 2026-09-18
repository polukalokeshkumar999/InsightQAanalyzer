import React, { useState } from 'react'
import { Check, Copy, AlertTriangle, Info, Lightbulb, ShieldAlert } from 'lucide-react'

export default function MarkdownView({ content }) {
  if (!content) return null

  // Split content by code blocks first
  const parts = []
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.substring(lastIndex, match.index) })
    }
    parts.push({
      type: 'code',
      lang: match[1] || 'text',
      value: match[2].trimEnd()
    })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.substring(lastIndex) })
  }

  return (
    <div className="space-y-3 text-sm leading-relaxed text-gray-800">
      {parts.map((part, i) => {
        if (part.type === 'code') {
          return <CodeSnippet key={i} lang={part.lang} code={part.value} />
        }
        return <TextSection key={i} text={part.value} />
      })}
    </div>
  )
}

function CodeSnippet({ lang, code }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Failed to copy code:', e)
    }
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-800 bg-gray-900 text-gray-100 shadow-sm my-3">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/80 border-b border-gray-700/60 text-xs text-gray-400">
        <span className="font-mono uppercase tracking-wider text-[11px] text-primary-400">
          {lang || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-gray-700 text-gray-300 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span className="text-[11px] text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-normal text-emerald-300/90 whitespace-pre">
        {code}
      </pre>
    </div>
  )
}

function TextSection({ text }) {
  const lines = text.split('\n')
  const elements = []
  let tableRows = []
  let inTable = false

  const flushTable = () => {
    if (tableRows.length > 0) {
      elements.push(<RenderTable key={`table-${elements.length}`} rows={tableRows} />)
      tableRows = []
      inTable = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Table detection: line contains '|'
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true
      tableRows.push(trimmed)
      continue
    } else if (inTable) {
      flushTable()
    }

    // GitHub alert blockquote: > [!TIP] or > [!WARNING] etc
    if (trimmed.startsWith('> [!')) {
      const alertTypeMatch = trimmed.match(/>\s*\[!(TIP|NOTE|IMPORTANT|WARNING|CAUTION)\]/i)
      const alertType = alertTypeMatch ? alertTypeMatch[1].toUpperCase() : 'NOTE'
      const alertLines = []
      
      // collect following blockquote lines
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
        i++
        alertLines.push(lines[i].replace(/^>\s?/, ''))
      }

      elements.push(
        <RenderAlert key={`alert-${i}`} type={alertType} text={alertLines.join('\n')} />
      )
      continue
    }

    // Standard blockquote
    if (trimmed.startsWith('>')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-4 border-primary-400 pl-3 py-1 my-2 text-gray-600 italic bg-primary-50/40 rounded-r"
        >
          {formatInline(trimmed.replace(/^>\s?/, ''))}
        </blockquote>
      )
      continue
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-gray-900 mt-4 mb-2 flex items-center gap-2">
          {formatInline(trimmed.substring(4))}
        </h3>
      )
      continue
    }
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${i}`} className="text-sm font-bold text-gray-800 mt-3 mb-1.5 text-primary-700">
          {formatInline(trimmed.substring(5))}
        </h4>
      )
      continue
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-lg font-bold text-gray-900 mt-5 mb-2 pb-1 border-b border-gray-200">
          {formatInline(trimmed.substring(3))}
        </h2>
      )
      continue
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***') {
      elements.push(<hr key={`hr-${i}`} className="my-3 border-gray-200" />)
      continue
    }

    // Checklists: - [x] or - [ ]
    if (/^-\s*\[([ xX])\]\s+(.*)/.test(trimmed)) {
      const match = trimmed.match(/^-\s*\[([ xX])\]\s+(.*)/)
      const checked = match[1].toLowerCase() === 'x'
      elements.push(
        <div key={`check-${i}`} className="flex items-start gap-2 my-1 text-xs sm:text-sm">
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mt-1 h-3.5 w-3.5 rounded text-primary-600 focus:ring-primary-500 border-gray-300 pointer-events-none"
          />
          <span className={checked ? 'text-gray-800' : 'text-gray-600'}>
            {formatInline(match[2])}
          </span>
        </div>
      )
      continue
    }

    // Unordered List item
    if (/^[-*•]\s+(.*)/.test(trimmed)) {
      const text = trimmed.replace(/^[-*•]\s+/, '')
      elements.push(
        <li key={`li-${i}`} className="ml-5 list-disc my-1 pl-1 text-gray-700">
          {formatInline(text)}
        </li>
      )
      continue
    }

    // Ordered List item
    if (/^\d+\.\s+(.*)/.test(trimmed)) {
      const num = trimmed.match(/^\d+\./)[0]
      const text = trimmed.replace(/^\d+\.\s+/, '')
      elements.push(
        <div key={`ol-${i}`} className="flex items-start gap-2 my-1.5 pl-1">
          <span className="font-semibold text-primary-700 min-w-[20px]">{num}</span>
          <span className="text-gray-700">{formatInline(text)}</span>
        </div>
      )
      continue
    }

    // Empty lines
    if (trimmed === '') {
      continue
    }

    // Standard Paragraph
    elements.push(
      <p key={`p-${i}`} className="my-1.5 text-gray-700 leading-relaxed">
        {formatInline(line)}
      </p>
    )
  }

  flushTable()

  return <>{elements}</>
}

function RenderAlert({ type, text }) {
  const configs = {
    TIP: {
      border: 'border-emerald-500 bg-emerald-50/70 text-emerald-900',
      icon: Lightbulb,
      iconColor: 'text-emerald-600',
      title: 'PRO TIP'
    },
    WARNING: {
      border: 'border-amber-500 bg-amber-50/70 text-amber-900',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      title: 'ATTENTION / WARNING'
    },
    IMPORTANT: {
      border: 'border-blue-500 bg-blue-50/70 text-blue-900',
      icon: Info,
      iconColor: 'text-blue-600',
      title: 'IMPORTANT REQUIREMENT'
    },
    CAUTION: {
      border: 'border-red-500 bg-red-50/70 text-red-900',
      icon: ShieldAlert,
      iconColor: 'text-red-600',
      title: 'CRITICAL CAUTION'
    },
    NOTE: {
      border: 'border-indigo-500 bg-indigo-50/70 text-indigo-900',
      icon: Info,
      iconColor: 'text-indigo-600',
      title: 'NOTE'
    }
  }

  const config = configs[type] || configs.NOTE
  const Icon = config.icon

  return (
    <div className={`border-l-4 rounded-r-lg p-3 my-3 shadow-xs ${config.border}`}>
      <div className="flex items-center gap-2 font-semibold text-xs uppercase tracking-wider mb-1">
        <Icon className={`w-4 h-4 ${config.iconColor}`} />
        <span>{config.title}</span>
      </div>
      <div className="text-xs sm:text-sm pl-6 leading-relaxed">
        {text.split('\n').map((line, idx) => (
          <p key={idx} className="my-0.5">
            {formatInline(line)}
          </p>
        ))}
      </div>
    </div>
  )
}

function RenderTable({ rows }) {
  if (!rows || rows.length < 2) return null

  // Filter out divider row (e.g. |---|---|)
  const isDivider = (row) => /^\|(\s*[-:]+\s*\|)+$/.test(row)
  const headerRow = rows[0]
  const dataRows = rows.slice(1).filter((r) => !isDivider(r))

  const parseCells = (row) => {
    return row
      .slice(1, -1) // remove starting and ending |
      .split('|')
      .map((c) => c.trim())
  }

  const headers = parseCells(headerRow)

  return (
    <div className="overflow-x-auto my-3 rounded-lg border border-gray-200 shadow-xs">
      <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
        <thead className="bg-gray-50/80">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left font-semibold text-gray-700 tracking-wider border-r last:border-r-0 border-gray-200"
              >
                {formatInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {dataRows.map((r, rIdx) => {
            const cells = parseCells(r)
            return (
              <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40 hover:bg-primary-50/30 transition-colors'}>
                {cells.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className="px-3 py-2 text-gray-800 border-r last:border-r-0 border-gray-100 whitespace-pre-wrap"
                  >
                    {formatInline(cell)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Inline formatting helper: handles bold, code, italics, links
function formatInline(text) {
  if (!text) return ''

  // Split by inline tokens: `code` or **bold** or *italic*
  const tokens = []
  let cursor = 0
  const inlineRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g
  let match

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > cursor) {
      tokens.push(text.substring(cursor, match.index))
    }

    const token = match[0]
    if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push(
        <code
          key={`code-${cursor}`}
          className="px-1.5 py-0.5 text-[11px] sm:text-xs font-mono font-medium bg-gray-100 text-primary-700 rounded border border-gray-200"
        >
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push(
        <strong key={`bold-${cursor}`} className="font-semibold text-gray-900">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith('*') && token.endsWith('*')) {
      tokens.push(
        <em key={`italic-${cursor}`} className="italic text-gray-700">
          {token.slice(1, -1)}
        </em>
      )
    } else if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/)
      if (linkMatch) {
        tokens.push(
          <a
            key={`link-${cursor}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-800 underline font-medium"
          >
            {linkMatch[1]}
          </a>
        )
      }
    }

    cursor = match.index + token.length
  }

  if (cursor < text.length) {
    tokens.push(text.substring(cursor))
  }

  return tokens
}
