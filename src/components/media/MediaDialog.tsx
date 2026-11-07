import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Plus, Search, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Cover } from '@/components/ui/Cover'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { RatingPicker } from '@/components/ui/StatusBadge'
import { createMedia, deleteMedia, updateMedia } from '@/lib/repo'
import {
  fetchMetadata,
  providerLabel,
  searchMetadata,
  type MetaSearchResult,
  type ProviderId,
} from '@/lib/metadata'
import {
  MEDIA_TYPES,
  STATUS_LABELS,
  STATUS_ORDER,
  UNIT_LABELS,
  emptyMedia,
  type Character,
  type ExternalIds,
  type MediaItem,
  type MediaStatus,
  type MediaType,
  type Person,
  type ProgressUnit,
} from '@/lib/types'
import { cn, parseTags } from '@/lib/utils'
import { useSettings } from '@/store/settings'
import { toast } from '@/store/toast'

interface FormState {
  type: MediaType
  title: string
  originalTitle: string
  cover: string
  year: string
  status: MediaStatus
  rating: number
  progressCurrent: string
  progressTotal: string
  progressUnit: ProgressUnit
  tags: string
  synopsis: string
  notes: string
  sourceUrl: string
  characters: Character[]
  cast: Person[]
  genres: string[]
  studios: string[]
  externalIds?: ExternalIds
}

const UNIT_BY_TYPE: Record<MediaType, ProgressUnit> = {
  anime: 'ep',
  tv: 'ep',
  movie: 'page',
  novel: 'chapter',
  manga: 'chapter',
}

function toForm(item?: MediaItem, defaultType: MediaType = 'anime'): FormState {
  if (!item) {
    const base = emptyMedia(defaultType)
    return {
      type: defaultType,
      title: '',
      originalTitle: '',
      cover: '',
      year: '',
      status: 'wish',
      rating: 0,
      progressCurrent: '0',
      progressTotal: '',
      progressUnit: UNIT_BY_TYPE[defaultType],
      tags: '',
      synopsis: '',
      notes: '',
      sourceUrl: '',
      characters: [],
      cast: [],
      genres: [],
      studios: [],
    }
  }
  return {
    type: item.type,
    title: item.title,
    originalTitle: item.originalTitle ?? '',
    cover: item.cover ?? '',
    year: item.year ? String(item.year) : '',
    status: item.status,
    rating: item.rating ?? 0,
    progressCurrent: String(item.progressCurrent ?? 0),
    progressTotal: item.progressTotal ? String(item.progressTotal) : '',
    progressUnit: item.progressUnit,
    tags: item.tags.join(', '),
    synopsis: item.synopsis ?? '',
    notes: item.notes ?? '',
    sourceUrl: item.sourceUrl ?? '',
    characters: item.characters,
    cast: item.cast,
    genres: item.genres,
    studios: item.studios,
    externalIds: item.externalIds,
  }
}

