import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bookmark as BookmarkIcon, ExternalLink, Globe2, Pencil, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FloatingAction } from '@/components/ui/FloatingAction'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { BookmarkDialog } from '@/components/bookmarks/BookmarkDialog'
import { db } from '@/lib/db'
import type { Bookmark } from '@/lib/types'
import { cn, gradientFor, groupTags, hostname } from '@/lib/utils'

function Favicon({ url, title }: { url: string; title: string }) {
  const [failed, setFailed] = useState(false)
  const host = hostname(url)
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-[13px] font-semibold text-white"
      style={{ backgroundImage: gradientFor(host) }}
    >
      {failed ? (
        <span>{title.slice(0, 1).toUpperCase()}</span>
      ) : (
        <img
          src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
          alt=""
          className="h-5 w-5"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

export function BookmarksPage() {
  const bookmarks = useLiveQuery(
    async () => (await db.bookmarks.toArray()).filter((item) => !item.deletedAt),
    [],
  )
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Bookmark>()

  const all = bookmarks ?? []
  const tags = useMemo(() => groupTags(all.flatMap((item) => item.tags)), [all])

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return all
      .filter((item) => {
        if (tag !== 'all' && !item.tags.includes(tag)) return false
        if (!keyword) return true
        return [item.title, item.description, item.url, ...item.tags]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(keyword)
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }, [all, query, tag])

  return (
    <div className="animate-fade-up">
      <header className="-mx-4 -mt-6 rounded-b-[2rem] px-4 pb-2 pt-6 sm:-mx-6 sm:px-6 lg:-mx-10 lg:-mt-10 lg:px-10 lg:pt-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-accent">
              Bookmarks
            </p>
            <h1 className="mt-2 font-display text-[34px] font-semibold leading-[1.1] tracking-wide text-ink sm:text-[44px]">
              网页书签
            </h1>
            <p className="mt-2 text-[13px] text-muted">
              共 {all.length} 个收藏 · {tags.length} 个标签
            </p>
          </div>
          <Button
            variant="primary"
            className="mt-1 hidden sm:inline-flex"
            onClick={() => {
              setEditing(undefined)
              setDialogOpen(true)
            }}
          >
            <Plus size={16} />
            添加书签
          </Button>
        </div>
      </header>

      <div className="mt-7 flex flex-col gap-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、网址、标签…"
            className="h-10 bg-surface pl-9"
          />
        </div>

        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => setTag('all')}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-[12px] transition-colors',
              tag === 'all' ? 'bg-ink text-app' : 'border border-line bg-surface text-muted hover:text-ink',
            )}
          >
            全部
            <span className="ml-1.5 text-[10px] opacity-60">{all.length}</span>
          </button>
          {tags.map((entry) => (
            <button
              key={entry.tag}
              type="button"
              onClick={() => setTag(entry.tag)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-[12px] transition-colors',
                tag === entry.tag
                  ? 'bg-ink text-app'
                  : 'border border-line bg-surface text-muted hover:text-ink',
              )}
            >
              {entry.tag}
              <span className="ml-1.5 text-[10px] opacity-60">{entry.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {bookmarks === undefined ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-2xl bg-surface-2" />
            ))}
          </div>
        ) : filtered.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item, index) => (
              <article
                key={item.id}
                className="group animate-fade-up rounded-2xl border border-line bg-surface/55 p-4 transition-colors hover:border-line-strong hover:bg-surface"
                style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
              >
                <div className="flex items-start gap-3">
                  <Favicon url={item.url} title={item.title} />
                  <div className="min-w-0 flex-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-[13.5px] font-medium text-ink transition-colors hover:text-accent"
                    >
                      {item.title}
                    </a>
                    <p className="mt-0.5 truncate text-[10.5px] text-faint">{hostname(item.url)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(item)
                      setDialogOpen(true)
                    }}
                    className="rounded-lg p-1.5 text-faint opacity-0 transition-all hover:bg-surface-2 hover:text-ink group-hover:opacity-100"
                    aria-label="编辑书签"
                  >
                    <Pencil size={13} />
                  </button>
                </div>

                {item.description ? (
                  <p className="mt-3 line-clamp-2 text-[12px] leading-relaxed text-muted">
                    {item.description}
                  </p>
                ) : (
                  <p className="mt-3 text-[12px] text-faint">—</p>
                )}

                <div className="mt-3.5 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((entry) => (
                      <span key={entry} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-ink-soft">
                        {entry}
                      </span>
                    ))}
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-faint transition-colors hover:border-accent/40 hover:text-accent"
                    aria-label="打开链接"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={tag !== 'all' || query ? Search : BookmarkIcon}
            title={tag !== 'all' || query ? '没有匹配的书签' : '还没有网页收藏'}
            description={
              tag !== 'all' || query
                ? '换一个关键词或标签试试。'
                : '把常看的番剧站、资料站、工具站收进来，用标签分类。'
            }
            action={
              tag !== 'all' || query ? (
                <Button
                  onClick={() => {
                    setQuery('')
                    setTag('all')
                  }}
                >
                  清空筛选
                </Button>
              ) : (
                <Button variant="primary" onClick={() => setDialogOpen(true)}>
                  <Globe2 size={15} /> 添加第一个书签
                </Button>
              )
            }
          />
        )}
      </div>

      <FloatingAction
        onClick={() => {
          setEditing(undefined)
          setDialogOpen(true)
        }}
        label="添加书签"
      >
        <Plus size={20} />
      </FloatingAction>

      <BookmarkDialog open={dialogOpen} onClose={() => setDialogOpen(false)} initial={editing} />
    </div>
  )
}
