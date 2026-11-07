import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  Calendar,
  BookOpen,
  Check,
  ExternalLink,
  Heart,
  Minus,
  Pencil,
  Plus,
  Tv,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Cover } from '@/components/ui/Cover'
import { EmptyState } from '@/components/ui/EmptyState'
import { MediaDialog } from '@/components/media/MediaDialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { countryName, regionLabel } from '@/lib/countries'
import { yearKey, yearLabel } from '@/lib/years'
import { db } from '@/lib/db'
import { bumpProgress, toggleFavorite, updateMedia } from '@/lib/repo'
import {
  STATUS_LABELS,
  STATUS_ORDER,
  TYPE_LABELS,
  UNIT_LABELS,
  type MediaStatus,
} from '@/lib/types'
import { cn, percentOf } from '@/lib/utils'
import { toast } from '@/store/toast'

type Tab = 'synopsis' | 'characters' | 'read' | 'notes' | 'info'

export function MediaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const item = useLiveQuery(async () => {
    if (!id) return null
    const found = await db.media.get(id)
    return found && !found.deletedAt ? found : null
  }, [id])
  const linkedBooks = useLiveQuery(async () => {
    if (!id) return []
    return (await db.books.filter((book) => book.mediaId === id && !book.deletedAt).toArray())
  }, [id])
  const [tab, setTab] = useState<Tab>('synopsis')
  const [editOpen, setEditOpen] = useState(false)

  if (item === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-24 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-[320px] animate-pulse rounded-3xl bg-surface-2" />
      </div>
    )
  }

  if (!item) {
    return (
      <EmptyState
        icon={Tv}
        title="条目不存在"
        description="可能已经被删除了。"
        action={<Button onClick={() => navigate('/')}>回到媒体库</Button>}
      />
    )
  }

  const progress = percentOf(item.progressCurrent, item.progressTotal)
  const unit = UNIT_LABELS[item.progressUnit]

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: 'synopsis', label: '简介' },
    { value: 'characters', label: '角色', count: item.characters.length || undefined },
    ...(item.type === 'novel' || item.type === 'manga'
      ? [{ value: 'read' as const, label: '阅读', count: linkedBooks?.length || undefined }]
      : []),
    { value: 'notes', label: '笔记' },
    { value: 'info', label: '信息' },
  ]

  async function setStatus(status: MediaStatus) {
    await updateMedia(item!.id, { status })
  }

  async function markDone() {
    await updateMedia(item!.id, {
      status: 'done',
      progressCurrent: item!.progressTotal ?? item!.progressCurrent,
    })
    toast('已标记为看过', 'success')
  }

  return (
    <div className="animate-fade-up">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 rounded-lg py-1.5 pr-3 text-[12px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} />
        返回
      </button>

      <section className="relative mt-3 overflow-hidden rounded-3xl border border-line bg-surface/40">
        <img
          src={item.cover}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-3xl"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-app/90 via-app/70 to-app/30" />
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:gap-7 sm:p-7">
          <Cover
            src={item.cover}
            title={item.title}
            eager
            className="mx-auto w-[150px] shrink-0 sm:mx-0 sm:w-[210px]"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-line bg-surface/60 px-2.5 py-1 text-[10.5px] text-muted">
                {TYPE_LABELS[item.type]}
              </span>
              {item.year ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface/60 px-2.5 py-1 text-[10.5px] text-muted">
                  <Calendar size={11} />
                  {item.year}
                </span>
              ) : null}
              {item.country ? (
                <span className="rounded-full border border-line bg-surface/60 px-2.5 py-1 text-[10.5px] text-muted">
                  {regionLabel(item.type, item.country)}
                </span>
              ) : null}
              <StatusBadge status={item.status} size="md" />
              {item.favorite ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[10.5px] text-accent">
                  <Heart size={11} className="fill-accent" /> 收藏
                </span>
              ) : null}
            </div>

            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-wide text-ink sm:text-[42px]">
              {item.title}
            </h1>
            {item.originalTitle ? (
              <p className="mt-1 text-[13px] text-muted">{item.originalTitle}</p>
            ) : null}

            {item.tags.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-ink-soft">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] text-faint">
              <span className="uppercase tracking-[0.14em]">自动分类</span>
              <span className="text-ink-soft">{regionLabel(item.type, item.country)}</span>
              <span>·</span>
              <span className="text-ink-soft">{yearLabel(yearKey(item.year))}</span>
              <span>·</span>
              <span className="text-ink-soft">{TYPE_LABELS[item.type]}</span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <select
                value={item.status}
                onChange={(event) => setStatus(event.target.value as MediaStatus)}
                className="h-9 rounded-lg border border-line bg-surface-2 px-2.5 text-[12px] text-ink"
              >
                {STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant={item.favorite ? 'soft' : 'secondary'}
                onClick={() => toggleFavorite(item.id, !item.favorite)}
              >
                <Heart size={14} className={cn(item.favorite && 'fill-accent')} />
                {item.favorite ? '已收藏' : '收藏'}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                <Pencil size={13} />
                编辑
              </Button>
              {item.status !== 'done' ? (
                <Button size="sm" variant="ghost" onClick={markDone}>
                  <Check size={14} />
                  标记看完
                </Button>
              ) : null}
              {item.sourceUrl ? (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12px] text-muted transition-colors hover:text-accent"
                >
                  <ExternalLink size={13} />
                  来源
                </a>
              ) : null}
            </div>

            <div className="mt-5 max-w-xl rounded-2xl border border-line bg-surface/50 p-3.5">
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-muted">观看进度</span>
                <span className="text-ink-soft">
                  {item.progressCurrent} / {item.progressTotal ?? '?'} {unit}
                </span>
              </div>
              {item.progressTotal ? (
                <input
                  type="range"
                  min={0}
                  max={item.progressTotal}
                  value={item.progressCurrent}
                  onChange={(event) =>
                    updateMedia(item.id, { progressCurrent: Number(event.target.value) })
                  }
                  className="mt-2.5 h-1 w-full cursor-pointer appearance-none rounded-full bg-surface-3 accent-[var(--accent)]"
                  style={{
                    background: `linear-gradient(to right, var(--accent) ${progress}%, var(--surface-3) ${progress}%)`,
                  }}
                />
              ) : null}
              <div className="mt-2 flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => bumpProgress(item.id, -1)}>
                  <Minus size={13} />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => bumpProgress(item.id, 1)}>
                  <Plus size={13} />
                </Button>
                <span className="ml-1 text-[11px] text-faint">{progress}% 完成</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-7 flex gap-5 border-b border-line">
        {tabs.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => setTab(entry.value)}
            className={cn(
              'relative -mb-px pb-3 text-[13px] transition-colors',
              tab === entry.value ? 'text-ink' : 'text-muted hover:text-ink-soft',
            )}
          >
            {entry.label}
            {entry.count ? <span className="ml-1 text-[10px] text-faint">{entry.count}</span> : null}
            {tab === entry.value ? (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent" />
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-6 max-w-4xl">
        {tab === 'synopsis' ? (
          item.synopsis ? (
            <p className="whitespace-pre-wrap text-[14px] leading-[1.95] text-ink-soft">{item.synopsis}</p>
          ) : (
            <p className="text-[13px] text-faint">还没有简介。点「编辑」补一段。</p>
          )
        ) : null}

        {tab === 'characters' ? (
          item.characters.length ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {item.characters.map((character) => (
                <div
                  key={`${character.name}-${character.cv}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface/50 p-3"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2">
                    {character.avatar ? (
                      <img src={character.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-display text-sm text-muted">{character.name.slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] text-ink">{character.name}</span>
                      {character.role === 'main' ? (
                        <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[9px] text-accent">主角</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted">
                      {character.cv ? `CV · ${character.cv}` : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-faint">还没有角色信息。用 Bangumi 搜索添加会自动带出来。</p>
          )
        ) : null}

        {tab === 'read' ? (
          linkedBooks?.length ? (
            <div className="space-y-2">
              {linkedBooks.map((book) => (
                <Link
                  key={book.id}
                  to={`/read/${book.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface/50 p-3 transition-colors hover:border-line-strong hover:bg-surface"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <BookOpen size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-ink">{book.title}</p>
                    <p className="mt-0.5 text-[10.5px] text-faint">
                      {book.format === 'comic' ? '漫画' : book.format === 'pdf' ? 'PDF' : 'TXT'}
                      {' · '}
                      {book.format === 'comic' || book.format === 'pdf'
                        ? `${book.pageCount ?? 0} 页`
                        : `${book.chapterCount} 章`}
                      {' · '}
                      {book.percent ? `${book.percent}%` : '未开始'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[11px] text-ink-soft">
                    继续阅读
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line px-5 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-muted">
                <BookOpen size={22} />
              </div>
              <p className="mt-3 text-[13px] text-ink-soft">还没有关联阅读文件</p>
              <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-faint">
                到书架导入 TXT / PDF / 漫画，导入时关联到《{item.title}》，读到哪里就会自动更新这里的进度。
              </p>
              <Button size="sm" variant="secondary" className="mt-4" onClick={() => navigate('/books')}>
                去书架导入
              </Button>
            </div>
          )
        ) : null}

        {tab === 'notes' ? (
          item.notes ? (
            <div className="rounded-2xl border border-line bg-surface/50 p-4">
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-soft">{item.notes}</p>
              <Button size="sm" variant="ghost" className="mt-3" onClick={() => setEditOpen(true)}>
                <Pencil size={13} /> 修改
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line px-5 py-10 text-center">
              <p className="text-[13px] text-muted">还没有笔记</p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => setEditOpen(true)}>
                写一条
              </Button>
            </div>
          )
        ) : null}

        {tab === 'info' ? (
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-[13px] sm:grid-cols-2">
            {[
              ['类型', TYPE_LABELS[item.type]],
              ['状态', STATUS_LABELS[item.status]],
              ['年份', item.year ? `${item.year} 年` : '—'],
              [
                '国家 / 地区',
                item.country ? `${countryName(item.country)} · ${regionLabel(item.type, item.country)}` : '—',
              ],
              ['评分', item.rating ? `${item.rating.toFixed(1)} / 10` : '未评分'],
              ['制作 / 出版', item.studios.join(' / ') || '—'],
              ['类型标签', item.genres.join(' / ') || '—'],
              ['开始', item.startDate ?? '—'],
              ['结束', item.endDate ?? '—'],
              ['最近更新', new Date(item.updatedAt).toLocaleString('zh-CN')],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4 border-b border-line py-2">
                <dt className="shrink-0 text-muted">{label}</dt>
                <dd className="text-right text-ink-soft">{value}</dd>
              </div>
            ))}
            {item.cast.length ? (
              <div className="col-span-full border-b border-line py-2">
                <dt className="mb-2 text-muted">声优 / 演员</dt>
                <dd className="flex flex-wrap gap-2 text-ink-soft">
                  {item.cast.map((person) => (
                    <span key={`${person.name}-${person.role}`} className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px]">
                      {person.name}
                      {person.role ? <span className="text-faint"> · {person.role}</span> : null}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>

      <MediaDialog open={editOpen} onClose={() => setEditOpen(false)} initial={item} />
    </div>
  )
}
