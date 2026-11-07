import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  Bookmark,
  List,
  RotateCcw,
  Settings2,
  Trash2,
  X,
} from 'lucide-react'
import { ComicReader } from '@/components/reader/ComicReader'
import { PdfReader } from '@/components/reader/PdfReader'
import { db } from '@/lib/db'
import { saveReadingProgress, updateBook } from '@/lib/repo'
import { DEFAULT_READER, useSettings } from '@/store/settings'
import type { ReaderPrefs, ReadingMark } from '@/lib/types'
import { clamp, cn, uuid } from '@/lib/utils'
import { toast } from '@/store/toast'

const FONT_STACKS: Record<ReaderPrefs['font'], string> = {
  song: '"Songti SC", "Noto Serif SC", "Source Han Serif SC", STSong, "SimSun", serif',
  hei: '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif',
  kai: '"Kaiti SC", "STKaiti", "KaiTi", "Noto Serif SC", serif',
}

const THEMES: { value: ReaderPrefs['theme']; label: string; bg: string; fg: string }[] = [
  { value: 'sepia', label: '纸黄', bg: '#f3ede1', fg: '#2a251e' },
  { value: 'white', label: '纯白', bg: '#fbfaf7', fg: '#23211d' },
  { value: 'green', label: '护眼', bg: '#dce8d5', fg: '#24301f' },
  { value: 'dark', label: '夜间', bg: '#14161a', fg: '#c6c3bb' },
]

