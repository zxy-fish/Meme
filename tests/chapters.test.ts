import { describe, expect, it } from 'vitest'
import { chapterText, parseChapters } from '../src/lib/reader/chapters'

const book = `序

这是一段开场白，用来测试序章是否会被单独保留。

第一章 凌晨的书店

城市在凌晨一点会换一种呼吸。

第二章 借书证

第二天上班，林见秋一直在想那家书店。

番外 小记

后来，书店还在。
`

describe('parseChapters', () => {
  it('finds Chinese chapter headings', () => {
    const chapters = parseChapters(book)
    expect(chapters.map((chapter) => chapter.title)).toEqual([
      '序',
      '第一章 凌晨的书店',
      '第二章 借书证',
      '番外 小记',
    ])
    expect(chapters[1].start).toBeLessThan(chapters[2].start)
    expect(chapters[3].end).toBe(book.length)
  })

  it('handles numeric chapter headings', () => {
    const text = '第1章 开始\n内容一\n\n第2章 继续\n内容二'
    const chapters = parseChapters(text)
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('第1章 开始')
  })

  it('falls back to chunks when no headings exist', () => {
    const text = `${'一'.repeat(3000)}\n${'二'.repeat(3000)}\n${'三'.repeat(3000)}`
    const chapters = parseChapters(text)
    expect(chapters.length).toBeGreaterThan(1)
    expect(chapters[0].title).toContain('第 1 节')
    expect(chapters.at(-1)!.end).toBe(text.length)
  })

  it('does not treat short dialogue as a chapter', () => {
    const text = '第一章 开始\n他说：“第二章我们再说。”\n\n第二章 继续\n正文'
    const chapters = parseChapters(text)
    expect(chapters.map((chapter) => chapter.title)).toEqual(['第一章 开始', '第二章 继续'])
  })

  it('extracts chapter text without the heading', () => {
    const chapters = parseChapters(book)
    const first = chapters[1]
    expect(chapterText(book, first)).toContain('城市在凌晨一点')
  })
})
