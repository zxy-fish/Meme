import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, FileText, Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FloatingAction } from '@/components/ui/FloatingAction'
import { EmptyState } from '@/components/ui/EmptyState'
import { db } from '@/lib/db'
import { deleteBook, importTxtBook } from '@/lib/repo'
import type { Book } from '@/lib/types'
import { cn, gradientFor } from '@/lib/utils'
import { toast } from '@/store/toast'

function BookCover({ book }: { book: Book }) {
  return (
    <div
      className="relative aspect-[3/4] overflow-hidden rounded-xl text-white shadow-[0_18px_40px_-22px_rgba(0,0,0,0.9)]"
      style={{ backgroundImage: gradientFor(book.title) }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/5" />
      <div className="absolute inset-y-0 left-0 w-[3px] bg-black/25" />
      <div className="flex h-full flex-col justify-between p-3.5">
        <span className="text-[8px] uppercase tracking-[0.24em] text-white/50">Meme Reader</span>
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
  const inputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [confirmId, setConfirmId] = useState<string>()

  const all = books ?? []
  const reading = all.filter((book) => (book.percent ?? 0) > 0 && (book.percent ?? 0) < 100)

  async function handleFile(file?: File) {
    if (!file) return
    if (!/\.txt$/i.test(file.name)) {
      toast('目前支持 TXT，EPUB 马上来', 'error')
      return
    }
    if (file.size > 60 * 1024 * 1024) {
      toast('文件有点大，先换一本试试', 'error')
      return
    }
    setImporting(true)
    try {
      const book = await importTxtBook(file)
      toast(`《${book.title}》导入成功`, 'success')
      navigate(`/read/${book.id}`)
    } catch (error) {
      console.error(error)
      toast('导入失败，可能是编码或文件格式问题', 'error')
    } finally {
      setImporting(false)
      if (inputRef.current) inputRef.current.value = ''
    }
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
        void handleFile(event.dataTransfer.files?.[0])
      }}
    >
      <header className="-mx-4 -mt-6 rounded-b-[2rem] px-4 pb-2 pt-6 sm:-mx-6 sm:px-6 lg:-mx-10 lg:-mt-10 lg:px-10 lg:pt-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-accent">
              Reading
            </p>
            <h1 className="mt-2 font-display text-[34px] font-semibold leading-[1.1] tracking-wide text-ink sm:text-[44px]">
              我的书架
            </h1>
            <p className="mt-2 text-[13px] text-muted">
              共 {all.length} 本
              {reading.length ? ` · ${reading.length} 本在读` : ''}
              {all.length ? ' · 支持 TXT 导入' : ''}
            </p>
          </div>
          <Button
            variant="primary"
            className="mt-1 hidden sm:inline-flex"
            onClick={() => inputRef.current?.click()}
            disabled={importing}
          >
            {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            导入 TXT
          </Button>
        </div>
      </header>

      <input
        ref={inputRef}
        type="file"
        accept=".txt,text/plain"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      <div className="mt-7">
        {books === undefined ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="aspect-[3/4] animate-pulse rounded-xl bg-surface-2" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-surface-2" />
              </div>
            ))}
          </div>
        ) : all.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {all.map((book, index) => (
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
                      {book.chapterCount} 章 · {book.percent ? `${book.percent}%` : '未开始'}
                    </p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.max(book.percent ?? 0, 1)}%` }}
                      />
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => void remove(book)}
                  className={cn(
                    'absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white/70 backdrop-blur-md transition-all',
                    confirmId === book.id
                      ? 'bg-danger text-white opacity-100'
                      : 'opacity-0 hover:bg-black/60 hover:text-white group-hover:opacity-100',
                  )}
                  aria-label="删除书籍"
                >
                  <Trash2 size={12} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="书架还是空的"
            description="把 TXT 小说拖进来，或者点右上角导入。会自动识别章节和编码，排版按纸书来。"
            action={
              <Button variant="primary" onClick={() => inputRef.current?.click()}>
                <FileText size={15} /> 导入第一本书
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
          把 TXT 拖到这里也可以导入
        </p>
        <p className="mt-1 text-[10.5px] text-faint">
          自动识别 UTF-8 / GBK / GB18030 / Big5 · 大文件按章节加载
        </p>
      </div>

      <FloatingAction onClick={() => inputRef.current?.click()} label="导入 TXT">
        {importing ? <Loader2 size={19} className="animate-spin" /> : <Plus size={20} />}
      </FloatingAction>
    </div>
  )
}
