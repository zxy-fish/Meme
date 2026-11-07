export interface ParsedChapter {
  title: string
  start: number
  end: number
  index: number
}

const CHAPTER_RE =
  /^(?:第[零一二三四五六七八九十百千万两\d]+[章节卷回部篇集话]|序章|序言|楔子|引子|尾声|后记|终章|番外(?:篇)?|Chapter\s+[\dIVXLCDM]+|CHAPTER\s+[\dIVXLCDM]+)(?:[\s:：·、—-].{0,40})?$/

const FALLBACK_CHUNK = 6000

function isChapterLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (trimmed.length > 48) return false
  return CHAPTER_RE.test(trimmed)
}

function lineStarts(text: string): { start: number; text: string }[] {
  const rows: { start: number; text: string }[] = []
  let start = 0
  for (let i = 0; i <= text.length; i += 1) {
    if (i === text.length || text.charCodeAt(i) === 10) {
      rows.push({ start, text: text.slice(start, i) })
      start = i + 1
    }
  }
  return rows
}

export function parseChapters(text: string): ParsedChapter[] {
  const rows = lineStarts(text)
  const marks: { title: string; start: number }[] = []

  for (const row of rows) {
    if (isChapterLine(row.text)) {
      marks.push({ title: row.text.trim(), start: row.start })
    }
  }

  if (marks.length >= 2) {
    const chapters: ParsedChapter[] = []
    const preface = text.slice(0, marks[0].start).trim()
    if (preface.length > 20) {
      chapters.push({ title: '序', start: 0, end: marks[0].start, index: 0 })
    }
    for (let i = 0; i < marks.length; i += 1) {
      const start = marks[i].start
      const end = i + 1 < marks.length ? marks[i + 1].start : text.length
      chapters.push({
        title: marks[i].title,
        start,
        end,
        index: chapters.length,
      })
    }
    return chapters
  }

  // No reliable chapter markers: split at paragraph boundaries into readable chunks.
  const chapters: ParsedChapter[] = []
  let cursor = 0
  while (cursor < text.length) {
    let end = Math.min(text.length, cursor + FALLBACK_CHUNK)
    if (end < text.length) {
      const boundary = text.lastIndexOf('\n', end)
      if (boundary > cursor + FALLBACK_CHUNK * 0.6) end = boundary
    }
    chapters.push({
      title: `第 ${chapters.length + 1} 节`,
      start: cursor,
      end,
      index: chapters.length,
    })
    cursor = end
  }
  if (chapters.length === 0) {
    chapters.push({ title: '正文', start: 0, end: text.length, index: 0 })
  }
  return chapters
}

export function chapterText(text: string, chapter: { start: number; end: number }): string {
  return text.slice(chapter.start, chapter.end).trim()
}
