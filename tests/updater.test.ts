import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { isNewer, normalizeVersion, pickMacAsset, releaseAssetUrl, assetApiUrl, findAssetByName } =
  require('../electron/update-utils.cjs')

describe('version comparison', () => {
  it('normalises v-prefixed and short versions', () => {
    expect(normalizeVersion('v1.2.3')).toEqual([1, 2, 3])
    expect(normalizeVersion('1.2')).toEqual([1, 2, 0])
    expect(normalizeVersion('1.2.3-beta.1')).toEqual([1, 2, 3])
  })

  it('detects newer versions only', () => {
    expect(isNewer('1.2.0', '1.1.9')).toBe(true)
    expect(isNewer('1.1.10', '1.1.9')).toBe(true)
    expect(isNewer('1.1.1', '1.1.1')).toBe(false)
    expect(isNewer('1.1.0', '1.1.1')).toBe(false)
  })
})

describe('mac asset selection', () => {
  const files = [
    { url: 'Meme-1.2.0-mac.zip' },
    { url: 'Meme-1.2.0-arm64-mac.zip' },
    { url: 'Meme-1.2.0.dmg' },
    { url: 'Meme-1.2.0-arm64.dmg' },
  ]

  it('picks the zip for the running architecture', () => {
    expect(pickMacAsset(files, 'arm64')?.url).toBe('Meme-1.2.0-arm64-mac.zip')
    expect(pickMacAsset(files, 'x64')?.url).toBe('Meme-1.2.0-mac.zip')
  })

  it('returns null when the architecture is missing', () => {
    expect(pickMacAsset([{ url: 'Meme-1.2.0.dmg' }], 'arm64')).toBeNull()
  })

  it('builds an absolute download url from the bare file name', () => {
    expect(releaseAssetUrl('zxy-fish/Meme', '1.2.0', 'Meme-1.2.0-arm64-mac.zip')).toBe(
      'https://github.com/zxy-fish/Meme/releases/download/v1.2.0/Meme-1.2.0-arm64-mac.zip',
    )
  })

  it('builds the REST asset url used as the github.com-free download path', () => {
    expect(assetApiUrl('zxy-fish/Meme', 42)).toBe(
      'https://api.github.com/repos/zxy-fish/Meme/releases/assets/42',
    )
  })

  it('matches release assets by file name', () => {
    const assets = [
      { id: 1, name: 'latest-mac.yml' },
      { id: 2, name: 'Meme-1.2.0-arm64-mac.zip' },
    ]
    expect(findAssetByName(assets, 'latest-mac.yml')?.id).toBe(1)
    expect(findAssetByName(assets, 'Meme-1.2.0-arm64-mac.zip')?.id).toBe(2)
    expect(findAssetByName(assets, 'missing.zip')).toBeNull()
    expect(findAssetByName(undefined, 'latest-mac.yml')).toBeNull()
  })
})

describe.skipIf(process.platform !== 'darwin')('install-update.sh', () => {
  it('swaps the bundle and cleans up', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'meme-update-'))
    const target = path.join(root, 'Applications', 'Meme.app')
    const source = path.join(root, 'stage', 'Meme.app')
    mkdirSync(path.join(target, 'Contents'), { recursive: true })
    mkdirSync(path.join(source, 'Contents'), { recursive: true })
    writeFileSync(path.join(target, 'Contents', 'old.txt'), 'old')
    writeFileSync(path.join(source, 'Contents', 'new.txt'), 'new')

    const stage = path.join(root, 'stage')
    const script = fileURLToPath(new URL('../electron/install-update.sh', import.meta.url))
    execFileSync('/bin/sh', [script, '999999', target, source, stage], {
      env: { ...process.env, MEME_UPDATE_SKIP_OPEN: '1' },
      stdio: 'ignore',
    })

    expect(existsSync(path.join(target, 'Contents', 'new.txt'))).toBe(true)
    expect(existsSync(path.join(target, 'Contents', 'old.txt'))).toBe(false)
    expect(existsSync(`${target}.new`)).toBe(false)
    expect(existsSync(`${target}.bak`)).toBe(false)

    rmSync(root, { recursive: true, force: true })
  })
})
