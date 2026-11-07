import { describe, expect, it } from 'vitest'
import { UNKNOWN_YEAR, yearKey, yearLabel, yearRank } from '../src/lib/years'

describe('year classification', () => {
  it('uses exact years instead of decades', () => {
    expect(yearKey(2014)).toBe('2014')
    expect(yearKey(2024)).toBe('2024')
    expect(yearKey(2006)).toBe('2006')
    expect(yearKey(1987)).toBe('1987')
    expect(yearKey(undefined)).toBe(UNKNOWN_YEAR)
    expect(yearKey(0)).toBe(UNKNOWN_YEAR)
  })

  it('renders exact year labels and sorts newest first', () => {
    expect(yearLabel('2014')).toBe('2014 年')
    expect(yearLabel(UNKNOWN_YEAR)).toBe('年份未知')
    expect(yearRank('2024')).toBeGreaterThan(yearRank('2014'))
    expect(yearRank(UNKNOWN_YEAR)).toBeLessThan(yearRank('1987'))
  })
})
