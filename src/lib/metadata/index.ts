import type { MediaType } from '../types'
import { detailAniList, searchAniList } from './anilist'
import { detailBangumi, searchBangumi } from './bangumi'
import { detailTmdb, searchTmdb } from './tmdb'
import {
  MetadataError,
  type MetaDraft,
  type MetaSearchResult,
  type ProviderId,
  type ProviderOptions,
} from './types'

export interface SearchResponse {
  provider: ProviderId
  results: MetaSearchResult[]
  warning?: string
}

const ALL_TYPES = ['anime', 'tv', 'novel'] as const

/** Search every Bangumi type at once, so a title never hides behind the wrong filter. */
async function searchAllTypes(
  query: string,
  options: ProviderOptions,
): Promise<SearchResponse> {
  const groups = await Promise.all(
    ALL_TYPES.map((type) => searchBangumi(query, type, options).catch(() => [])),
  )
  // Keep the head of every type list, otherwise a long anime list would push
  // the novel / TV matches past the cut-off.
  const seen = new Set<string>()
  const results: MetaSearchResult[] = []
  for (const group of groups) {
    for (const result of group.slice(0, 8)) {
      const key = `${result.provider}-${result.id}`
      if (seen.has(key)) continue
      seen.add(key)
      results.push(result)
    }
  }
  results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  return { provider: 'bangumi', results: results.slice(0, 18) }
}

export async function searchMetadata(
  query: string,
  type: MediaType | 'all',
  options: ProviderOptions = {},
): Promise<SearchResponse> {
  if (!query.trim()) return { provider: 'bangumi', results: [] }
  if (type === 'all') return searchAllTypes(query.trim(), options)

  if (type === 'movie' || type === 'tv') {
    if (options.tmdbKey?.trim()) {
      try {
        return { provider: 'tmdb', results: await searchTmdb(query, type, options) }
      } catch {
        const results = await searchBangumi(query, type, options)
        return {
          provider: 'bangumi',
          results,
          warning: 'TMDB 请求失败，已用 Bangumi 兜底；配置好 Key 后季集和演员会更完整。',
        }
      }
    }
    try {
      const results = await searchBangumi(query, type, options)
      return {
        provider: 'bangumi',
        results,
        warning: results.length
          ? '没有配置 TMDB Key，当前用 Bangumi 搜索影视；填 Key 后季集、演员、地区会更完整。'
          : undefined,
      }
    } catch {
      throw new MetadataError(
        '没有 TMDB Key，Bangumi 也没搜到。可以到设置里填 TMDB Key，或直接手动填写。',
      )
    }
  }

  try {
    return { provider: 'bangumi', results: await searchBangumi(query, type, options) }
  } catch (error) {
    if (type !== 'anime' && type !== 'manga') throw error
    const results = await searchAniList(query, type, options)
    return {
      provider: 'anilist',
      results,
      warning: 'Bangumi 连不上，已切换到 AniList；中文标题可能缺失。',
    }
  }
}

export async function fetchMetadata(
  result: MetaSearchResult,
  type: MediaType,
  options: ProviderOptions = {},
): Promise<MetaDraft> {
  if (result.provider === 'bangumi') return detailBangumi(result.id, type, options)
  if (result.provider === 'anilist') return detailAniList(result.id, type, options)
  return detailTmdb(result.id, type, options)
}

export { MetadataError, providerLabel, unitFor } from './types'
export type { MetaDraft, MetaSearchResult, ProviderId } from './types'
