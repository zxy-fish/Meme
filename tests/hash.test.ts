import { describe, expect, it } from 'vitest'
import { hashText } from '../src/lib/utils'

describe('hashText', () => {
  it('matches a known SHA-256 digest', async () => {
    expect(await hashText('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('is stable for the same content', async () => {
    const a = await hashText('夜航书店')
    const b = await hashText('夜航书店')
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })
})
