import type { Character, MediaType } from '../types'
import {
  MetadataError,
  unitFor,
  type MetaDraft,
  type MetaSearchResult,
  type ProviderOptions,
} from './types'

const BASE = 'https://api.themoviedb.org/3'
const IMAGE = 'https://image.tmdb.org/t/p/w500'

interface TmdbSearchItem {
  id: number
  media_type?: string
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  poster_path?: string | null
  release_date?: string
  first_air_date?: string
  vote_average?: number
  overview?: string
}

interface TmdbCast {
  id: number
  name: string
  character?: string
  profile_path?: string | null
  order?: number
}

interface TmdbDetail {
  id: number
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string
  first_air_date?: string
  overview?: string
  vote_average?: number
  runtime?: number
  episode_run_time?: number[]
  number_of_episodes?: number
  number_of_seasons?: number
  genres?: { id: number; name: string }[]
  production_companies?: { id: number; name: string }[]
  credits?: { cast?: TmdbCast[] }
  external_ids?: { imdb_id?: string }
}

function yearOf(date?: string): number | undefined {
  const match = date?.match(/(19|20)\d{2}/)
  return match ? Number(match[0]) : undefined
}

async function request<T>(
  path: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<T> {
  if (!apiKey.trim()) throw new MetadataError('还没有配置 TMDB API Key')
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 12_000)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  const token = apiKey.trim()
  const isBearer = token.startsWith('eyJ') || token.length > 60
  const url = new URL(`${BASE}${path}`)
  if (!isBearer) url.searchParams.set('api_key', token)
  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(isBearer ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!response.ok) {
      throw new MetadataError(
        response.status === 401 ? 'TMDB API Key 无效' : `TMDB 请求失败 (${response.status})`,
      )
    }
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof MetadataError) throw error
    if ((error as Error).name === 'AbortError') throw new MetadataError('TMDB 请求超时')
    throw new MetadataError('连不上 TMDB，请检查网络')
  } finally {
    window.clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

export async function searchTmdb(
  query: string,
  type: MediaType,
  options: ProviderOptions = {},
): Promise<MetaSearchResult[]> {
  const data = await request<{ results?: TmdbSearchItem[] }>(
    `/search/multi?language=zh-CN&include_adult=false&query=${encodeURIComponent(query.trim())}`,
    options.tmdbKey ?? '',
    options.signal,
  )
  const wanted = type === 'tv' ? 'tv' : 'movie'
  return (data.results ?? [])
    .filter((item) => item.media_type === wanted)
    .slice(0, 12)
    .map((item) => ({
      provider: 'tmdb' as const,
      id: String(item.id),
      title: item.title || item.name || '未命名',
      originalTitle: item.original_title || item.original_name,
      subtitle: [
        wanted === 'tv' ? '剧集' : '电影',
        yearOf(item.release_date || item.first_air_date),
      ]
        .filter(Boolean)
        .join(' · '),
      cover: item.poster_path ? `${IMAGE}${item.poster_path}` : undefined,
      year: yearOf(item.release_date || item.first_air_date),
      score: item.vote_average ? Math.round(item.vote_average * 10) / 10 : undefined,
      type: wanted,
    }))
}

export async function detailTmdb(
  id: string,
  type: MediaType,
  options: ProviderOptions = {},
): Promise<MetaDraft> {
  const wanted = type === 'tv' ? 'tv' : 'movie'
  const data = await request<TmdbDetail>(
    `/${wanted}/${id}?language=zh-CN&append_to_response=credits,external_ids`,
    options.tmdbKey ?? '',
    options.signal,
  )
  const characters: Character[] = (data.credits?.cast ?? [])
    .slice(0, 14)
    .map((person, index) => ({
      name: person.character || person.name,
      role: index < 4 ? 'main' : 'supporting',
      cv: person.name,
      avatar: person.profile_path ? `${IMAGE}${person.profile_path}` : undefined,
    }))
  const cast = (data.credits?.cast ?? []).slice(0, 10).map((person) => ({
    name: person.name,
    role: person.character,
  }))
  const genres = data.genres?.map((genre) => genre.name) ?? []
  const total = wanted === 'tv' ? data.number_of_episodes : 1

  return {
    title: data.title || data.name || '未命名',
    originalTitle: data.original_title || data.original_name,
    cover: data.poster_path ? `${IMAGE}${data.poster_path}` : undefined,
    year: yearOf(data.release_date || data.first_air_date),
    synopsis: data.overview?.trim(),
    tags: genres,
    genres,
    studios: data.production_companies?.map((company) => company.name) ?? [],
    characters,
    cast,
    total,
    unit: unitFor(type),
    sourceUrl: `https://www.themoviedb.org/${wanted}/${id}`,
    externalIds: { tmdb: Number(id) },
    score: data.vote_average ? Math.round(data.vote_average * 10) / 10 : undefined,
  }
}
