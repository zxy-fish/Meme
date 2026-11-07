import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  Bold,
  Eye,
  Heading2,
  Italic,
  List,
  ListChecks,
  Pencil,
  Pin,
  Plus,
  Quote,
  Search,
  StickyNote,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { NotePreview } from '@/components/notes/NotePreview'
import { db } from '@/lib/db'
import { createNote, deleteNote, toggleNotePin, updateNote } from '@/lib/repo'
import type { Note } from '@/lib/types'
import { cn, parseTags } from '@/lib/utils'
import { toast } from '@/store/toast'

type SaveState = 'saved' | 'saving' | 'idle'
type Pane = 'list' | 'editor'

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatNoteDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  if (sameDay(date, now)) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(date, yesterday)) return '昨天'
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

function previewText(content: string): string {
  return content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>#-]/g, ' ')
    .replace(/\[( |x|X)\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90)
}

function bucketOf(timestamp: number): 'today' | 'yesterday' | 'earlier' {
  const now = new Date()
  const date = new Date(timestamp)
  if (sameDay(date, now)) return 'today'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(date, yesterday)) return 'yesterday'
  return 'earlier'
}

function sameTags(a: string[], b: string[]): boolean {
  return a.join('\u0000') === b.join('\u0000')
}

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
    >
      {children}
    </button>
  )
}

