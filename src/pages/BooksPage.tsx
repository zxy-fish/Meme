import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Archive,
  BookOpen,
  FileText,
  FileType,
  FolderOpen,
  Images,
  Link2,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { FloatingAction } from '@/components/ui/FloatingAction'
import { LinkBookDialog } from '@/components/reader/LinkBookDialog'
import { db } from '@/lib/db'
import { deleteBook, importComicBook, importPdfBook, importTxtBook } from '@/lib/repo'
import type { Book } from '@/lib/types'
import { cn, gradientFor } from '@/lib/utils'
import { toast } from '@/store/toast'

type BookFilter = 'all' | 'novel' | 'comic' | 'pdf'

const FORMAT_LABELS: Record<string, string> = {
  txt: 'TXT',
  epub: 'EPUB',
  pdf: 'PDF',
  comic: '漫画',
}

function ComicThumb({ book }: { book: Book }) {
  const page = useLiveQuery(() => db.pages.get(`${book.id}:0`), [book.id])
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!page) return
    const next = URL.createObjectURL(page.blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [page])
  if (!url) return null
  return (
    <img
      src={url}
      alt=""
      className="absolute inset-0 h-full w-full object-cover opacity-90"
      draggable={false}
    />
  )
}

function BookCover({ book }: { book: Book }) {
  return (
    <div
      className="relative aspect-[3/4] overflow-hidden rounded-xl text-white shadow-[0_18px_40px_-22px_rgba(0,0,0,0.9)]"
      style={{ backgroundImage: gradientFor(book.title) }}
    >
      {book.format === 'comic' ? <ComicThumb book={book} /> : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
      <div className="absolute inset-y-0 left-0 w-[3px] bg-black/25" />
      <div className="relative flex h-full flex-col justify-between p-3.5">
        <div className="flex items-center justify-between">
          <span className="rounded bg-black/40 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.16em] text-white/70 backdrop-blur">
            {FORMAT_LABELS[book.format] ?? book.format}
          </span>
          <span className="text-[8px] uppercase tracking-[0.24em] text-white/45">Meme Reader</span>
        </div>
        <div>
          <h3 className="line-clamp-4 font-display text-[20px] font-semibold leading-snug">
            {book.title}
          </h3>
          {book.author ? (
            <p className="mt-1 line-clamp-1 text-[10px] text-white/55">{book.author}</p>
          ) : null}
        </div>
        <div className="h-px w-7 bg-white/35" />
      </div>
    </div>
  )
}

export function BooksPage() {
  const books = useLiveQuery(
    async () => (await db.books.toArray()).filter((book) => !book.deletedAt),
    [],
  )
  const navigate = useNavigate()
  const txtRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const archiveRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState<string>()
  const [dragOver, setDragOver] = useState(false)
  const [confirmId, setConfirmId] = useState<string>()
  const [filter, setFilter] = useState<BookFilter>('all')
  const [linkTarget, setLinkTarget] = useState<{ book: Book; returnToReader: boolean } | null>(null)

  const all = books ?? []
  const reading = all.filter((book) => (book.percent ?? 0) > 0 && (book.percent ?? 0) < 100)

  const counts = {
    all: all.length,
    novel: all.filter((book) => book.format === 'txt' || book.format === 'epub').length,
    comic: all.filter((book) => book.format === 'comic').length,
    pdf: all.filter((book) => book.format === 'pdf').length,
  }

  const visible = all.filter((book) => {
    if (filter === 'all') return true
    if (filter === 'novel') return book.format === 'txt' || book.format === 'epub'
    return book.format === filter
  })

  async function runImport(kind: string, action: () => Promise<Book>) {
    setImporting(kind)
    try {
      const book = await action()
      toast(`《${book.title}》导入成功`, 'success')
      setLinkTarget({ book, returnToReader: true })
    } catch (error) {
      console.error(error)
      toast((error as Error).message || '导入失败，文件可能不支持', 'error')
    } finally {
      setImporting(undefined)
      for (const ref of [txtRef, pdfRef, archiveRef, imagesRef, folderRef]) {
        if (ref.current) ref.current.value = ''
      }
    }
  }

  function importFiles(files: File[]) {
    if (!files.length) return
    const first = files[0]
    if (/\.txt$/i.test(first.name)) {
      if (first.size > 60 * 1024 * 1024) {
        toast('TXT 太大了，先换一本试试', 'error')
        return
      }
      void runImport('TXT', () => importTxtBook(first))
      return
    }
    if (/\.pdf$/i.test(first.name)) {
      if (first.size > 300 * 1024 * 1024) {
        toast('PDF 超过 300MB，先换一个试试', 'error')
        return
      }
      void runImport('PDF', () => importPdfBook(first))
      return
    }
    if (/\.(zip|cbz)$/i.test(first.name)) {
      if (first.size > 500 * 1024 * 1024) {
        toast('压缩包超过 500MB，先换一个试试', 'error')
        return
      }
      void runImport('漫画', () => importComicBook({ archive: first }))
      return
    }
    if (files.some((file) => /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(file.name))) {
      void runImport('漫画', () => importComicBook({ files }))
      return
    }
    toast('支持 TXT、PDF、ZIP/CBZ 漫画或图片文件夹', 'error')
  }

  async function remove(book: Book) {
    if (confirmId !== book.id) {
      setConfirmId(book.id)
      window.setTimeout(() => setConfirmId(undefined), 3000)
      toast('再点一次删除这本书')
      return
    }
    await deleteBook(book.id)
    setConfirmId(undefined)
    toast('已移除', 'success')
  }

  const filterTabs: { value: BookFilter; label: string; count: number }[] = [
    { value: 'all', label: '全部', count: counts.all },
    { value: 'novel', label: '小说', count: counts.novel },
    { value: 'comic', label: '漫画', count: counts.comic },
    { value: 'pdf', label: 'PDF', count: counts.pdf },
  ]

  return (
    <div
      className={cn('animate-fade-up', dragOver && 'rounded-3xl ring-2 ring-accent/60')}
      onDragOver={(event) => {
        event.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragOver(false)
        importFiles(Array.from(event.dataTransfer.files))
      }}
    >
      <header className="-mx-4 -mt-6 rounded-b-[2rem] px-4 pb-2 pt-6 sm:-mx-6 sm:px-6 lg:-mx-10 lg:-mt-10 lg:px-10 lg:pt-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-accent">Reading</p>
            <h1 className="mt-2 font-display text-[34px] font-semibold leading-[1.1] tracking-wide text-ink sm:text-[44px]">
              我的书架
            </h1>
            <p className="mt-2 text-[13px] text-muted">
              共 {all.length} 本
              {reading.length ? ` · ${reading.length} 本在读` : ''}
              {' · '}TXT / PDF / 漫画
            </p>
          </div>
          <Button
            variant="primary"
            className="mt-1 hidden sm:inline-flex"
            onClick={() => setImportOpen(true)}
            disabled={Boolean(importing)}
          >
            {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {importing ? importing : '导入'}
          </Button>
        </div>
      </header>

      <input
        ref={txtRef}
        type="file"
        accept=".txt,text/plain"
        className="hidden"
        onChange={(event) => importFiles(Array.from(event.target.files ?? []))}
      />
      <input
        ref={pdfRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(event) => importFiles(Array.from(event.target.files ?? []))}
      />
      <input
        ref={archiveRef}
        type="file"
        accept=".zip,.cbz,application/zip"
        className="hidden"
        onChange={(event) => importFiles(Array.from(event.target.files ?? []))}
      />
      <input
        ref={imagesRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => importFiles(Array.from(event.target.files ?? []))}
      />
      <input
        ref={folderRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
        onChange={(event) => importFiles(Array.from(event.target.files ?? []))}
      />

      <div className="mt-7 flex items-center gap-2 overflow-x-auto pb-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-[12px] transition-colors',
              filter === tab.value
                ? 'bg-ink text-app'
                : 'border border-line bg-surface text-muted hover:text-ink',
            )}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px] opacity-60">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-5">
        {books === undefined ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="aspect-[3/4] animate-pulse rounded-xl bg-surface-2" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-surface-2" />
              </div>
            ))}
          </div>
        ) : visible.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {visible.map((book, index) => (
              <article
                key={book.id}
                className="group relative animate-fade-up"
                style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
              >
                <Link to={`/read/${book.id}`} className="block">
                  <BookCover book={book} />
                  <div className="mt-2.5 px-0.5">
                    <h3 className="truncate text-[13px] font-medium text-ink transition-colors group-hover:text-accent">
                      {book.title}
                    </h3>
                    <p className="mt-0.5 truncate text-[10.5px] text-faint">
                      {book.format === 'txt' || book.format === 'epub'
                        ? `${book.chapterCount} 章`
                        : `${book.pageCount ?? 0} 页`}
                      {' · '}
                      {book.percent ? `${book.percent}%` : '未开始'}
                    </p>
                    {book.mediaId ? (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-teal/10 px-1.5 py-0.5 text-[9px] text-teal">
                        <Link2 size={9} /> 已关联媒体库
                      </p>
                    ) : null}
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.max(book.percent ?? 0, 1)}%` }}
                      />
                    </div>
                  </div>
                </Link>
                <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setLinkTarget({ book, returnToReader: false })}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white/70 backdrop-blur-md transition-colors hover:bg-teal hover:text-white"
                    aria-label="关联媒体库"
                    title="关联媒体库"
                  >
                    <Link2 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(book)}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white/70 backdrop-blur-md transition-colors',
                      confirmId === book.id
                        ? 'bg-danger text-white'
                        : 'hover:bg-black/70 hover:text-white',
                    )}
                    aria-label="删除书籍"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title={all.length ? '这个分类还是空的' : '书架还是空的'}
            description={
              all.length
                ? '换一个分类，或者导入新的文件。'
                : '把 TXT / PDF 小说、漫画 ZIP/CBZ 或图片文件夹拖进来；导入后可以关联到媒体库条目。'
            }
            action={
              <Button variant="primary" onClick={() => setImportOpen(true)}>
                <Upload size={15} /> 导入文件
              </Button>
            }
          />
        )}
      </div>

      <div
        className={cn(
          'mt-8 rounded-2xl border border-dashed border-line px-5 py-6 text-center transition-colors',
          dragOver && 'border-accent bg-accent-soft',
        )}
      >
        <p className="text-[12.5px] text-muted">
          <Upload size={14} className="mr-1.5 inline" />
          把 TXT / PDF / ZIP / CBZ / 图片拖到这里
        </p>
        <p className="mt-1 text-[10.5px] text-faint">
          TXT 自动识别 UTF-8 / GBK / GB18030 / Big5 · 漫画支持文件夹、ZIP、CBZ · PDF 逐页渲染
        </p>
      </div>

      <FloatingAction onClick={() => setImportOpen(true)} label="导入文件">
        {importing ? <Loader2 size={19} className="animate-spin" /> : <Plus size={20} />}
      </FloatingAction>

      <Dialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="导入文件"
        description="TXT / PDF / 漫画；导入后可以关联到媒体库条目，阅读进度会写回。"
        size="md"
      >
        <div className="grid gap-2">
          {[
            {
              icon: FileText,
              title: 'TXT 小说',
              hint: '自动识别编码和章节',
              action: () => txtRef.current?.click(),
            },
            {
              icon: FileType,
              title: 'PDF',
              hint: '逐页渲染，支持整页 / 适宽',
              action: () => pdfRef.current?.click(),
            },
            {
              icon: Archive,
              title: '漫画 ZIP / CBZ',
              hint: '压缩包里的图片按文件名排序',
              action: () => archiveRef.current?.click(),
            },
            {
              icon: Images,
              title: '漫画图片',
              hint: '一次选择多张图片',
              action: () => imagesRef.current?.click(),
            },
            {
              icon: FolderOpen,
              title: '漫画文件夹',
              hint: '目录里的图片按文件名排序',
              action: () => folderRef.current?.click(),
            },
          ].map((option) => (
            <button
              key={option.title}
              type="button"
              onClick={() => {
                setImportOpen(false)
                window.setTimeout(() => option.action(), 80)
              }}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/40 px-3 py-3 text-left transition-colors hover:border-line-strong hover:bg-surface-2"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-accent">
                <option.icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-ink">{option.title}</span>
                <span className="mt-0.5 block text-[10.5px] text-faint">{option.hint}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-faint">
          漫画默认按日漫「右 → 左」翻页；打开后可以切换方向。PDF 和漫画文件不会同步正文，只同步书架进度；
          在另一台设备导入同一个文件会合并成同一本。
        </p>
      </Dialog>

      <LinkBookDialog
        book={linkTarget?.book ?? null}
        open={Boolean(linkTarget)}
        onClose={() => setLinkTarget(null)}
        onLinked={(book) => {
          if (linkTarget?.returnToReader) navigate(`/read/${book.id}`)
        }}
      />
    </div>
  )
}
