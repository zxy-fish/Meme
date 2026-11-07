import type { Character, MediaType } from '../types'
import {
  MetadataError,
  unitFor,
  type MetaDraft,
  type MetaSearchResult,
  type ProviderOptions,
} from './types'

const ENDPOINT = 'https://graphql.anilist.co'

interface AniListTitle {
  romaji?: string
  english?: string
  native?: string
}

interface AniListMedia {
  id: number
  title: AniListTitle
  coverImage?: { large?: string; extraLarge?: string }
  bannerImage?: string
  description?: string
  startDate?: { year?: number }
  episodes?: number
  chapters?: number
  duration?: number
  genres?: string[]
  averageScore?: number
  format?: string
  countryOfOrigin?: string
  studios?: { nodes: { name: string }[] }
  characters?: {
    edges: {
      role: string
      node: { name: { full: string }; image?: { medium?: string } }
      voiceActors?: { name: { full: string }; image?: { medium?: string } }[]
    }[]
  }
}

interface AniListResponse<T> {
  data?: T
  errors?: { message: string }[]
}

async function gql<T>(query: string, variables: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 12_000)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    })
    const payload = (await response.json()) as AniListResponse<T>
    if (!response.ok || payload.errors?.length) {
      throw new MetadataError(payload.errors?.[0]?.message ?? `AniList 请求失败 (${response.status})`)
    }
    if (!payload.data) throw new MetadataError('AniList 返回了空数据')
    return payload.data
  } catch (error) {
    if (error instanceof MetadataError) throw error
    if ((error as Error).name === 'AbortError') throw new MetadataError('AniList 请求超时')
    throw new MetadataError('连不上 AniList，请检查网络')
  } finally {
    window.clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

function stripHtml(input?: string): string | undefined {
  if (!input) return undefined
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .trim()
}

function titleOf(media: AniListMedia): { title: string; original?: string } {
  const romaji = media.title.romaji?.trim()
  const native = media.title.native?.trim()
  const english = media.title.english?.trim()
  const title = romaji || native || english || '未命名'
  const original = native && native !== title ? native : undefined
  return { title, original }
}

export async function searchAniList(
  query: string,
  type: MediaType,
  options: ProviderOptions = {},
): Promise<MetaSearchResult[]> {
  const gqlType = type === 'manga' ? 'MANGA' : 'ANIME'
  const data = await gql<{ Page: { media: AniListMedia[] } }>(
    `query ($search: String, $type: MediaType) {
      Page(perPage: 12) {
        media(search: $search, type: $type, sort: SEARCH_MATCH) {
          id
          title { romaji english native }
          coverImage { large extraLarge }
          startDate { year }
          episodes
          chapters
          averageScore
          format
          countryOfOrigin
        }
      }
    }`,
    { search: query.trim(), type: gqlType },
    options.signal,
  )
  return (data.Page.media ?? []).map((media) => {
    const { title, original } = titleOf(media)
    return {
      provider: 'anilist' as const,
      id: String(media.id),
      title,
      originalTitle: original,
      subtitle: [media.format, media.startDate?.year].filter(Boolean).join(' · '),
      cover: media.coverImage?.extraLarge ?? media.coverImage?.large,
      year: media.startDate?.year,
      score: media.averageScore ? media.averageScore / 10 : undefined,
      type,
    }
  })
}

export async function detailAniList(
  id: string,
  type: MediaType,
  options: ProviderOptions = {},
): Promise<MetaDraft> {
  const data = await gql<{ Media: AniListMedia }>(
    `query ($id: Int) {
      Media(id: $id) {
        id
        title { romaji english native }
        coverImage { extraLarge large }
        description
        startDate { year }
        episodes
        chapters
        genres
        averageScore
        countryOfOrigin
        studios(isMain: true) { nodes { name } }
        characters(perPage: 14, sort: [ROLE, RELEVANCE]) {
          edges {
            role
            node { name { full } image { medium } }
            voiceActors(language: JAPANESE) { name { full } image { medium } }
          }
        }
      }
    }`,
    { id: Number(id) },
    options.signal,
  )
  const media = data.Media
  const { title, original } = titleOf(media)
  const characters: Character[] = (media.characters?.edges ?? []).map((edge) => ({
    name: edge.node.name.full,
    role: edge.role === 'MAIN' ? 'main' : 'supporting',
    cv: edge.voiceActors?.[0]?.name.full,
    avatar: edge.node.image?.medium,
  }))
  const cast = characters
    .filter((character) => character.cv)
    .slice(0, 10)
    .map((character) => ({ name: character.cv as string, role: character.name }))

  return {
    title,
    originalTitle: original,
    cover: media.coverImage?.extraLarge ?? media.coverImage?.large,
    year: media.startDate?.year,
    country: media.countryOfOrigin,
    synopsis: stripHtml(media.description),
    tags: media.genres ?? [],
    genres: media.genres ?? [],
    studios: media.studios?.nodes?.map((node) => node.name) ?? [],
    characters,
    cast,
    total: type === 'manga' ? media.chapters : media.episodes,
    unit: unitFor(type),
    sourceUrl: `https://anilist.co/${type === 'manga' ? 'manga' : 'anime'}/${id}`,
    externalIds: { anilist: Number(id) },
    score: media.averageScore ? media.averageScore / 10 : undefined,
  }
}