export function NotesPage() {
  const notes = useLiveQuery(
    async () => (await db.notes.toArray()).filter((note) => !note.deletedAt),
    [],
  )
  const [selectedId, setSelectedId] = useState<string>()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [draftId, setDraftId] = useState<string>()
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState(true)
  const [pane, setPane] = useState<Pane>('list')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const skipNextLoadRef = useRef<string | null>(null)

  const sorted = useMemo(
    () =>
      [...(notes ?? [])].sort(
        (a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.updatedAt - a.updatedAt,
      ),
    [notes],
  )
  const selected = (notes ?? []).find((note) => note.id === selectedId)

  useEffect(() => {
    if (selectedId && sorted.some((note) => note.id === selectedId)) return
    if (sorted.length) setSelectedId(sorted[0].id)
  }, [sorted, selectedId])

  useEffect(() => {
    if (!selected) return
    if (skipNextLoadRef.current === selected.id) {
      skipNextLoadRef.current = null
      return
    }
    setDraftId(selected.id)
    setTitle(selected.title)
    setContent(selected.content)
    setTagsInput(selected.tags.join(', '))
    setSaveState('saved')
  }, [selectedId, selected?.id])

  useEffect(() => {
    if (!selected || draftId !== selected.id) return
    const tags = parseTags(tagsInput)
    if (
      title === selected.title &&
      content === selected.content &&
      sameTags(tags, selected.tags)
    ) {
      setSaveState('saved')
      return
    }
    setSaveState('saving')
    const timer = window.setTimeout(() => {
      void updateNote(selected.id, { title, content, tags })
        .then(() => setSaveState('saved'))
        .catch(() => {
          setSaveState('idle')
          toast('备忘录保存失败', 'error')
        })
    }, 450)
    return () => window.clearTimeout(timer)
  }, [selected, draftId, title, content, tagsInput])

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return sorted
    return sorted.filter((note) =>
      [note.title, note.content, ...note.tags].join(' ').toLowerCase().includes(keyword),
    )
  }, [sorted, query])

  const groups = useMemo(() => {
    const pinned = filtered.filter((note) => note.pinned)
    const today: Note[] = []
    const yesterday: Note[] = []
    const earlier: Note[] = []
    for (const note of filtered) {
      if (note.pinned) continue
      const bucket = bucketOf(note.updatedAt)
      if (bucket === 'today') today.push(note)
      else if (bucket === 'yesterday') yesterday.push(note)
      else earlier.push(note)
    }
    return [
      { key: 'pinned', label: '置顶', items: pinned },
      { key: 'today', label: '今天', items: today },
      { key: 'yesterday', label: '昨天', items: yesterday },
      { key: 'earlier', label: '更早', items: earlier },
    ].filter((group) => group.items.length > 0)
  }, [filtered])

  function toggleTask(taskIndex: number) {
    if (!selected) return
    let cursor = -1
    const next = content.split('\n').map((line) => {
      const match = line.match(/^(\s*)- \[( |x|X)\] (.*)$/)
      if (!match) return line
      cursor += 1
      if (cursor !== taskIndex) return line
      const checked = match[2].toLowerCase() === 'x'
      return `${match[1]}- [${checked ? ' ' : 'x'}] ${match[3]}`
    })
    const value = next.join('\n')
    setContent(value)
    void updateNote(selected.id, { content: value })
  }

  async function persistNow() {
    if (!selected || draftId !== selected.id) return
    const tags = parseTags(tagsInput)
    if (title === selected.title && content === selected.content && sameTags(tags, selected.tags)) {
      return
    }
    await updateNote(selected.id, { title, content, tags })
    setSaveState('saved')
  }

  async function selectNote(id: string) {
    if (id === selectedId) {
      setPane('editor')
      return
    }
    await persistNow()
    setPreview(true)
    setSelectedId(id)
    setPane('editor')
  }

  async function handleNew() {
    await persistNow()
    const note = await createNote({ title: '', content: '', tags: [] })
    skipNextLoadRef.current = note.id
    setDraftId(note.id)
    setTitle('')
    setContent('')
    setTagsInput('')
    setSaveState('saved')
    setPreview(false)
    setSelectedId(note.id)
    setPane('editor')
    window.setTimeout(() => titleRef.current?.focus(), 60)
  }

  async function handleDelete() {
    if (!selected) return
    const remaining = sorted.filter((note) => note.id !== selected.id)
    await deleteNote(selected.id)
    setDeleteOpen(false)
    setPane('list')
    setPreview(true)
    setSelectedId(remaining[0]?.id)
    toast('备忘录已删除', 'success')
  }

  async function handlePin() {
    if (!selected) return
    await toggleNotePin(selected.id, !selected.pinned)
  }

  function wrapSelection(before: string, after = before) {
    const element = bodyRef.current
    if (!element) return
    const start = element.selectionStart
    const end = element.selectionEnd
    const selectedText = content.slice(start, end) || '文字'
    const next = content.slice(0, start) + before + selectedText + after + content.slice(end)
    setContent(next)
    window.requestAnimationFrame(() => {
      element.focus()
      element.setSelectionRange(start + before.length, start + before.length + selectedText.length)
    })
  }

  function prefixLine(prefix: string) {
    const element = bodyRef.current
    if (!element) return
    const start = element.selectionStart
    const lineStart = content.lastIndexOf('\n', start - 1) + 1
    const next = content.slice(0, lineStart) + prefix + content.slice(lineStart)
    setContent(next)
    window.requestAnimationFrame(() => {
      element.focus()
      const position = start + prefix.length
      element.setSelectionRange(position, position)
    })
  }

  const wordCount = content.replace(/\s/g, '').length
  const hasNotes = (notes?.length ?? 0) > 0

  return (
    <div className="animate-fade-up">
      <header className="-mx-4 -mt-6 rounded-b-[2rem] px-4 pb-2 pt-6 sm:-mx-6 sm:px-6 lg:-mx-10 lg:-mt-10 lg:px-10 lg:pt-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-accent">Memos</p>
            <h1 className="mt-2 font-display text-[34px] font-semibold leading-[1.1] tracking-wide text-ink sm:text-[44px]">
              备忘录
            </h1>
            <p className="mt-2 text-[13px] text-muted">
              共 {notes?.length ?? 0} 条 · 随手记下想看的、想做的、想留住的
            </p>
          </div>
          <Button variant="primary" onClick={() => void handleNew()} className="mt-1 hidden sm:inline-flex">
            <Plus size={16} />
            新建备忘录
          </Button>
        </div>
      </header>

      <div className="mt-5 flex h-[calc(100dvh-300px)] min-h-[500px] overflow-hidden rounded-3xl border border-line bg-surface/40 lg:h-[calc(100dvh-250px)]">
        <aside
          className={cn(
            'flex w-full flex-col lg:w-[336px] lg:shrink-0 lg:border-r lg:border-line',
            pane === 'editor' && 'hidden lg:flex',
          )}
        >
          <div className="flex items-center gap-2 border-b border-line p-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索备忘录…"
                className="h-9 w-full rounded-lg border border-line bg-surface-2 pl-9 pr-3 text-[12px] text-ink outline-none placeholder:text-faint focus:border-accent/50"
              />
            </div>
            <Button
              size="icon"
              variant="primary"
              onClick={() => void handleNew()}
              aria-label="新建备忘录"
              className="h-9 w-9 shrink-0 rounded-lg"
            >
              <Plus size={17} />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {notes === undefined ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-xl bg-surface-2" />
                ))}
              </div>
            ) : filtered.length ? (
              groups.map((group) => (
                <section key={group.key} className="mb-3">
                  <h2 className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-faint">
                    {group.label}
                  </h2>
                  <div className="space-y-1">
                    {group.items.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => void selectNote(note.id)}
                        className={cn(
                          'w-full rounded-xl border px-3 py-2.5 text-left transition-colors',
                          note.id === selectedId
                            ? 'border-accent/20 bg-accent-soft/70'
                            : 'border-transparent hover:border-line hover:bg-surface-2/70',
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                            {note.title.trim() || '无标题'}
                          </span>
                          {note.pinned ? (
                            <Pin size={12} className="mt-0.5 shrink-0 fill-accent text-accent" />
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
                          {previewText(note.content) || '空白备忘录'}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-faint">
                          <span>{formatNoteDate(note.updatedAt)}</span>
                          <span className="truncate">{note.tags.slice(0, 2).join(' · ')}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
                <StickyNote size={28} className="text-faint" />
                <p className="mt-3 text-[13px] text-ink-soft">
                  {query ? '没有搜到备忘录' : '还没有备忘录'}
                </p>
                <p className="mt-1 text-[11px] text-faint">
                  {query ? '换个关键词试试。' : '记一条待办、一段摘录，或者一个想法。'}
                </p>
                {!query ? (
                  <Button size="sm" variant="primary" className="mt-4" onClick={() => void handleNew()}>
                    <Plus size={14} /> 新建一条
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </aside>

        <section
          className={cn(
            'min-w-0 flex-1 flex-col',
            pane === 'list' ? 'hidden lg:flex' : 'flex',
          )}
        >
          {notes === undefined ? (
            <div className="flex h-full items-center justify-center text-[12px] text-faint">
              加载中…
            </div>
          ) : selected ? (
            <>
              <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-3 sm:px-4">
                <button
                  type="button"
                  onClick={() => setPane('list')}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink lg:hidden"
                  aria-label="返回备忘录列表"
                >
                  <ArrowLeft size={17} />
                </button>
                <span className="text-[10.5px] text-faint">
                  {saveState === 'saving' ? '保存中…' : saveState === 'saved' ? '已自动保存' : ''}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void handlePin()}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-surface-2',
                      selected.pinned ? 'text-accent' : 'text-muted hover:text-ink',
                    )}
                    aria-label={selected.pinned ? '取消置顶' : '置顶'}
                    title={selected.pinned ? '取消置顶' : '置顶'}
                  >
                    <Pin size={16} className={selected.pinned ? 'fill-accent' : undefined} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreview((value) => !value)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    aria-label={preview ? '编辑' : '预览'}
                    title={preview ? '编辑' : '预览'}
                  >
                    {preview ? <Pencil size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    aria-label="删除备忘录"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
                  <input
                    ref={titleRef}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    onBlur={() => void persistNow()}
                    placeholder="标题"
                    className="w-full bg-transparent font-display text-3xl font-semibold tracking-wide text-ink outline-none placeholder:text-faint sm:text-4xl"
                  />

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-faint">
                    <span>{formatNoteDate(selected.updatedAt)}</span>
                    <span>{wordCount} 字</span>
                    {selected.pinned ? <span className="text-accent">已置顶</span> : null}
                    {selected.tags.length ? (
                      <span className="truncate">{selected.tags.join(' · ')}</span>
                    ) : null}
                  </div>

                  {preview ? (
                    <div className="mt-5 min-h-[38vh]">
                      <NotePreview content={content} onToggleTask={toggleTask} />
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 flex items-center gap-0.5 overflow-x-auto border-y border-line py-1.5">
                        <ToolButton label="加粗" onClick={() => wrapSelection('**')}>
                          <Bold size={15} />
                        </ToolButton>
                        <ToolButton label="斜体" onClick={() => wrapSelection('*')}>
                          <Italic size={15} />
                        </ToolButton>
                        <ToolButton label="标题" onClick={() => prefixLine('## ')}>
                          <Heading2 size={15} />
                        </ToolButton>
                        <ToolButton label="无序列表" onClick={() => prefixLine('- ')}>
                          <List size={15} />
                        </ToolButton>
                        <ToolButton label="待办清单" onClick={() => prefixLine('- [ ] ')}>
                          <ListChecks size={15} />
                        </ToolButton>
                        <ToolButton label="引用" onClick={() => prefixLine('> ')}>
                          <Quote size={15} />
                        </ToolButton>
                        <span className="ml-auto hidden shrink-0 pr-1 text-[10px] text-faint sm:block">
                          Markdown
                        </span>
                      </div>
                      <textarea
                        ref={bodyRef}
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        onBlur={() => void persistNow()}
                        placeholder="开始写点什么…"
                        className="mt-3 min-h-[38vh] w-full resize-none bg-transparent text-[15px] leading-8 text-ink outline-none placeholder:text-faint"
                      />
                    </>
                  )}

                  <div className="mt-4 flex items-center gap-3 border-t border-line pt-3">
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-faint">标签</span>
                    <input
                      value={tagsInput}
                      onChange={(event) => setTagsInput(event.target.value)}
                      onBlur={() => void persistNow()}
                      placeholder="用逗号分隔，例如：想法, 待办"
                      className="min-w-0 flex-1 bg-transparent text-[12px] text-ink-soft outline-none placeholder:text-faint"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted">
                <StickyNote size={24} />
              </div>
              <h2 className="mt-4 font-display text-xl font-semibold text-ink">
                {hasNotes ? '选一条备忘录' : '还没有备忘录'}
              </h2>
              <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-faint">
                {hasNotes
                  ? '在左侧选一条，或者新建一条。'
                  : '把一闪而过的想法、待办、摘录记在这里。'}
              </p>
              <Button variant="primary" className="mt-5" onClick={() => void handleNew()}>
                <Plus size={15} /> 新建备忘录
              </Button>
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="删除这条备忘录？"
        description="删除会同步到其他设备。"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()}>
              <Trash2 size={14} /> 删除
            </Button>
          </div>
        }
      >
        <p className="text-[13px] leading-relaxed text-muted">
          「{selected?.title.trim() || '无标题'}」将被删除。确认后无法在界面里恢复。
        </p>
      </Dialog>
    </div>
  )
}
