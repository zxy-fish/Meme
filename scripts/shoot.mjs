import { chromium } from 'playwright'

const base = 'http://127.0.0.1:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const errors = []

async function open(width, height, mobile = false) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 2,
    isMobile: mobile,
    hasTouch: mobile,
  })
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`) })
  page.on('response', (res) => { if (res.status() >= 400) errors.push(`${res.status()} ${res.url()}`) })
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  return page
}

const desktop = await open(1440, 1000)
console.log('media count:', await desktop.locator('a[href^="#/item/"]').count())
await desktop.screenshot({ path: '.shots/home-desktop.png', fullPage: true })

// manual add
await desktop.locator('button:has-text("添加条目")').first().click()
await desktop.waitForTimeout(400)
await desktop.locator('button:has-text("手动填写")').first().click()
await desktop.waitForTimeout(300)
await desktop.locator('input[placeholder="例如：葬送的芙莉莲"]').fill('测试条目')
await desktop.locator('input[placeholder="2024"]').fill('2026')
await desktop.screenshot({ path: '.shots/add-form.png' })
await desktop.locator('button:has-text("加入媒体库")').click()
await desktop.waitForTimeout(700)
console.log('after add:', await desktop.locator('a[href^="#/item/"]').count())
console.log('test item visible:', await desktop.locator('text=测试条目').first().isVisible())

// bookmarks
await desktop.locator('a[href="#/bookmarks"]').first().click()
await desktop.waitForTimeout(500)
await desktop.locator('button:has-text("添加书签")').first().click()
await desktop.waitForTimeout(300)
await desktop.locator('input[placeholder="https://bgm.tv"]').fill('https://example.com')
await desktop.locator('input[placeholder="留空则使用域名"]').fill('Example 站点')
await desktop.locator('input[placeholder="番剧, 数据库"]').fill('测试, 工具')
await desktop.locator('button:has-text("保存书签")').click()
await desktop.waitForTimeout(600)
console.log('bookmark visible:', await desktop.locator('text=Example 站点').first().isVisible())
await desktop.screenshot({ path: '.shots/bookmarks-desktop.png', fullPage: true })

// books + reader
await desktop.locator('a[href="#/books"]').first().click()
await desktop.waitForTimeout(500)
await desktop.screenshot({ path: '.shots/books-desktop.png', fullPage: true })
await desktop.locator('a[href^="#/read/"]').first().click()
await desktop.waitForTimeout(1200)
await desktop.screenshot({ path: '.shots/reader-desktop.png' })
await desktop.keyboard.press('ArrowRight')
await desktop.waitForTimeout(500)
await desktop.screenshot({ path: '.shots/reader-page2.png' })
await desktop.locator('button[aria-label="阅读设置"]').click()
await desktop.waitForTimeout(500)
await desktop.screenshot({ path: '.shots/reader-settings.png' })
await desktop.keyboard.press('Escape')
await desktop.goBack()
await desktop.waitForTimeout(600)
console.log('book progress:', await desktop.locator('text=2 / 3').first().isVisible().catch(() => false))

// mobile
const mobile = await open(390, 844, true)
console.log('mobile fab visible:', await mobile.locator('button[aria-label="添加条目"]').isVisible())
await mobile.screenshot({ path: '.shots/home-mobile.png' })
await mobile.locator('button[aria-label="添加条目"]').click()
await mobile.waitForTimeout(400)
await mobile.screenshot({ path: '.shots/add-mobile.png' })
await mobile.keyboard.press('Escape')
await mobile.locator('a[href="#/books"]').last().click()
await mobile.waitForTimeout(700)
await mobile.screenshot({ path: '.shots/books-mobile.png' })
await mobile.locator('a[href^="#/read/"]').first().click()
await mobile.waitForTimeout(1200)
await mobile.screenshot({ path: '.shots/reader-mobile.png' })
await mobile.locator('button[aria-label="目录"]').click()
await mobile.waitForTimeout(500)
await mobile.screenshot({ path: '.shots/reader-toc-mobile.png' })

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none')
await browser.close()
