export const UNKNOWN_YEAR = 'unknown'

export function yearKey(year?: number): string {
  return year && year > 0 ? String(year) : UNKNOWN_YEAR
}

export function yearLabel(key: string): string {
  return key === UNKNOWN_YEAR ? '年份未知' : `${key} 年`
}

export function yearRank(key: string): number {
  return key === UNKNOWN_YEAR ? -Infinity : Number(key)
}