export function MediaDialog({
  open,
  onClose,
  initial,
  defaultType = 'anime',
}: {
  open: boolean
  onClose: () => void
  initial?: MediaItem
  defaultType?: MediaType
}) {
  const tmdbKey = useSettings((state) => state.tmdbKey)
  const [tab, setTab] = useState<'search' | 'form'>('search')
  const [form, setForm] = useState<FormState>(() => toForm(initial, defaultType))
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<MetaSearchResult[]>([])
  const [provider, setProvider] = useState<ProviderId>('bangumi')
  const [warning, setWarning] = useState<string>()
  const [error, setError] = useState<string>()
  const [loadingId, setLoadingId] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(toForm(initial, initial?.type ?? defaultType))
    setTab(initial ? 'form' : 'search')
    setQuery(initial?.title ?? '')
    setResults([])
    setError(undefined)
    setWarning(undefined)
    setConfirmDelete(false)
  }, [open, initial, defaultType])

  function patch(patchValue: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patchValue }))
  }

  async function runSearch() {
    if (!query.trim() || searching) return
    setSearching(true)
    setError(undefined)
    setWarning(undefined)
    try {
      const response = await searchMetadata(query.trim(), form.type, { tmdbKey })
      setResults(response.results)
      setProvider(response.provider)
      setWarning(response.warning)
      if (!response.results.length) setError('没有搜到结果，试试换一个关键词或手动填写。')
    } catch (searchError) {
      setError((searchError as Error).message)
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  async function chooseResult(result: MetaSearchResult) {
    setLoadingId(result.id)
    setError(undefined)
    try {
      const draft = await fetchMetadata(result, form.type, { tmdbKey })
      setForm((current) => ({
        ...current,
        type: result.type,
        title: draft.title || result.title,
        originalTitle: draft.originalTitle ?? '',
        cover: draft.cover ?? '',
        year: draft.year ? String(draft.year) : '',
        status: current.status,
        rating: draft.score ? Math.round(draft.score) : current.rating,
        progressTotal: draft.total ? String(draft.total) : '',
        progressUnit: draft.unit,
        tags: draft.tags.join(', '),
        synopsis: draft.synopsis ?? '',
        sourceUrl: draft.sourceUrl ?? '',
        characters: draft.characters,
        cast: draft.cast,
        genres: draft.genres,
        studios: draft.studios,
        externalIds: draft.externalIds,
      }))
      setTab('form')
    } catch (detailError) {
      setError((detailError as Error).message)
    } finally {
      setLoadingId(undefined)
    }
  }

  async function save() {
    if (!form.title.trim()) {
      toast('先给条目起个名字', 'error')
      return
    }
    setSaving(true)
    try {
      const payload: Partial<MediaItem> = {
        type: form.type,
        title: form.title.trim(),
        originalTitle: form.originalTitle.trim() || undefined,
        cover: form.cover.trim() || undefined,
        year: form.year ? Number(form.year) : undefined,
        status: form.status,
        rating: form.rating || undefined,
        progressCurrent: Number(form.progressCurrent) || 0,
        progressTotal: form.progressTotal ? Number(form.progressTotal) : undefined,
        progressUnit: form.progressUnit,
        tags: parseTags(form.tags),
        synopsis: form.synopsis.trim() || undefined,
        notes: form.notes.trim() || undefined,
        sourceUrl: form.sourceUrl.trim() || undefined,
        characters: form.characters,
        cast: form.cast,
        genres: form.genres,
        studios: form.studios,
        externalIds: form.externalIds,
      }
      if (initial) {
        await updateMedia(initial.id, payload)
        toast('已更新', 'success')
      } else {
        await createMedia({ ...payload, type: form.type, title: form.title.trim() })
        toast('已加入媒体库', 'success')
      }
      onClose()
    } catch (saveError) {
      toast((saveError as Error).message || '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!initial) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    await deleteMedia(initial.id)
    toast('已移到回收站（同步后其他设备也会删除）', 'success')
    onClose()
  }

  const isEditing = Boolean(initial)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? '编辑条目' : '添加条目'}
      description={
        isEditing
          ? '改完记得保存。更新时间会自动同步到其他设备。'
          : '先从 Bangumi / TMDB 搜一下，能省掉大部分填写。'
      }
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <div>
            {isEditing ? (
              <Button variant={confirmDelete ? 'danger' : 'ghost'} size="sm" onClick={remove}>
                <Trash2 size={14} />
                {confirmDelete ? '再点一次确认删除' : '删除'}
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={save} disabled={saving || !form.title.trim()} variant="primary">
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              {isEditing ? '保存修改' : '加入媒体库'}
            </Button>
          </div>
        </div>
      }
    >
      {!isEditing ? (
        <div className="mb-5 flex rounded-xl bg-surface-2 p-1">
          {(
            [
              ['search', '在线搜索'],
              ['form', '手动填写'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                'flex-1 rounded-lg py-2 text-[12.5px] font-medium transition-colors',
                tab === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink-soft',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {tab === 'search' && !isEditing ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') runSearch()
                }}
                placeholder="搜番剧 / 电影 / 小说…"
                className="h-11 pl-9"
                autoFocus
              />
            </div>
            <Button onClick={runSearch} disabled={searching || !query.trim()} variant="primary" className="h-11">
              {searching ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              搜索
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-faint">
            <span className="rounded-full bg-surface-2 px-2 py-0.5">
              {form.type === 'movie' || form.type === 'tv' ? 'TMDB' : 'Bangumi'} ·{' '}
              {MEDIA_TYPES.find((type) => type.value === form.type)?.label}
            </span>
            {provider === 'anilist' ? <span>已切换 AniList 兜底</span> : null}
            {form.type === 'movie' || form.type === 'tv' ? (
              tmdbKey ? (
                <span>使用已保存的 TMDB Key</span>
              ) : (
                <Link to="/settings" onClick={onClose} className="text-accent hover:underline">
                  还没有 TMDB Key，去设置里填 →
                </Link>
              )
            ) : null}
          </div>

          {warning ? (
            <p className="rounded-xl border border-accent/20 bg-accent-soft px-3 py-2 text-[11.5px] text-accent">
              {warning}
            </p>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-3 text-[12px] text-danger">
              {error}
              <div className="mt-2 flex gap-3">
                <button type="button" className="underline underline-offset-2" onClick={() => setTab('form')}>
                  直接手动填写
                </button>
                {!tmdbKey && (form.type === 'movie' || form.type === 'tv') ? (
                  <Link to="/settings" onClick={onClose} className="underline underline-offset-2">
                    去设置 TMDB Key
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="max-h-[42vh] space-y-1.5 overflow-y-auto pr-1">
            {results.map((result) => (
              <button
                key={`${result.provider}-${result.id}`}
                type="button"
                onClick={() => chooseResult(result)}
                disabled={Boolean(loadingId)}
                className="flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition-colors hover:border-line hover:bg-surface-2 disabled:opacity-60"
              >
                <Cover
                  src={result.cover}
                  title={result.title}
                  className="h-16 w-11 shrink-0"
                  rounded="rounded-md"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-ink">{result.title}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted">
                    {[result.subtitle, result.originalTitle].filter(Boolean).join(' · ') || '—'}
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-[10.5px] text-faint">
                    <span className="rounded bg-surface-2 px-1.5 py-0.5">
                      {providerLabel(result.provider)}
                    </span>
                    {result.score ? <span className="text-accent">★ {result.score.toFixed(1)}</span> : null}
                  </span>
                </span>
                {loadingId === result.id ? (
                  <Loader2 size={16} className="animate-spin text-accent" />
                ) : (
                  <Plus size={16} className="text-faint" />
                )}
              </button>
            ))}
          </div>

          {!results.length && !error && !searching ? (
            <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center">
              <p className="font-display text-base text-ink-soft">搜一下，剩下的交给它</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-faint">
                封面、年份、话数、CV、简介会自动填好。搜不到就手动写，也很快。
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex gap-4">
            <Cover src={form.cover || undefined} title={form.title || '新条目'} className="h-40 w-[106px] shrink-0" />
            <div className="min-w-0 flex-1 space-y-3">
              <Field label="标题">
                <Input
                  value={form.title}
                  onChange={(event) => patch({ title: event.target.value })}
                  placeholder="例如：葬送的芙莉莲"
                />
              </Field>
              <Field label="原名 / 别名">
                <Input
                  value={form.originalTitle}
                  onChange={(event) => patch({ originalTitle: event.target.value })}
                  placeholder="可选"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="类型">
                  <Select
                    value={form.type}
                    onChange={(event) => {
                      const type = event.target.value as MediaType
                      patch({ type, progressUnit: UNIT_BY_TYPE[type] })
                    }}
                  >
                    {MEDIA_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="状态">
                  <Select
                    value={form.status}
                    onChange={(event) => patch({ status: event.target.value as MediaStatus })}
                  >
                    {STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="年份">
              <Input
                type="number"
                value={form.year}
                onChange={(event) => patch({ year: event.target.value })}
                placeholder="2024"
              />
            </Field>
            <Field label="进度">
              <Input
                type="number"
                value={form.progressCurrent}
                onChange={(event) => patch({ progressCurrent: event.target.value })}
              />
            </Field>
            <Field label="总数">
              <Input
                type="number"
                value={form.progressTotal}
                onChange={(event) => patch({ progressTotal: event.target.value })}
                placeholder="可留空"
              />
            </Field>
            <Field label="单位">
              <Select
                value={form.progressUnit}
                onChange={(event) => patch({ progressUnit: event.target.value as ProgressUnit })}
              >
                {Object.entries(UNIT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="评分" hint="点击 1-10 分">
            <RatingPicker value={form.rating} onChange={(rating) => patch({ rating })} />
          </Field>

          <Field label="封面地址" hint="留空会生成一张占位封面">
            <Input
              value={form.cover}
              onChange={(event) => patch({ cover: event.target.value })}
              placeholder="https://…"
            />
          </Field>

          <Field label="标签" hint="用逗号或空格分隔">
            <Input
              value={form.tags}
              onChange={(event) => patch({ tags: event.target.value })}
              placeholder="奇幻, 公路, 治愈"
            />
          </Field>

          {form.characters.length ? (
            <div className="rounded-xl border border-line bg-surface-2/60 px-3.5 py-3">
              <p className="mb-2 text-[11px] font-medium tracking-wide text-muted">角色 / CV</p>
              <div className="flex flex-wrap gap-1.5">
                {form.characters.slice(0, 12).map((character) => (
                  <span
                    key={`${character.name}-${character.cv}`}
                    className="rounded-full bg-surface px-2.5 py-1 text-[11px] text-ink-soft"
                  >
                    {character.name}
                    {character.cv ? <span className="text-faint"> · {character.cv}</span> : null}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <Field label="简介">
            <Textarea
              value={form.synopsis}
              onChange={(event) => patch({ synopsis: event.target.value })}
              placeholder="一句话也好"
              rows={3}
            />
          </Field>

          <Field label="笔记">
            <Textarea
              value={form.notes}
              onChange={(event) => patch({ notes: event.target.value })}
              placeholder="看到哪了、想记的点、资源在哪…"
              rows={2}
            />
          </Field>

          <Field label="来源链接">
            <Input
              value={form.sourceUrl}
              onChange={(event) => patch({ sourceUrl: event.target.value })}
              placeholder="https://bgm.tv/subject/…"
            />
          </Field>
        </div>
      )}
    </Dialog>
  )
}
