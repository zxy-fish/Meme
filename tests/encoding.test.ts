import { describe, expect, it } from 'vitest'
import { decodeText } from '../src/lib/reader/encoding'

function bytes(...values: number[]): ArrayBuffer {
  return new Uint8Array(values).buffer
}

describe('decodeText', () => {
  it('decodes UTF-8 with BOM', async () => {
    const encoded = new TextEncoder().encode('\uFEFF你好，世界')
    const result = await decodeText(encoded.buffer)
    expect(result.text).toBe('你好，世界')
    expect(result.encoding).toBe('UTF-8')
  })

  it('decodes GBK/GB18030 bytes', async () => {
    const result = await decodeText(bytes(0xc4, 0xe3, 0xba, 0xc3, 0xa3, 0xac, 0xca, 0xc0, 0xbd, 0xe7))
    expect(result.text).toBe('你好，世界')
  })

  it('decodes UTF-16LE with BOM', async () => {
    const text = '夜航书店'
    const buffer = new ArrayBuffer(2 + text.length * 2)
    const view = new DataView(buffer)
    view.setUint16(0, 0xfeff, true)
    for (let i = 0; i < text.length; i += 1) {
      view.setUint16(2 + i * 2, text.charCodeAt(i), true)
    }
    const result = await decodeText(buffer)
    expect(result.text).toBe('夜航书店')
  })

  it('normalizes CRLF', async () => {
    const encoded = new TextEncoder().encode('第一行\r\n第二行\r第三行')
    expect((await decodeText(encoded.buffer)).text).toBe('第一行\n第二行\n第三行')
  })
})
