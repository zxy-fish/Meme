import type { ReactNode } from 'react'
import { CheckSquare2, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g)
  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-surface-2 px-1.5 py-0.5 text-[0.88em] text-ink">
          {part.slice(1, -1)}
        </code>
      )
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      return (
        <a
          key={index}
          href={link[2]}
          target="_blank"
          rel="noreferrer"
          className="text-accent underline decoration-accent/40 underline-offset-2"
        >
          {link[1]}
        </a>
      )
    }
    return <span key={index}>{part}</span>
  })
}

export function NotePreview({
  content,
  onToggleTask,
}: {
  content: string
  onToggleTask?: (index: number) => void
}) {
  if (!content.trim()) {
    return (
      <p className="text-[13px] text-faint">
        还没有内容。切回编辑，写点什么。
      </p>
    )
  }

  let taskIndex = 0

  return (
    <div className="space-y-2.5 text-[14.5px] leading-[1.9] text-ink-soft">
      {content.split('\n').map((line, index) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={index} className="h-1.5" />

        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={index} className="font-display text-2xl font-semibold text-ink">
              {renderInline(trimmed.slice(2))}
            </h1>
          )
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={index} className="font-display text-xl font-semibold text-ink">
              {renderInline(trimmed.slice(3))}
            </h2>
          )
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={index} className="font-display text-lg font-semibold text-ink">
              {renderInline(trimmed.slice(4))}
            </h3>
          )
        }
        if (trimmed === '---' || trimmed === '***') {
          return <hr key={index} className="my-3 border-line" />
        }
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={index}
              className="border-l-2 border-accent/40 pl-3 text-[13.5px] italic text-muted"
            >
              {renderInline(trimmed.slice(2))}
            </blockquote>
          )
        }

        const check = trimmed.match(/^- \[( |x|X)\] (.*)$/)
        if (check) {
          const checked = check[1].toLowerCase() === 'x'
          const current = taskIndex
          taskIndex += 1
          return (
            <div key={index} className="flex items-start gap-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                aria-label={checked ? '标记未完成' : '标记完成'}
                disabled={!onToggleTask}
                onClick={() => onToggleTask?.(current)}
                className={cn(
                  'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors',
                  onToggleTask ? 'hover:bg-accent-soft' : 'cursor-default',
                  checked ? 'text-accent' : 'text-faint',
                )}
              >
                {checked ? <CheckSquare2 size={15} /> : <Square size={15} />}
              </button>
              <span className={checked ? 'text-faint line-through' : undefined}>
                {renderInline(check[2])}
              </span>
            </div>
          )
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={index} className="flex items-start gap-2">
              <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-muted" />
              <span>{renderInline(trimmed.slice(2))}</span>
            </div>
          )
        }

        const numbered = trimmed.match(/^(\d+)\. (.*)$/)
        if (numbered) {
          return (
            <div key={index} className="flex items-start gap-2">
              <span className="w-5 shrink-0 text-right text-[12px] text-faint">{numbered[1]}.</span>
              <span>{renderInline(numbered[2])}</span>
            </div>
          )
        }

        return <p key={index}>{renderInline(line)}</p>
      })}
    </div>
  )
}
