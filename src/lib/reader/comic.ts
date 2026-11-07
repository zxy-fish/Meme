import { unzipSync } from 'fflate'
import { hashBytes, hashText } from '../utils'

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|bmp)$/i
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export interface ComicEntry {
  name: string
  blob: Blob
  size: number
  mime: string
}

export interface ComicImport {
  title: string
  entries: ComicEntry[]
  size: number
  hash: string
  fileName: string
}

export function isComicImage(name: string): boolean {
  return IMAGE_RE.test(name) && !name.startsWith('__MACOSX/') && !name.split('/').pop()?.startsWith('.')
}

export function mimeForImage(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'avif') return 'image/avif'
  if (ext === 'bmp') return 'image/bmp'
  return 'image/jpeg'
}

export function titleFromComicName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').trim()
  if (base) return base
  return '未命名漫画'
}

function titleFromFiles(files: File[]): string {
  const first = files[0] as File & { webkitRelativePath?: string }
  const relative = first?.webkitRelativePath ?? ''
  if (relative.includes('/')) {
    const folder = relative.split('/')[0]
    if (folder) return folder
  }
  if (files.length === 1) return titleFromComicName(files[0].name)
  const base = files[0]?.name.replace(/\.[^.]+$/, '').replace(/[-_ ]?\d+$/, '').trim()
  return base || '未命名漫画'
}

export async function readComicArchive(file: File): Promise<ComicImport> {
  const buffer = await file.arrayBuffer()
  let unzipped: Record<string, Uint8Array>
  try {
    unzipped = unzipSync(new Uint8Array(buffer))
  } catch {
    throw new Error('这个压缩包读不了。漫画请用 ZIP / CBZ 格式。')
  }
  const entries = Object.entries(unzipped)
    .filter(([name]) => isComicImage(name))
    .map(([name, data]) => ({
      name,
      blob: new Blob([data.slice()], { type: mimeForImage(name) }),
      size: data.byteLength,
      mime: mimeForImage(name),
    }))
    .sort((a, b) => collator.compare(a.name, b.name))

  if (!entries.length) throw new Error('压缩包里没有找到图片')
  return {
    title: titleFromComicName(file.name),
    entries,
    size: file.size,
    hash: await hashBytes(buffer),
    fileName: file.name,
  }
}

export async function readComicFiles(files: File[]): Promise<ComicImport> {
  const entries = files
    .filter((file) => isComicImage(file.name))
    .map((file) => ({
      name: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
      blob: file as Blob,
      size: file.size,
      mime: mimeForImage(file.name),
    }))
    .sort((a, b) => collator.compare(a.name, b.name))

  if (!entries.length) throw new Error('没有找到图片')
  return {
    title: titleFromFiles(files),
    entries,
    size: entries.reduce((sum, entry) => sum + entry.size, 0),
    hash: await hashText(entries.map((entry) => `${entry.name}:${entry.size}`).join('|')),
    fileName: entries[0].name,
  }
}
