import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { db } from '@/lib/db'
import { saveReadingProgress, updateBook } from '@/lib/repo'
import type { Book } from '@/lib/types'
import { clamp, cn } from '@/lib/utils'

export function PdfReader({ book }: { book: Book }) {
  const navigate = useNavigate()
  const data = useLiveQuery(async () => {
    const content = await db.contents.get(book.id)
    return { content: content ?? null }
  }, [book.id])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [document, setDocument] = useState<PDFDocumentProxy>()
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(book.pageCount ?? 0)
  const [fit, setFit] = useState<'page' | 'width'>('page')
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [rendering, setRendering] = useState(false)
  const savedOnce = useRef(false)

  useEffect(() => {
    const element = viewportRef.current
    if (!element) return
    const update = () => {
      const rect = element.getBoundingClientRect()
      setSize({ width: rect.width, height: rect.height })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [document])

  useEffect(() => {
    if (data === undefined) return
    if (!data.content?.blob) {
      setLoading(false)
      setError('这台设备还没有这个 PDF 文件。到书架重新导入同一个 PDF，就能接着读。')
      return
    }
    let cancelled = false
    setLoading(true)
    setError(undefined)
    void (async () => {
      try {
        const { loadPdfDocument } = await import('@/lib/reader/pdf')
        const buffer = await data.content!.blob!.arrayBuffer()
        const loaded = await loadPdfDocument(buffer)
        if (cancelled) return
        setDocument(loaded)
        setPageCount(loaded.numPages)
        setPage(clamp((book.lastPage ?? 0) + 1, 1, loaded.numPages))
        if (!book.pageCount) void updateBook(book.id, { pageCount: loaded.numPages })
      } catch (loadError) {
        console.error(loadError)
        if (!cancelled) setError('这个 PDF 打不开，文件可能损坏或加密了。')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [data, book.id])

  useEffect(() => {
    return () => {
      if (document) void document.cleanup()
    }
  }, [document])

  useEffect(() => {
    const doc = document
    if (!doc || !size.width || !size.height) return
    let cancelled = false
    let task: { cancel: () => void; promise: Promise<void> } | undefined
    setRendering(true)

    void (async () => {
      try {
        const pdfPage = await doc.getPage(page)
        if (cancelled) return
        const base = pdfPage.getViewport({ scale: 1 })
        const maxWidth = Math.max(240, size.width - 24)
        const maxHeight = Math.max(240, size.height - 24)
        const scale =
          fit === 'width'
            ? maxWidth / base.width
            : Math.min(maxWidth / base.width, maxHeight / base.height)
        const viewport = pdfPage.getViewport({ scale: Math.max(0.2, Math.min(scale, 5)) })
        const canvas = canvasRef.current
        if (!canvas) return
        const ratio = window.devicePixelRatio || 1
        canvas.width = Math.floor(viewport.width * ratio)
        canvas.height = Math.floor(viewport.height * ratio)
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        const context = canvas.getContext('2d')
        if (!context) return
        context.setTransform(ratio, 0, 0, ratio, 0, 0)
        task = pdfPage.render({ canvas, canvasContext: context, viewport })
        await task.promise
      } catch (renderError) {
        if (!cancelled) console.warn('[meme] pdf render failed', renderError)
      } finally {
        if (!cancelled) setRendering(false)
      }
    })()

    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [document, page, fit, size])

  useEffect(() => {
    if (!pageCount) return
    if (!savedOnce.current) {
      // Opening a PDF on its saved page shouldn't race a quick page turn.
      savedOnce.current = true
      return
    }
    void saveReadingProgress(book.id, 0, page - 1, (page / pageCount) * 100)
  }, [book.id, page, pageCount])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault()
        setPage((current) => Math.max(1, current - 1))
      } else if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault()
        setPage((current) => Math.min(pageCount || current, current + 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pageCount])

  const percent = pageCount ? (page / pageCount) * 100 : 0

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
          <p className="truncate text-[10px] uppercase tracking-[0.16em] text-white/40">PDF</p>
          <p className="truncate text-[12px] text-white/80">{book.title}</p>
        </div>
        <button
          type="button"
          onClick={() => setFit((current) => (current === 'page' ? 'width' : 'page'))}
          className="flex h-9 items-center rounded-full px-3 text-[11px] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          {fit === 'page' ? '整页' : '适宽'}
        </button>
      </header>

      <main ref={viewportRef} className="relative min-h-0 flex-1 overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-[12px] text-white/45">
            <Loader2 size={16} className="animate-spin" />
            正在打开 PDF…
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="max-w-sm text-[12px] leading-relaxed text-white/60">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/books')}
              className="rounded-xl bg-accent px-4 py-2 text-[12px] font-medium text-accent-ink"
            >
              去书架导入
            </button>
          </div>
        ) : (
          <div className="flex h-full w-full overflow-auto p-2 sm:p-4">
            <div className="m-auto">
              <canvas ref={canvasRef} className="rounded-sm bg-white shadow-2xl" />
            </div>
          </div>
        )}
        {rendering && !loading ? (
          <div className="absolute right-4 top-3 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[10px] text-white/50 backdrop-blur">
            <Loader2 size={11} className="animate-spin" />
            渲染中
          </div>
        ) : null}
      </main>

      <footer className="relative z-20 shrink-0 border-t border-white/10 px-3 pb-3 pt-2 sm:px-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
            aria-label="上一页"
          >
            <ChevronLeft size={18} />
          </button>
          <input
            type="range"
            min={1}
            max={Math.max(pageCount, 1)}
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
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            disabled={page >= pageCount}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
            aria-label="下一页"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-white/40">
          <span className="truncate">{book.title}</span>
          <span className="tabular-nums">
            {page} / {pageCount || '?'} · {percent.toFixed(1)}%
          </span>
        </div>
      </footer>
    </div>
  )
}
