'use strict'

/** "v1.2.3" / "1.2.3-beta.1" -> [1, 2, 3] */
function normalizeVersion(value) {
  const parts = String(value || '')
    .replace(/^v/i, '')
    .split(/[.+-]/)
    .slice(0, 3)
    .map((part) => {
      const parsed = Number.parseInt(part, 10)
      return Number.isFinite(parsed) ? parsed : 0
    })
  while (parts.length < 3) parts.push(0)
  return parts
}

function isNewer(candidate, current) {
  const next = normalizeVersion(candidate)
  const now = normalizeVersion(current)
  for (let i = 0; i < 3; i += 1) {
    if (next[i] > now[i]) return true
    if (next[i] < now[i]) return false
  }
  return false
}

/**
 * latest-mac.yml lists every architecture; pick the zip matching this machine.
 * x64 builds are named "Meme-1.2.3-mac.zip", arm64 ones "Meme-1.2.3-arm64-mac.zip".
 */
function pickMacAsset(files, arch) {
  const zips = (files || []).filter((file) => /-mac\.zip$/.test(file?.url || ''))
  const wantArm = arch === 'arm64'
  return zips.find((file) => file.url.includes('arm64') === wantArm) || null
}

/** latest-mac.yml lists bare file names; build the Releases download URL. */
function releaseAssetUrl(repo, version, file) {
  const tag = `v${String(version).replace(/^v/i, '')}`
  return `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(file)}`
}

module.exports = { normalizeVersion, isNewer, pickMacAsset, releaseAssetUrl }
