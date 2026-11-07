import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, CheckCircle2, Clock3, LibraryBig, Star, Timer, TrendingUp } from 'lucide-react'
import { Cover } from '@/components/ui/Cover'
import { EmptyState } from '@/components/ui/EmptyState'
import { countryName, decadeKey, decadeLabel, decadeRank, regionLabel } from '@/lib/countries'
import { db } from '@/lib/db'
import {
  dayBuckets,
  formatBreakdown,
  formatDuration,
  formatDurationShort,
  localDateKey,
  readingStreak,
  secondsSince,
  topBooks,
} from '@/lib/reading-stats'
import {
  MEDIA_TYPES,
  STATUS_LABELS,
  STATUS_ORDER,
  type BookFormat,
  type MediaStatus,
} from '@/lib/types'
import { cn } from '@/lib/utils'

const FORMAT_LABELS: Record<BookFormat, string> = {
  txt: 'TXT',
  epub: 'EPUB',
  pdf: 'PDF',
  comic: '漫画',
}

const STATUS_COLORS: Record<MediaStatus, string> = {
  doing: 'var(--accent)',
  wish: 'var(--teal)',
  done: 'var(--ok)',
  onhold: 'var(--faint)',
  dropped: 'var(--danger)',
}

function Panel({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-2xl border border-line bg-surface/50 p-5', className)}>
      <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function StatsPage() {
  const media = useLiveQuery(
    async () => (await db.media.toArray()).filter((item) => !item.deletedAt),
    [],
  )
  const books = useLiveQuery(
    async () => (await db.books.toArray()).filter((item) => !item.deletedAt),
    [],
  )
  const sessions = useLiveQuery(async () => db.readingSessions.toArray(), [])

  const all = media ?? []
  const rated = all.filter((item) => item.rating)
  const average = rated.length
    ? (rated.reduce((sum, item) => sum + (item.rating ?? 0), 0) / rated.length).toFixed(1)
    : '—'
  const done = all.filter((item) => item.status === 'done').length
  const doing = all.filter((item) => item.status === 'doing').length
  const topRated = [...rated].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5)

  const decadeCounts = new Map<string, number>()
  const countryCounts = new Map<string, number>()
  for (const item of all) {
    const decade = decadeKey(item.year)
    decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1)
    const region = item.country ?? 'unknown'
    countryCounts.set(region, (countryCounts.get(region) ?? 0) + 1)
  }
  const decades = [...decadeCounts.entries()].sort((a, b) => decadeRank(a[0]) - decadeRank(b[0]))
  const countries = [...countryCounts.entries()].sort((a, b) => b[1] - a[1])

  const statusCounts = STATUS_ORDER.map((status) => ({
    status,
    count: all.filter((item) => item.status === status).length,
  }))
  const statusTotal = all.length || 1

  let cursor = 0
  const donut = statusCounts
    .filter((entry) => entry.count > 0)
    .map((entry) => {
      const from = cursor
      cursor += (entry.count / statusTotal) * 100
      return `${STATUS_COLORS[entry.status]} ${from}% ${cursor}%`
    })
    .join(', ')

  const bookList = books ?? []
  const reading = bookList.filter((book) => (book.percent ?? 0) > 0 && (book.percent ?? 0) < 100)
  const finished = bookList.filter((book) => (book.percent ?? 0) >= 100)

  const allSessions = sessions ?? []
  const today = localDateKey()
  const totalSeconds = allSessions.reduce((sum, session) => sum + session.seconds, 0)
  const todaySeconds = allSessions
    .filter((session) => session.date === today)
    .reduce((sum, session) => sum + session.seconds, 0)
  const weekSeconds = secondsSince(allSessions, 7)
  const monthSeconds = secondsSince(allSessions, 30)
  const streak = readingStreak(allSessions)
  const buckets = dayBuckets(allSessions, 14)
  const chartMax = Math.max(...buckets.map((bucket) => bucket.seconds), 1)
  const readingFormats = formatBreakdown(allSessions)
  const topReadingBooks = topBooks(allSessions, 4)

  const stats = [
    { label: '总条目', value: all.length, icon: LibraryBig, hint: '还在增加' },
    { label: '看过', value: done, icon: CheckCircle2, hint: '已完成' },
    { label: '在看', value: doing, icon: Clock3, hint: '进行中' },
    { label: '平均分', value: average, icon: Star, hint: `${rated.length} 条评分` },
    {
      label: '阅读时长',
      value: formatDurationShort(totalSeconds),
      icon: Timer,
      hint: allSessions.length ? `${allSessions.length} 次阅读` : '还没有记录',
    },
    {
      label: '今日阅读',
      value: formatDurationShort(todaySeconds),
      icon: Timer,
      hint: streak ? `连续 ${streak} 天` : '本地时间',
    },
  ]

  return (
    <div className="animate-fade-up">
      <header className="-mx-4 -mt-6 rounded-b-[2rem] px-4 pb-2 pt-6 sm:-mx-6 sm:px-6 lg:-mx-10 lg:-mt-10 lg:px-10 lg:pt-10">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-accent">Insights</p>
        <h1 className="mt-2 font-display text-[34px] font-semibold leading-[1.1] tracking-wide text-ink sm:text-[44px]">
          统计
        </h1>
        <p className="mt-2 text-[13px] text-muted">看看这些年，你都把时间花在了哪里。</p>
      </header>

      {all.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={TrendingUp}
          title="还没有数据"
          description="添加几条记录，这里就会长成你的年度报告。"
        />
      ) : (
        <>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-line bg-surface/55 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted">{stat.label}</span>
                  <stat.icon size={14} className="text-faint" />
                </div>
                <p className="mt-2.5 font-display text-3xl font-semibold tabular-nums text-ink">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[10px] text-faint">{stat.hint}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Panel title="类型分布">
              <div className="space-y-3.5">
                {MEDIA_TYPES.map((type) => {
                  const count = all.filter((item) => item.type === type.value).length
                  const width = all.length ? Math.round((count / all.length) * 100) : 0
                  return (
                    <div key={type.value}>
                      <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                        <span className="text-ink-soft">{type.label}</span>
                        <span className="tabular-nums text-faint">
                          {count} · {width}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-accent/80"
                          style={{ width: `${Math.max(width, count ? 4 : 0)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>

            <Panel title="状态分布">
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <div
                  className="relative h-32 w-32 shrink-0 rounded-full"
                  style={{ background: donut ? `conic-gradient(${donut})` : 'var(--surface-2)' }}
                >
                  <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-surface">
                    <span className="font-display text-2xl font-semibold text-ink">{all.length}</span>
                    <span className="text-[9px] uppercase tracking-widest text-faint">items</span>
                  </div>
                </div>
                <div className="w-full flex-1 space-y-2.5">
                  {statusCounts.map((entry) => (
                    <div key={entry.status} className="flex items-center gap-2 text-[11.5px]">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: STATUS_COLORS[entry.status] }}
                      />
                      <span className="flex-1 text-muted">{STATUS_LABELS[entry.status]}</span>
                      <span className="tabular-nums text-ink-soft">{entry.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Panel title="年代分布">
              <div className="space-y-3.5">
                {decades.map(([key, count]) => {
                  const width = all.length ? Math.round((count / all.length) * 100) : 0
                  return (
                    <div key={key}>
                      <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                        <span className="text-ink-soft">{decadeLabel(key)}</span>
                        <span className="tabular-nums text-faint">
                          {count} · {width}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-teal/70"
                          style={{ width: `${Math.max(width, count ? 4 : 0)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>

            <Panel title="国家 / 地区">
              <div className="space-y-3.5">
                {countries.map(([code, count]) => {
                  const width = all.length ? Math.round((count / all.length) * 100) : 0
                  return (
                    <div key={code}>
                      <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                        <span className="text-ink-soft">
                          {code === 'unknown' ? '地区未标' : countryName(code)}
                        </span>
                        <span className="tabular-nums text-faint">
                          {count} · {width}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-accent/75"
                          style={{ width: `${Math.max(width, count ? 4 : 0)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>
          </div>

          <Panel title="阅读时间" className="mt-4">
            {allSessions.length ? (
              <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
                <div>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {[
                      { label: '今日', value: formatDuration(todaySeconds) },
                      { label: '本周', value: formatDuration(weekSeconds) },
                      { label: '本月', value: formatDuration(monthSeconds) },
                      { label: '连续', value: `${streak} 天` },
                    ].map((entry) => (
                      <div key={entry.label} className="rounded-xl border border-line bg-surface-2/40 p-3">
                        <p className="text-[10px] text-muted">{entry.label}</p>
                        <p className="mt-1 font-display text-[17px] font-semibold text-ink">
                          {entry.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-[10px] text-faint">
                      <span>最近 14 天</span>
                      <span>{formatDuration(totalSeconds)} 累计</span>
                    </div>
                    <div className="flex h-24 items-end gap-1.5">
                      {buckets.map((bucket) => (
                        <div
                          key={bucket.date}
                          className="group flex h-full flex-1 items-end"
                          title={`${bucket.label} · ${formatDuration(bucket.seconds)}`}
                        >
                          <div
                            className="w-full rounded-t bg-teal/60 transition-colors group-hover:bg-teal"
                            style={{
                              height: `${bucket.seconds ? Math.max(5, (bucket.seconds / chartMax) * 100) : 2}%`,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between text-[9px] text-faint">
                      <span>{buckets[0]?.label}</span>
                      <span>{buckets[Math.floor(buckets.length / 2)]?.label}</span>
                      <span>{buckets.at(-1)?.label}</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-faint">按格式</p>
                    <div className="space-y-2">
                      {readingFormats.map((entry) => (
                        <div key={entry.format} className="flex items-center gap-2 text-[11.5px]">
                          <span className="w-8 shrink-0 text-muted">
                            {FORMAT_LABELS[entry.format] ?? entry.format}
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                            <div
                              className="h-full rounded-full bg-accent/75"
                              style={{
                                width: `${Math.max(4, (entry.seconds / Math.max(totalSeconds, 1)) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="w-20 shrink-0 text-right tabular-nums text-faint">
                            {formatDuration(entry.seconds)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-faint">最常读</p>
                    <div className="space-y-1.5">
                      {topReadingBooks.map((entry) => (
                        <div key={entry.bookId} className="flex items-center gap-2 text-[11.5px]">
                          <span className="min-w-0 flex-1 truncate text-ink-soft">{entry.title}</span>
                          <span className="shrink-0 tabular-nums text-faint">
                            {formatDuration(entry.seconds)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-line px-5 py-10 text-center">
                <Timer size={22} className="mx-auto text-faint" />
                <p className="mt-3 text-[13px] text-ink-soft">还没有阅读记录</p>
                <p className="mt-1 text-[11px] text-faint">
                  打开一本书读几分钟，这里会按天记录阅读时长。
                </p>
              </div>
            )}
          </Panel>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Panel title="评分最高">
              {topRated.length ? (
                <div className="space-y-1">
                  {topRated.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
                      <span className="w-4 text-center font-display text-sm text-faint">{index + 1}</span>
                      <Cover src={item.cover} title={item.title} className="h-14 w-10 shrink-0" rounded="rounded-md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] text-ink">{item.title}</p>
                        <p className="mt-0.5 text-[10px] text-faint">
                          {[regionLabel(item.type, item.country), item.year].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-[12px] font-medium text-accent">
                        <Star size={11} className="fill-accent" />
                        {item.rating?.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-faint">还没有评分。</p>
              )}
            </Panel>

            <Panel title="阅读">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <BookOpen size={22} />
                </div>
                <div>
                  <p className="font-display text-2xl font-semibold text-ink">
                    {bookList.length}
                    <span className="ml-1 text-xs font-normal text-muted">本</span>
                  </p>
                  <p className="text-[10px] text-faint">在书架里</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 border-t border-line pt-3 text-[11.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted">在读</span>
                  <span className="text-ink-soft">{reading.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">读完</span>
                  <span className="text-ink-soft">{finished.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">总章节</span>
                  <span className="text-ink-soft">
                    {bookList.reduce((sum, book) => sum + book.chapterCount, 0)}
                  </span>
                </div>
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}
