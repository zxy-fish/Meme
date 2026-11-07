import { describe, expect, it } from 'vitest'
import {
  countryCodeFromName,
  countryName,
  regionLabel,
} from '../src/lib/countries'

describe('country classification', () => {
  it('maps country names from metadata to ISO codes', () => {
    expect(countryCodeFromName('日本')).toBe('JP')
    expect(countryCodeFromName('中国大陆')).toBe('CN')
    expect(countryCodeFromName('United States')).toBeUndefined()
    expect(countryName('JP')).toBe('日本')
    expect(countryName(undefined)).toBe('未标注')
  })

  it('uses drama-specific labels for TV', () => {
    expect(regionLabel('tv', 'JP')).toBe('日剧')
    expect(regionLabel('tv', 'CN')).toBe('国产剧')
    expect(regionLabel('tv', 'US')).toBe('美剧')
    expect(regionLabel('tv', 'KR')).toBe('韩剧')
    expect(regionLabel('tv', undefined)).toBe('地区未标')
  })

  it('labels other media types', () => {
    expect(regionLabel('movie', 'US')).toBe('美国电影')
    expect(regionLabel('anime', 'JP')).toBe('日本动画')
    expect(regionLabel('manga', 'JP')).toBe('日漫')
    expect(regionLabel('novel', 'CN')).toBe('国产小说')
  })
})
