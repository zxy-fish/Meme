import type { MediaType } from './types'

export interface CountryOption {
  code: string
  name: string
}

export const COUNTRIES: CountryOption[] = [
  { code: 'JP', name: '日本' },
  { code: 'CN', name: '中国' },
  { code: 'US', name: '美国' },
  { code: 'KR', name: '韩国' },
  { code: 'GB', name: '英国' },
  { code: 'TW', name: '台湾' },
  { code: 'HK', name: '香港' },
  { code: 'TH', name: '泰国' },
  { code: 'IN', name: '印度' },
  { code: 'FR', name: '法国' },
  { code: 'DE', name: '德国' },
  { code: 'CA', name: '加拿大' },
  { code: 'AU', name: '澳大利亚' },
  { code: 'OTHER', name: '其他' },
]

const COUNTRY_NAMES = new Map(COUNTRIES.map((country) => [country.code, country.name]))

const NAME_TO_CODE: Record<string, string> = {
  日本: 'JP',
  日本国: 'JP',
  日: 'JP',
  中国: 'CN',
  中国大陆: 'CN',
  大陆: 'CN',
  国产: 'CN',
  华语: 'CN',
  中国台湾: 'TW',
  台灣: 'TW',
  台湾: 'TW',
  中国香港: 'HK',
  香港: 'HK',
  美国: 'US',
  美國: 'US',
  美: 'US',
  韩国: 'KR',
  韓國: 'KR',
  南韩: 'KR',
  英国: 'GB',
  英國: 'GB',
  泰国: 'TH',
  泰國: 'TH',
  印度: 'IN',
  法国: 'FR',
  法國: 'FR',
  德国: 'DE',
  德國: 'DE',
  加拿大: 'CA',
  澳大利亚: 'AU',
  澳洲: 'AU',
}

export function countryName(code?: string): string {
  if (!code) return '未标注'
  return COUNTRY_NAMES.get(code) ?? '其他'
}

export function countryCodeFromName(value?: string): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (COUNTRY_NAMES.has(trimmed.toUpperCase())) return trimmed.toUpperCase()
  for (const [name, code] of Object.entries(NAME_TO_CODE)) {
    if (trimmed.includes(name)) return code
  }
  return undefined
}

const TV_LABELS: Record<string, string> = {
  JP: '日剧',
  CN: '国产剧',
  US: '美剧',
  KR: '韩剧',
  GB: '英剧',
  TW: '台剧',
  HK: '港剧',
  TH: '泰剧',
  IN: '印度剧',
  FR: '法剧',
  DE: '德剧',
  CA: '加剧',
  AU: '澳剧',
  OTHER: '其他剧',
}

export function regionLabel(type: MediaType, code?: string): string {
  if (!code) return '地区未标'
  if (type === 'tv') return TV_LABELS[code] ?? `${countryName(code)}剧`
  if (type === 'anime') {
    if (code === 'CN') return '国产动画'
    if (code === 'JP') return '日本动画'
    return `${countryName(code)}动画`
  }
  if (type === 'movie') return `${countryName(code)}电影`
  if (type === 'manga') {
    if (code === 'CN') return '国漫'
    if (code === 'JP') return '日漫'
    return `${countryName(code)}漫画`
  }
  if (code === 'CN') return '国产小说'
  return `${countryName(code)}小说`
}
