import type { Character, MediaType } from '../types'
import {
  MetadataError,
  unitFor,
  type MetaDraft,
  type MetaSearchResult,
  type ProviderOptions,
} from './types'

const BASE = 'https://api.bgm.tv'
const TIMEOUT = 12_000

const TYPE_MAP: Record<MediaType, number> = {
  anime: 2,
  tv: 6,
  movie: 6,
  novel: 1,
  manga: 1,
}

interface BangumiImage {
  large?: string
  common?: string
  medium?: string
  grid?: string
  small?: string
}

interface BangumiInfoboxItem {
  key: string
  value: string | { v: string }[]
}

interface BangumiSubject {
  id: number
  type: number
  name: string
  name_cn?: string
  summary?: string
  date?: string
  platform?: string
  images?: BangumiImage
  score?: number
  rating?: { score?: number; rank?: number; total?: number }
  tags?: { name: string; count: number }[]
  infobox?: BangumiInfoboxItem[]
  eps?: number
  total_episodes?: number
  volumes?: number
}

interface BangumiSearchResponse {
  data?: BangumiSubject[]
  total?: number
}

interface BangumiCharacter {
  id: number
  name: string
  type: number
  relation: string
  images?: BangumiImage
  actors?: { id: number; name: string; images?: BangumiImage }[]
}

async function request<T>(path: string, init?: RequestInit, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    const response = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
    })
    if (!response.ok) {
      throw new MetadataError(
        response.status === 404 ? 'Bangumi 没有找到这个条目' : `Bangumi 请求失败 (${response.status})`,
      )
    }
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof MetadataError) throw error
    if ((error as Error).name === 'AbortError') {
      throw new MetadataError('Bangumi 请求超时，可能是网络或代理问题')
    }
    throw new MetadataError('连不上 Bangumi，请检查网络（或稍后手动填写）')
  } finally {
    window.clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

function coverOf(images?: BangumiImage): string | undefined {
  return images?.large ?? images?.common ?? images?.medium ?? images?.grid ?? undefined
}

function parseYear(subject: BangumiSubject): number | undefined {
  const date = subject.date ?? ''
  const match = date.match(/(19|20)\d{2}/)
  if (match) return Number(match[0])
  const info = infoValue(subject, ['放送开始', '上映年度', '出版年', '发售日', '开始'])
  const infoMatch = info?.match(/(19|20)\d{2}/)
  return infoMatch ? Number(infoMatch[0]) : undefined
}

function infoValue(subject: BangumiSubject, keys: string[]): string | undefined {
  for (const key of keys) {
    const item = subject.infobox?.find((entry) => entry.key === key)
    if (!item) continue
    if (Array.isArray(item.value)) {
      const value = item.value.map((entry) => entry.v).filter(Boolean).join(' / ')
      if (value) return value
    } else if (item.value) {
      return item.value
    }
  }
  return undefined
}

function parseNumber(value?: string): number | undefined {
  if (!value) return undefined
  const match = value.match(/\d+/)
  return match ? Number(match[0]) : undefined
}

function mapType(subject: BangumiSubject, fallback: MediaType): MediaType {
  if (subject.type === 2) return 'anime'
  if (subject.type === 6) {
    return fallback === 'tv' ? 'tv' : 'movie'
  }
  if (subject.type === 1) {
    if (subject.platform === '漫画' || fallback === 'manga') return 'manga'
    return fallback === 'novel' ? 'novel' : 'novel'
  }
  return fallback
}

export async function searchBangumi(
  query: string,
  type: MediaType,
  options: ProviderOptions = {},
): Promise<MetaSearchResult[]> {
  const body = {
    keyword: query.trim(),
    sort: 'match',
    filter: { type: [TYPE_MAP[type]], nsfw: false },
  }
  const data = await request<BangumiSearchResponse>(
    '/v0/search/subjects?limit=12&offset=0',
    { method: 'POST', body: JSON.stringify(body) },
    options.signal,
  )
  return (data.data ?? []).map((subject) => ({
    provider: 'bangumi' as const,
    id: String(subject.id),
    title: subject.name_cn || subject.name,
    originalTitle: subject.name_cn ? subject.name : undefined,
    subtitle: [subject.platform, subject.date?.slice(0, 4)].filter(Boolean).join(' · '),
    cover: coverOf(subject.images),
    year: parseYear(subject),
    score: subject.rating?.score ?? subject.score,
    type: mapType(subject, type),
  }))
}

export async function detailBangumi(
  id: string,
  type: MediaType,
  options: ProviderOptions = {},
): Promise<MetaDraft> {
  const subject = await request<BangumiSubject>(`/v0/subjects/${id}`, undefined, options.signal)
  let characters: BangumiCharacter[] = []
  try {
    characters = await request<BangumiCharacter[]>(
      `/v0/subjects/${id}/characters`,
      undefined,
      options.signal,
    )
  } catch {
    characters = []
  }

  const mapped: Character[] = characters.slice(0, 14).map((character) => ({
    name: character.name,
    role: character.relation?.includes('主角') || character.relation?.includes('主人') ? 'main' : 'supporting',
    cv: character.actors?.[0]?.name,
    avatar: coverOf(character.images),
  }))

  const cast = mapped
    .filter((character) => character.cv)
    .slice(0, 10)
    .map((character) => ({ name: character.cv as string, role: character.name }))

  const tags = (subject.tags ?? []).slice(0, 10).map((tag) => tag.name)
  const studios = infoValue(subject, ['动画制作', '制作公司', '出版社', '出品公司', '制作'])
  const total =
    subject.total_episodes ??
    subject.eps ??
    subject.volumes ??
    parseNumber(infoValue(subject, ['话数', '集数', '册数', '卷数']))

  return {
    title: subject.name_cn || subject.name,
    originalTitle: subject.name_cn ? subject.name : undefined,
    cover: coverOf(subject.images),
    year: parseYear(subject),
    synopsis: subject.summary?.trim(),
    tags,
    genres: tags.slice(0, 4),
    studios: studios ? studios.split(/\s*\/\s*/).filter(Boolean) : [],
    characters: mapped,
    cast,
    total,
    unit: unitFor(type),
    sourceUrl: `https://bgm.tv/subject/${id}`,
    externalIds: { bangumi: Number(id) },
    score: subject.rating?.score ?? subject.score,
  }
}
