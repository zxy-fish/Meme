import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, Link2, Loader2, Plus, Search, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Cover } from '@/components/ui/Cover'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { db } from '@/lib/db'
import { createMediaFromBook, linkBookToMedia } from '@/lib/repo'
import { regionLabel } from '@/lib/countries'
import { TYPE_LABELS, type Book, type MediaItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from '@/store/toast'

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s\-_:：·,，.。()（）[\]【】]/g, '')
}

export function LinkBookDialog({
  book,
  open,
  onClose,
  onLinked,
}: {
  book: Book | null
  open: boolean
  onClose: () => void
  onLinked?: (book: Book) => void
}) {
  const candidates = useLiveQuery(async () => {
    const items = await db.media.toArray()
    return items.filter(
      (item) => !item.deletedAt && (item.type === 'novel' || item.type === 'manga'),
    )
  }, [])
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string>()
  const [saving, setSaving] = useState(false)
  const autoMatched = useRef(false)

  useEffect(() => {
    if (!open || !book) return
    setQuery(book.title)
    setSelectedId(book.mediaId)
    autoMatched.current = false
  }, [open, book?.id, book?.mediaId, book?.title])

  useEffect(() => {
    if (!open || !book || autoMatched.current || !candidates?.length) return
    autoMatched.current = true
    if (book.mediaId) {
      setSelectedId(book.mediaId)
      return
    }
    const target = normalize(book.title)
    const exact = candidates.find(
      (item) => normalize(item.title) === target || normalize(item.originalTitle ?? '') === target,
    )
    if (exact) setSelectedId(exact.id)
  }, [open, book, candidates])

  const filtered = useMemo(() => {
    const keyword = normalize(query.trim())
    const list = candidates ?? []
    if (!keyword) return list.slice(0, 40)
    return list.filter((item) =>
      [item.title, item.originalTitle, ...item.tags].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase()),
    )
  }, [candidates, query])

  async function link(mediaId: string) {
    if (!book) return
    setSaving(true)
    try {
      await linkBookToMedia(book.id, mediaId)
      toast('已关联，阅读进度会写回媒体库', 'success')
      onLinked?.(book)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function createAndLink() {
    if (!book) return
    setSaving(true)
    try {
      const media = await createMediaFromBook(book)
      await linkBookToMedia(book.id, media.id)
      toast(`已创建《${media.title}》并关联`, 'success')
      onLinked?.(book)
      onClose()
    } catch (error) {
      toast((error as Error).message || '创建条目失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function unlink() {
    if (!book) return
    setSaving(true)
    try {
      await linkBookToMedia(book.id, undefined)
      toast('已取消关联', 'success')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="关联到媒体库"
      description={
        book
          ? `把《${book.title}》关联到媒体库里的书 / 漫画；读到哪会写回条目进度。`
          : undefined
      }
      size="md"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {book?.mediaId ? (
              <Button variant="ghost" size="sm" onClick={() => void unlink()} disabled={saving}>
                <Unlink size={13} /> 取消关联
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={onClose}>
                稍后再说
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => void createAndLink()} disabled={saving}>
              <Plus size={13} /> 创建新媒体条目
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedId || saving}
              onClick={() => selectedId && void link(selectedId)}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
              关联
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索小说 / 漫画条目…"
            className="pl-9"
          />
        </div>

        <div className="max-h-[300px] space-y-1 overflow-y-auto pr-1">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors',
                selectedId === item.id
                  ? 'border-accent/40 bg-accent-soft'
                  : 'border-transparent hover:border-line hover:bg-surface-2',
              )}
            >
              <Cover src={item.cover} title={item.title} className="h-14 w-10 shrink-0" rounded="rounded-md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">{item.title}</span>
                <span className="mt-0.5 block truncate text-[10.5px] text-muted">
                  {[TYPE_LABELS[item.type], item.year, regionLabel(item.type, item.country)]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                <span className="mt-0.5 block text-[10px] text-faint">
                  进度 {item.progressCurrent}
                  {item.progressTotal ? ` / ${item.progressTotal}` : ''}
                </span>
              </span>
              {selectedId === item.id ? <BookOpen size={16} className="shrink-0 text-accent" /> : null}
            </button>
          ))}
          {!filtered.length ? (
            <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-[11.5px] text-faint">
              没有匹配的条目。可以创建一个新媒体条目再关联，或者稍后再说。
            </div>
          ) : null}
        </div>

        {book ? (
          <p className="rounded-xl bg-surface-2/60 px-3 py-2 text-[10.5px] leading-relaxed text-faint">
            关联后：{book.format === 'txt' ? '章节进度' : '页码进度'}
            会写回媒体库；状态为「想看」时读到内容会自动变成「在看」。
          </p>
        ) : null}
      </div>
    </Dialog>
  )
}
