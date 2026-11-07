const ENCODING_MAP: Record<string, string> = {
  'UTF-8': 'utf-8',
  UTF8: 'utf-8',
  ASCII: 'utf-8',
  'GB2312': 'gb18030',
  'GBK': 'gb18030',
  'GB18030': 'gb18030',
  'BIG5': 'big5',
  'BIG5-HKSCS': 'big5',
  'UTF-16LE': 'utf-16le',
  'UTF-16BE': 'utf-16be',
  'UTF-16': 'utf-16le',
  'SHIFT_JIS': 'shift_jis',
  'EUC-JP': 'euc-jp',
  'EUC-KR': 'euc-kr',
  'WINDOWS-1252': 'windows-1252',
  'ISO-8859-1': 'windows-1252',
}

export interface DecodedText {
  text: string
  encoding: string
}

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, '')
}

function countReplacement(text: string): number {
  let count = 0
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 0xfffd) count += 1
  }
  return count
}

function tryDecode(bytes: Uint8Array, encoding: string): string | null {
  try {
    return new TextDecoder(encoding, { fatal: false }).decode(bytes)
  } catch {
    return null
  }
}

export async function decodeText(buffer: ArrayBuffer): Promise<DecodedText> {
  const bytes = new Uint8Array(buffer)

  // BOM first
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    const text = tryDecode(bytes, 'utf-16le')
    if (text) return { text: stripBom(text), encoding: 'UTF-16LE' }
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const text = tryDecode(bytes, 'utf-16be')
    if (text) return { text: stripBom(text), encoding: 'UTF-16BE' }
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: stripBom(new TextDecoder('utf-8').decode(bytes)), encoding: 'UTF-8' }
  }

  const sample = bytes.subarray(0, Math.min(bytes.length, 128 * 1024))
  let detected = 'utf-8'
  try {
    // Charset tables are big and only needed when importing a TXT file.
    const jschardet = (await import('jschardet')).default
    const guess = jschardet.detect(sample)
    if (guess?.encoding) detected = ENCODING_MAP[guess.encoding.toUpperCase()] ?? 'utf-8'
  } catch {
    detected = 'utf-8'
  }

  const candidates = [...new Set([detected, 'utf-8', 'gb18030', 'big5'])]
  let best: { text: string; encoding: string; bad: number } | null = null

  for (const encoding of candidates) {
    const text = tryDecode(bytes, encoding)
    if (!text) continue
    const bad = countReplacement(text)
    if (!best || bad < best.bad) best = { text, encoding, bad }
    if (bad === 0) break
  }

  if (!best) return { text: new TextDecoder('utf-8').decode(bytes), encoding: 'UTF-8' }
  return {
    text: stripBom(best.text).replace(/\r\n?/g, '\n'),
    encoding: best.encoding.toUpperCase(),
  }
}
