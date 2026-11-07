import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Filter, LibraryBig, Plus, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FloatingAction } from '@/components/ui/FloatingAction'
import { Cover } from '@/components/ui/Cover'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Input'
import { MediaCard } from '@/components/media/MediaCard'
import { MediaDialog } from '@/components/media/MediaDialog'
import { countryName, decadeKey, decadeLabel, decadeRank, regionLabel } from '@/lib/countries'
import { db } from '@/lib/db'
import {
  MEDIA_TYPES,
  STATUS_LABELS,
  STATUS_ORDER,
  TYPE_LABELS,
  UNIT_LABELS,
  type MediaItem,
  type MediaStatus,
  type MediaType,
} from '@/lib/types'
import { cn, percentOf } from '@/lib/utils'

type SortKey = 'updated' | 'rating' | 'year' | 'title'

export function LibraryPage() {
  const items = useLiveQuery(
    async () => (await db.media.toArray()).filter((item) => !item.deletedAt),
    [],
  )
  const [query, setQuery] = useState('')
  const [type, setType] = useState<MediaType | 'all'>('all')
  const [status, setStatus] = useState<MediaStatus | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('updated')
  const [country, setCountry] = useState<string>('all')
  const [decade, setDecade] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<'none' | 'decade' | 'country' | 'type'>('none')
  const [addOpen, setAddOpen] = useState(false)

  const all = items ?? []
  const doing = all.filter((item) => item.status === 'doing')
  const featured = doing[0]
  const isFiltering =
    Boolean(query.trim()) || type !== 'all' || status !== 'all' || country !== 'all' || decade !== 'all'

  const counts = useMemo(() => {
    const map = new Map<MediaType, number>()
    for (const item of all) map.set(item.type, (map.get(item.type) ?? 0) + 1)
    return map
  }, [all])

  const countryCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of all) {
      const key = item.country ?? 'unknown'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [all])

  const decadeCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of all) {
      const key = decadeKey(item.year)
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [all])

  const countryOptions = useMemo(
    () => [...countryCounts.entries()].sort((a, b) => b[1] - a[1]),
    [countryCounts],
  )
  const decadeOptions = useMemo(
    () => [...decadeCounts.keys()].sort((a, b) => decadeRank(a) - decadeRank(b)),
    [decadeCounts],
  )

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const result = all.filter((item) => {
      if (type !== 'all' && item.type !== type) return false
      if (status !== 'all' && item.status !== status) return false
      if (country !== 'all' && (item.country ?? 'unknown') !== country) return false
      if (decade !== 'all' && decadeKey(item.year) !== decade) return false
      if (!keyword) return true
      return [
        item.title,
        item.originalTitle,
        item.synopsis,
        ...item.tags,
        regionLabel(item.type, item.country),
        countryName(item.country),
        decadeLabel(decadeKey(item.year)),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    })
    return result.sort((a, b) => {
      if (sort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0)
      if (sort === 'year') return (b.year ?? 0) - (a.year ?? 0)
      if (sort === 'title') return a.title.localeCompare(b.title, 'zh-CN')
      return b.updatedAt - a.updatedAt
    })
  }, [all, query, type, status, country, decade, sort])

  const groups = useMemo(() => {
    if (groupBy === 'none') return []
    const map = new Map<string, MediaItem[]>()
    for (const item of filtered) {
      const key =
        groupBy === 'decade'
          ? decadeKey(item.year)
          : groupBy === 'country'
            ? (item.country ?? 'unknown')
            : item.type
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    const entries = [...map.entries()]
    entries.sort((a, b) => {
      if (groupBy === 'decade') return decadeRank(a[0]) - decadeRank(b[0])
      if (groupBy === 'type') {
        const order = MEDIA_TYPES.findIndex((entry) => entry.value === a[0])
        const other = MEDIA_TYPES.findIndex((entry) => entry.value === b[0])
        return order - other
      }
      return b[1].length - a[1].length
    })
    return entries.map(([key, list]) => ({
      key,
      items: list,
      label:
        groupBy === 'decade'
          ? decadeLabel(key)
          : groupBy === 'country'
            ? key === 'unknown'
              ? '地区未标'
              : countryName(key)
            : TYPE_LABELS[key as MediaType],
    }))
  }, [filtered, groupBy])

  const showFeatured = !isFiltering && groupBy === 'none'

  return (
    <div className="animate-fade-up">
      <header className="-mx-4 -mt-6 rounded-b-[2rem] px-4 pb-2 pt-6 sm:-mx-6 sm:px-6 lg:-mx-10 lg:-mt-10 lg:px-10 lg:pt-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-accent">
              Your library
            </p>
            <h1 className="mt-2 font-display text-[34px] font-semibold leading-[1.1] tracking-wide text-ink sm:text-[44px]">
              我的媒体库
            </h1>
            <p className="mt-2 text-[13px] text-muted">
              共 {all.length} 部作品
              {doing.length ? ` · ${doing.length} 部在看` : ''}
              {all.filter((item) => item.status === 'wish').length
                ? ` · ${all.filter((item) => item.status === 'wish').length} 部想看`
                : ''}
            </p>
          </div>
          <Button variant="primary" onClick={() => setAddOpen(true)} className="mt-1 hidden sm:inline-flex">
            <Plus size={16} />
            添加条目
          </Button>
        </div>

        {showFeatured && featured ? (
          <Link
            to={`/item/${featured.id}`}
            className="group relative mt-6 block overflow-hidden rounded-3xl border border-line bg-surface/60"
          >
            <img
              src={featured.cover}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-2xl transition-transform duration-700 group-hover:scale-125"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-app via-app/80 to-app/20" />
            <div className="relative flex items-center gap-4 p-4 sm:gap-6 sm:p-5">
              <Cover
                src={featured.cover}
                title={featured.title}
                eager
                className="h-[132px] w-[90px] shrink-0 sm:h-[156px] sm:w-[106px]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-accent">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                  正在追
                </div>
                <h2 className="mt-1.5 truncate font-display text-2xl font-semibold text-ink sm:text-3xl">
                  {featured.title}
                </h2>
                <p className="mt-1 truncate text-[12px] text-muted">
                  {[
                    featured.originalTitle,
                    featured.year,
                    featured.country ? regionLabel(featured.type, featured.country) : TYPE_LABELS[featured.type],
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <div className="mt-3 max-w-md">
                  <div className="flex items-center justify-between text-[11px] text-ink-soft">
                    <span>
                      看到第 {featured.progressCurrent} / {featured.progressTotal ?? '?'}{' '}
                      {UNIT_LABELS[featured.progressUnit]}
                    </span>
                    <span className="tabular-nums text-muted">
                      {percentOf(featured.progressCurrent, featured.progressTotal)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{
                        width: `${Math.max(percentOf(featured.progressCurrent, featured.progressTotal), 3)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="hidden shrink-0 items-center gap-2 text-[12px] text-ink-soft sm:flex">
                继续观看
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface-2 transition-colors group-hover:border-accent/40 group-hover:text-accent">
                  <Sparkles size={14} />
                </span>
              </div>
            </div>
          </Link>
        ) : null}
      </header>

      <div className="mt-7 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题、标签、简介…"
              className="h-10 bg-surface pl-9"
            />
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Filter size={14} className="text-faint" />
            <Select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="h-10 w-[118px] bg-surface"
            >
              <option value="updated">最近更新</option>
              <option value="rating">评分最高</option>
              <option value="year">年份最新</option>
              <option value="title">标题排序</option>
            </Select>
          </div>
        </div>

        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          <button
            type="button"
            onClick={() => setType('all')}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-[12px] transition-colors',
              type === 'all'
                ? 'bg-ink text-app'
                : 'border border-line bg-surface text-muted hover:text-ink',
            )}
          >
            全部
            <span className="ml-1.5 text-[10px] opacity-60">{all.length}</span>
          </button>
          {MEDIA_TYPES.map((entry) => {
            const count = counts.get(entry.value) ?? 0
            return (
              <button
                key={entry.value}
                type="button"
                onClick={() => setType(entry.value)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-[12px] transition-colors',
                  type === entry.value
                    ? 'bg-ink text-app'
                    : 'border border-line bg-surface text-muted hover:text-ink',
                )}
              >
                {entry.label}
                {count ? <span className="ml-1.5 text-[10px] opacity-60">{count}</span> : null}
              </button>
            )
          })}
        </div>

        <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto border-b border-line px-1">
          <button
            type="button"
            onClick={() => setStatus('all')}
            className={cn(
              'relative shrink-0 pb-2.5 pt-1 text-[12.5px] transition-colors',
              status === 'all' ? 'text-ink' : 'text-muted hover:text-ink-soft',
            )}
          >
            全部
            {status === 'all' ? <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" /> : null}
          </button>
          {STATUS_ORDER.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setStatus(entry)}
              className={cn(
                'relative shrink-0 pb-2.5 pt-1 text-[12.5px] transition-colors',
                status === entry ? 'text-ink' : 'text-muted hover:text-ink-soft',
              )}
            >
              {STATUS_LABELS[entry]}
              {status === entry ? (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Select
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="h-9 w-full bg-surface text-[12px] sm:w-[132px]"
            aria-label="按国家或地区筛选"
          >
            <option value="all">全部地区</option>
            {countryOptions.map(([code, count]) => (
              <option key={code} value={code}>
                {code === 'unknown' ? '地区未标' : countryName(code)}（{count}）
              </option>
            ))}
          </Select>
          <Select
            value={decade}
            onChange={(event) => setDecade(event.target.value)}
            className="h-9 w-full bg-surface text-[12px] sm:w-[132px]"
            aria-label="按年代筛选"
          >
            <option value="all">全部年代</option>
            {decadeOptions.map((key) => (
              <option key={key} value={key}>
                {decadeLabel(key)}（{decadeCounts.get(key) ?? 0}）
              </option>
            ))}
          </Select>
          <Select
            value={groupBy}
            onChange={(event) => setGroupBy(event.target.value as typeof groupBy)}
            className="h-9 w-full bg-surface text-[12px] sm:w-[138px]"
            aria-label="分组方式"
          >
            <option value="none">不分组</option>
            <option value="decade">按年代分组</option>
            <option value="country">按国家分组</option>
            <option value="type">按类型分组</option>
          </Select>
          {country !== 'all' || decade !== 'all' || groupBy !== 'none' ? (
            <button
              type="button"
              onClick={() => {
                setCountry('all')
                setDecade('all')
                setGroupBy('none')
              }}
              className="col-span-3 h-9 rounded-lg px-2 text-[11.5px] text-muted transition-colors hover:text-ink sm:col-auto"
            >
              重置分类
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        {items === undefined ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="space-y-2.5">
                <div className="aspect-[2/3] animate-pulse rounded-2xl bg-surface-2" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-surface-2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          isFiltering ? (
            <EmptyState
              icon={Search}
              title="没有匹配的条目"
              description="换个关键词，或者把筛选条件清掉看看。"
              action={
                <Button
                  onClick={() => {
                    setQuery('')
                    setType('all')
                    setStatus('all')
                    setCountry('all')
                    setDecade('all')
                    setGroupBy('none')
                  }}
                >
                  清空筛选
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={LibraryBig}
              title="媒体库还是空的"
              description="把看过的、在看的、想看的一次收进来。搜索标题就能自动补全封面、CV、地区和年代。"
              action={
                <Button variant="primary" onClick={() => setAddOpen(true)}>
                  <Plus size={15} /> 添加第一个条目
                </Button>
              }
            />
          )
        ) : groupBy !== 'none' ? (
          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.key}>
                <div className="mb-3 flex items-baseline gap-2 border-b border-line pb-2">
                  <h2 className="font-display text-xl font-semibold tracking-wide text-ink">
                    {group.label}
                  </h2>
                  <span className="text-[11px] text-faint">{group.items.length} 部</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                  {group.items.map((item, index) => (
                    <MediaCard key={item.id} item={item} index={index} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {filtered.map((item: MediaItem, index) => (
              <MediaCard key={item.id} item={item} index={index} />
            ))}
          </div>
        )}
      </div>

      <FloatingAction onClick={() => setAddOpen(true)} label="添加条目">
        <Plus size={20} />
      </FloatingAction>

      <MediaDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultType={type === 'all' ? 'anime' : type}
      />
    </div>
  )
}