function SidePanel({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col border-l border-line bg-surface shadow-[var(--shadow-soft)] animate-drawer">
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="关闭"
          >
            <X size={17} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}

export function ReaderPage() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const data = useLiveQuery(async () => {
    if (!bookId) return { book: null, content: null }
    const [book, content] = await Promise.all([db.books.get(bookId), db.contents.get(bookId)])
    return {
      book: book && !book.deletedAt ? book : null,
      content: book && !book.deletedAt ? (content ?? null) : null,
    }
  }, [bookId])

  const prefs = useSettings((state) => state.reader)
  const setReader = useSettings((state) => state.setReader)

  const [chapterIndex, setChapterIndex] = useState(0)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [panel, setPanel] = useState<'toc' | 'settings' | null>(null)
  const [layout, setLayout] = useState({ width: 0, height: 0, gap: 48, padX: 22, padY: 18 })

  const initialized = useRef(false)
  const pending = useRef<{ mode: 'first' | 'last' | 'page'; page?: number } | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const touchRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    initialized.current = false
    setChapterIndex(0)
    setPage(0)
    setTotalPages(1)
  }, [bookId])

  useEffect(() => {
    if (!data?.book || !data.content || initialized.current) return
    initialized.current = true
    const index = clamp(data.book.lastChapter ?? 0, 0, Math.max(0, data.content.chapters.length - 1))
    setChapterIndex(index)
    setPage(data.book.lastPage ?? 0)
  }, [data?.book, data?.content])

  const chapters = data?.content?.chapters ?? []
  const chapter = chapters[chapterIndex] ?? chapters[0]

  const paragraphs = useMemo(() => {
    if (!data?.content || !chapter) return []
    let text = data.content.text.slice(chapter.start, chapter.end).trim()
    const firstBreak = text.indexOf('\n')
    const firstLine = (firstBreak === -1 ? text : text.slice(0, firstBreak)).trim()
    if (firstLine === chapter.title.trim()) {
      text = firstBreak === -1 ? '' : text.slice(firstBreak + 1).trim()
    }
    return text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
  }, [data?.content, chapter])

  useLayoutEffect(() => {
    const element = viewportRef.current
    if (!element) return
    const compute = () => {
      const rect = element.getBoundingClientRect()
      const narrow = rect.width < 640
      const padX = narrow ? 22 : Math.max(40, prefs.margin)
      const padY = narrow ? 14 : 34
      const width = Math.max(200, Math.min(rect.width - padX * 2, 760))
      const height = Math.max(180, rect.height - padY * 2)
      const gap = narrow ? 40 : 64
      setLayout((current) =>
        current.width === width &&
        current.height === height &&
        current.gap === gap &&
        current.padX === padX &&
        current.padY === padY
          ? current
          : { width, height, gap, padX, padY },
      )
    }
    compute()
    const observer = new ResizeObserver(compute)
    observer.observe(element)
    return () => observer.disconnect()
  }, [prefs.margin, data?.book?.id])

  useLayoutEffect(() => {
    const element = contentRef.current
    if (!element || !layout.width || !layout.height) return
    const measure = () => {
      const total = Math.max(1, Math.round((element.scrollWidth + layout.gap) / (layout.width + layout.gap)))
      setTotalPages(total)
      const target = pending.current
      if (target?.mode === 'last') {
        setPage(Math.max(0, total - 1))
        pending.current = null
      } else if (target?.mode === 'page') {
        setPage(Math.max(0, Math.min(target.page ?? 0, total - 1)))
        pending.current = null
      } else if (target?.mode === 'first') {
        setPage(0)
        pending.current = null
      } else {
        setPage((current) => Math.min(current, total - 1))
      }
    }
    measure()
    const raf = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(raf)
  }, [
    layout.width,
    layout.height,
    layout.gap,
    chapterIndex,
    prefs.size,
    prefs.leading,
    prefs.font,
    data?.content?.id,
  ])

  const percent = useMemo(() => {
    if (!data?.content || !chapter) return 0
    const within = (page + 1) / Math.max(totalPages, 1)
    const offset = chapter.start + clamp(within, 0, 1) * (chapter.end - chapter.start)
    return clamp((offset / Math.max(data.content.text.length, 1)) * 100, 0, 100)
  }, [data?.content, chapter, page, totalPages])

  const goNext = useCallback(() => {
    if (page < totalPages - 1) {
      setPage((current) => current + 1)
      return
    }
    if (chapterIndex < chapters.length - 1) {
      pending.current = { mode: 'first' }
      setPage(0)
      setChapterIndex((current) => current + 1)
      return
    }
    toast('已经读到最后了')
  }, [page, totalPages, chapterIndex, chapters.length])

  const goPrev = useCallback(() => {
    if (page > 0) {
      setPage((current) => current - 1)
      return
    }
    if (chapterIndex > 0) {
      pending.current = { mode: 'last' }
      setPage(0)
      setChapterIndex((current) => current - 1)
    }
  }, [page, chapterIndex])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault()
        goNext()
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault()
        goPrev()
      } else if (event.key === 'Escape') {
        setPanel(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev])

  const activeBookId = data?.book?.id

  useEffect(() => {
    if (!activeBookId || !initialized.current || layout.width === 0) return
    const timer = window.setTimeout(() => {
      void saveReadingProgress(activeBookId, chapterIndex, page, percent)
    }, 700)
    return () => window.clearTimeout(timer)
  }, [activeBookId, chapterIndex, page, percent, layout.width])

  const marks = data?.book?.marks ?? []
  const currentMark = marks.find((mark) => mark.chapter === chapterIndex && mark.page === page)

  async function toggleMark() {
    if (!data?.book) return
    if (currentMark) {
      await updateBook(data.book.id, { marks: marks.filter((mark) => mark.id !== currentMark.id) })
      toast('已移除书签', 'success')
      return
    }
    const mark: ReadingMark = {
      id: uuid(),
      chapter: chapterIndex,
      page,
      percent: Math.round(percent * 10) / 10,
      label: chapter?.title ?? `第 ${chapterIndex + 1} 章`,
      createdAt: Date.now(),
    }
    await updateBook(data.book.id, { marks: [...marks, mark] })
    toast('已加书签', 'success')
  }

  async function removeMark(id: string) {
    if (!data?.book) return
    await updateBook(data.book.id, { marks: marks.filter((mark) => mark.id !== id) })
  }

  function jumpToMark(mark: ReadingMark) {
    setPanel(null)
    if (mark.chapter === chapterIndex) {
      setPage(clamp(mark.page, 0, Math.max(totalPages - 1, 0)))
      return
    }
    pending.current = { mode: 'page', page: mark.page }
    setPage(0)
    setChapterIndex(clamp(mark.chapter, 0, Math.max(chapters.length - 1, 0)))
  }

  function jumpToChapter(index: number) {
    setPanel(null)
    if (index === chapterIndex) {
      setPage(0)
      return
    }
    pending.current = { mode: 'first' }
    setPage(0)
    setChapterIndex(index)
  }

  if (data === undefined) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-app text-ink">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
        <p className="text-[12px] text-muted">正在打开…</p>
      </div>
    )
  }

  if (!data.book) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-app px-6 text-center text-ink">
        <p className="font-display text-xl">找不到这本书</p>
        <p className="text-[12px] text-muted">可能已经被删除了，或者内容还没导入完成。</p>
        <Link to="/books" className="rounded-xl bg-accent px-4 py-2 text-[12px] font-medium text-accent-ink">
          回到书架
        </Link>
      </div>
    )
  }

  if (data.book.format === 'comic') return <ComicReader book={data.book} />
  if (data.book.format === 'pdf') return <PdfReader book={data.book} />

  if (!data.content) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-app px-6 text-center text-ink">
        <p className="font-display text-xl">这台设备还没有这本书的文件</p>
        <p className="max-w-sm text-[12px] leading-relaxed text-muted">
          书架条目和进度已经同步了，但正文不会同步。到书架重新导入同一个 TXT 文件，就能接着读。
        </p>
        <Link to="/books" className="rounded-xl bg-accent px-4 py-2 text-[12px] font-medium text-accent-ink">
          去书架导入
        </Link>
      </div>
    )
  }

  const readerStyle = {
    '--reader-font': FONT_STACKS[prefs.font],
    '--reader-size': `${prefs.size}px`,
    '--reader-leading': String(prefs.leading),
    '--reader-gap': `${layout.gap}px`,
  } as CSSProperties

  return (
    <div
      className={cn(
        'reader-surface fixed inset-0 flex flex-col overflow-hidden',
        `reader-${prefs.theme}`,
        prefs.theme !== 'dark' && 'reader-paper-texture',
      )}
      style={readerStyle}
    >
      <header
        className="relative z-20 flex h-14 shrink-0 items-center gap-1 px-2 sm:px-4"
        style={{ color: 'var(--reader-fg)' }}
      >
        <button
          type="button"
          onClick={() => navigate('/books')}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5"
          aria-label="返回书架"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-[10px] uppercase tracking-[0.16em] opacity-45">{data.book.title}</p>
          <p className="truncate text-[12px] opacity-75">{chapter?.title ?? ''}</p>
        </div>
        <button
          type="button"
          onClick={() => setPanel('toc')}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5"
          aria-label="目录"
        >
          <List size={18} />
        </button>
        <button
          type="button"
          onClick={() => void toggleMark()}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5',
            currentMark && 'text-accent',
          )}
          aria-label={currentMark ? '移除书签' : '加书签'}
        >
          <Bookmark size={18} className={currentMark ? 'fill-current' : undefined} />
        </button>
        <button
          type="button"
          onClick={() => setPanel('settings')}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5"
          aria-label="阅读设置"
        >
          <Settings2 size={18} />
        </button>
      </header>

      <main
        ref={viewportRef}
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{ padding: `${layout.padY}px ${layout.padX}px` }}
        onTouchStart={(event) => {
          const touch = event.changedTouches[0]
          touchRef.current = { x: touch.clientX, y: touch.clientY }
        }}
        onTouchEnd={(event) => {
          if (!touchRef.current) return
          const touch = event.changedTouches[0]
          const dx = touch.clientX - touchRef.current.x
          const dy = touch.clientY - touchRef.current.y
          touchRef.current = null
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) {
            if (dx < 0) goNext()
            else goPrev()
          }
        }}
      >
        <div
          className="relative mx-auto overflow-hidden"
          style={{ width: layout.width || undefined, height: layout.height || undefined }}
        >
          <div
            key={chapterIndex}
            ref={contentRef}
            className="reader-page-text reader-columns"
            style={{
              width: layout.width,
              height: layout.height,
              columnWidth: layout.width,
              columnGap: layout.gap,
              transform: `translate3d(-${page * (layout.width + layout.gap)}px, 0, 0)`,
              transition: 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <h2>{chapter?.title ?? ''}</h2>
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            {chapterIndex === chapters.length - 1 ? (
              <p className="chap-end" style={{ textAlign: 'center', textIndent: 0, opacity: 0.4 }}>
                · 全书完 ·
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={goPrev}
          className="absolute inset-y-0 left-0 z-10 w-[12%] cursor-w-resize"
          aria-label="上一页"
        />
        <button
          type="button"
          onClick={goNext}
          className="absolute inset-y-0 right-0 z-10 w-[12%] cursor-e-resize"
          aria-label="下一页"
        />

      </main>

      <footer
        className="relative z-20 flex h-11 shrink-0 items-center justify-between gap-4 px-5 text-[10.5px]"
        style={{ color: 'var(--reader-fg)' }}
      >
        <span className="min-w-0 truncate opacity-45">{chapter?.title}</span>
        <span className="shrink-0 tabular-nums opacity-60">
          {page + 1} / {totalPages} · {percent.toFixed(1)}%
        </span>
      </footer>

      <div className="absolute inset-x-0 bottom-0 z-30 h-0.5 bg-black/5">
        <div className="h-full bg-accent/80" style={{ width: `${percent}%` }} />
      </div>

      <SidePanel open={panel === 'toc'} onClose={() => setPanel(null)} title="目录">
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.16em] text-faint">书签</span>
            <button
              type="button"
              onClick={() => void toggleMark()}
              className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-[11px] text-ink-soft hover:text-ink"
            >
              {currentMark ? '移除当前位置书签' : '在当前位置加书签'}
            </button>
          </div>

          {marks.length ? (
            <div className="mb-5 space-y-1.5">
              {marks.map((mark) => (
                <div
                  key={mark.id}
                  className="group flex items-center gap-2 rounded-xl border border-line px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => jumpToMark(mark)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-[12px] text-ink-soft">
                      {mark.label ?? `第 ${mark.chapter + 1} 章`}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-faint">
                      第 {mark.page + 1} 页 · {mark.percent.toFixed(1)}%
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeMark(mark.id)}
                    className="shrink-0 rounded p-1 text-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                    aria-label="删除书签"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-5 rounded-xl border border-dashed border-line px-3 py-4 text-center text-[11px] text-faint">
              还没有书签。翻到想记住的地方，点顶部的书签图标。
            </p>
          )}

          <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-faint">章节</p>
          <div className="space-y-0.5">
            {chapters.map((entry, index) => (
              <button
                key={`${entry.start}-${index}`}
                type="button"
                onClick={() => jumpToChapter(index)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors',
                  index === chapterIndex
                    ? 'bg-accent-soft text-accent'
                    : 'text-ink-soft hover:bg-surface-2',
                )}
              >
                <span className="w-7 shrink-0 text-[10px] tabular-nums opacity-50">{index + 1}</span>
                <span className="truncate">{entry.title}</span>
              </button>
            ))}
          </div>
        </div>
      </SidePanel>

      <SidePanel open={panel === 'settings'} onClose={() => setPanel(null)} title="阅读设置">
        <div className="space-y-7 p-4">
          <section>
            <p className="mb-2.5 text-[11px] uppercase tracking-[0.16em] text-faint">背景</p>
            <div className="grid grid-cols-4 gap-2">
              {THEMES.map((theme) => (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => setReader({ theme: theme.value })}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all',
                    prefs.theme === theme.value
                      ? 'border-accent ring-1 ring-accent/30'
                      : 'border-line hover:border-line-strong',
                  )}
                >
                  <span
                    className="h-9 w-full rounded-md border border-black/10"
                    style={{ background: theme.bg }}
                  />
                  <span className="text-[10px] text-muted">{theme.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2.5 text-[11px] uppercase tracking-[0.16em] text-faint">字体</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['song', '宋体'],
                  ['hei', '黑体'],
                  ['kai', '楷体'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReader({ font: value })}
                  className={cn(
                    'rounded-xl border py-2.5 text-[13px] transition-colors',
                    prefs.font === value
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line text-ink-soft hover:bg-surface-2',
                  )}
                  style={{ fontFamily: FONT_STACKS[value] }}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="uppercase tracking-[0.16em] text-faint">字号</span>
                <span className="tabular-nums text-muted">{prefs.size}px</span>
              </div>
              <input
                type="range"
                min={15}
                max={28}
                step={1}
                value={prefs.size}
                onChange={(event) => setReader({ size: Number(event.target.value) })}
                className="w-full accent-[var(--accent)]"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="uppercase tracking-[0.16em] text-faint">行距</span>
                <span className="tabular-nums text-muted">{prefs.leading.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={1.5}
                max={2.4}
                step={0.1}
                value={prefs.leading}
                onChange={(event) => setReader({ leading: Number(event.target.value) })}
                className="w-full accent-[var(--accent)]"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="uppercase tracking-[0.16em] text-faint">左右留白</span>
                <span className="tabular-nums text-muted">{prefs.margin}px</span>
              </div>
              <input
                type="range"
                min={24}
                max={120}
                step={4}
                value={prefs.margin}
                onChange={(event) => setReader({ margin: Number(event.target.value) })}
                className="w-full accent-[var(--accent)]"
              />
            </div>
          </section>

          <button
            type="button"
            onClick={() => setReader(DEFAULT_READER)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-[12px] text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <RotateCcw size={13} />
            恢复默认
          </button>

          <p className="text-center text-[10px] leading-relaxed text-faint">
            进度会自动保存并同步。翻页可用方向键、空格或左右滑动。
          </p>
        </div>
      </SidePanel>
    </div>
  )
}
