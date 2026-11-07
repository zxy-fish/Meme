import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Loader2,
  X,
} from 'lucide-react'
import { db } from '@/lib/db'
import { saveReadingProgress, updateBook } from '@/lib/repo'
import type { Book } from '@/lib/types'
import { clamp, cn } from '@/lib/utils'

export function ComicReader({ book }: { book: Book }) {
  const navigate = useNavigate()
  const pages = useLiveQuery(
    () => db.pages.where('bookId').equals(book.id).sortBy('index'),
    [book.id],
  )
  const [page, setPage] = useState(book.lastPage ?? 0)
  const [direction, setDirection] = useState<'rtl' | 'ltr'>(book.comicDirection ?? 'rtl')
  const [fit, setFit] = useState<'contain' | 'width'>('contain')
  const [gridOpen, setGridOpen] = useState(false)
  const [url, setUrl] = useState<string>()
  const initialized = useRef(false)
  const touchRef = useRef<{ x: number; y: number } | null>(null)

  const total = pages?.length ?? book.pageCount ?? 0
  const percent = total ? ((page + 1) / total) * 100 : 0

  useEffect(() => {
    if (!pages?.length || initialized.current) return
    initialized.current = true
    setPage(clamp(book.lastPage ?? 0, 0, pages.length - 1))
  }, [pages, book.lastPage])

  useEffect(() => {
    const current = pages?.[page]
    if (!current) {
      setUrl(undefined)
      return
    }
    const nextUrl = URL.createObjectURL(current.blob)
    setUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [pages, page])

  useEffect(() => {
    if (!pages?.length || !initialized.current) return
    void saveReadingProgress(book.id, 0, page, percent)
  }, [book.id, page, percent, pages?.length])

  function goNext() {
    setPage((current) => Math.min(Math.max(total - 1, 0), current + 1))
  }

  function goPrev() {
    setPage((current) => Math.max(0, current - 1))
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setGridOpen(false)
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        if (direction === 'rtl') goNext()
        else goPrev()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        if (direction === 'rtl') goPrev()
        else goNext()
      } else if (event.key === ' ') {
        event.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [direction, total])

  async function toggleDirection() {
    const next = direction === 'rtl' ? 'ltr' : 'rtl'
    setDirection(next)
    await updateBook(book.id, { comicDirection: next })
  }

  if (pages && pages.length === 0) {
    return (
      <div className="fixed inset-0 z-0 flex flex-col items-center justify-center gap-4 bg-[#0a0b0d] px-6 text-center text-white">
        <p className="font-display text-xl">这台设备还没有这个漫画文件</p>
        <p className="max-w-sm text-[12px] leading-relaxed text-white/50">
          书架进度已经同步，但图片不会同步。到书架重新导入同一个 ZIP / CBZ / 文件夹，就能接着看。
        </p>
        <button
          type="button"
          onClick={() => navigate('/books')}
          className="rounded-xl bg-accent px-4 py-2 text-[12px] font-medium text-accent-ink"
        >
          去书架导入
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-0 flex flex-col bg-[#0a0b0d] text-white">
      <header className="relative z-20 flex h-14 shrink-0 items-center gap-1 px-2 sm:px-4">
        <button
          type="button"
          onClick={() => navigate('/books')}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="返回书架"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-[10px] uppercase tracking-[0.16em] text-white/40">Comic</p>
          <p className="truncate text-[12px] text-white/80">{book.title}</p>
        </div>
        <button
          type="button"
          onClick={() => setFit((current) => (current === 'contain' ? 'width' : 'contain'))}
          className="hidden h-9 items-center rounded-full px-3 text-[11px] text-white/60 transition-colors hover:bg-white/10 hover:text-white sm:flex"
        >
          {fit === 'contain' ? '适应高度' : '适应宽度'}
        </button>
        <button
          type="button"
          onClick={() => void toggleDirection()}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={direction === 'rtl' ? '当前右到左，点击切换' : '当前左到右，点击切换'}
          title={direction === 'rtl' ? '右 → 左（日漫）' : '左 → 右'}
        >
          <ArrowLeftRight size={17} />
        </button>
        <button
          type="button"
          onClick={() => setGridOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="页码"
        >
          <LayoutGrid size={17} />
        </button>
      </header>

      <main
        className="relative min-h-0 flex-1 overflow-hidden"
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
          if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.3) {
            if (dx < 0) goNext()
            else goPrev()
          }
        }}
      >
        <div
          className={cn(
            'h-full w-full',
            fit === 'width' ? 'overflow-y-auto' : 'flex items-center justify-center overflow-hidden',
            fit === 'contain' && 'p-2 sm:p-4',
          )}
        >
          {url ? (
            <img
              src={url}
              alt={`${book.title} 第 ${page + 1} 页`}
              className={cn(
                'select-none',
                fit === 'contain'
                  ? 'max-h-full max-w-full object-contain'
                  : 'mx-auto block w-full max-w-none',
              )}
              draggable={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center gap-2 text-[12px] text-white/45">
              <Loader2 size={16} className="animate-spin" />
              正在加载…
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={direction === 'rtl' ? goNext : goPrev}
          className="absolute inset-y-0 left-0 z-10 w-[14%] cursor-w-resize"
          aria-label={direction === 'rtl' ? '下一页' : '上一页'}
        />
        <button
          type="button"
          onClick={direction === 'rtl' ? goPrev : goNext}
          className="absolute inset-y-0 right-0 z-10 w-[14%] cursor-e-resize"
          aria-label={direction === 'rtl' ? '上一页' : '下一页'}
        />
      </main>

      <footer className="relative z-20 shrink-0 border-t border-white/10 px-3 pb-3 pt-2 sm:px-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={page <= 0}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
            aria-label="上一页"
          >
            <ChevronLeft size={18} />
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(total - 1, 0)}
            value={page}
            onChange={(event) => setPage(Number(event.target.value))}
            className="h-1 w-full flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-[var(--accent)]"
            style={{
              background: `linear-gradient(to right, var(--accent) ${percent}%, rgba(255,255,255,.15) ${percent}%)`,
            }}
            aria-label="翻页"
          />
          <button
            type="button"
            onClick={goNext}
            disabled={page >= total - 1}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
            aria-label="下一页"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-white/40">
          <span>{book.title}</span>
          <span className="tabular-nums">
            {page + 1} / {total || '?'} · {percent.toFixed(1)}%
          </span>
        </div>
      </footer>

      {gridOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
          <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Pages</p>
              <h2 className="font-display text-lg text-white">页码</h2>
            </div>
            <button
              type="button"
              onClick={() => setGridOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="关闭页码"
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid flex-1 auto-rows-min grid-cols-5 gap-2 overflow-y-auto p-4 sm:grid-cols-8 lg:grid-cols-12">
            {Array.from({ length: total }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setPage(index)
                  setGridOpen(false)
                }}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-lg border text-[12px] tabular-nums transition-colors',
                  index === page
                    ? 'border-accent bg-accent text-accent-ink'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white',
                )}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
