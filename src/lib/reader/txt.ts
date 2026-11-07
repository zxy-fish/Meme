import { parseChapters, type ParsedChapter } from './chapters'
import { decodeText } from './encoding'

export interface ImportedTxt {
  title: string
  author?: string
  text: string
  encoding: string
  chapters: ParsedChapter[]
  fileSize: number
  fileName: string
}

export function titleFromFileName(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[_-]+/g, ' ')
    .trim()
}

export async function readTxtFile(file: File): Promise<ImportedTxt> {
  const buffer = await file.arrayBuffer()
  const decoded = await decodeText(buffer)
  const chapters = parseChapters(decoded.text)
  return {
    title: titleFromFileName(file.name) || '未命名',
    text: decoded.text,
    encoding: decoded.encoding,
    chapters,
    fileSize: file.size,
    fileName: file.name,
  }
}

export async function readSampleText(url: string): Promise<ImportedTxt | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const text = await response.text()
    const chapters = parseChapters(text)
    return {
      title: '夜航书店',
      author: 'Meme 示例',
      text,
      encoding: 'UTF-8',
      chapters,
      fileSize: new TextEncoder().encode(text).length,
      fileName: '夜航书店.txt',
    }
  } catch {
    return null
  }
}
