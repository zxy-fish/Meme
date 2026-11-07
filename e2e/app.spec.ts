import path from 'node:path'
import pkg from '../package.json' with { type: 'json' }
import { expect, test, type Page } from '@playwright/test'

function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

test('library renders the seeded collection', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '我的媒体库' })).toBeVisible()
  await expect(page.getByText('葬送的芙莉莲').first()).toBeVisible()
  await expect(page.getByText('进击的巨人').first()).toBeVisible()
  await expect(page.getByText(`v${pkg.version}`).first()).toBeVisible()
  expect(errors).toEqual([])
})

test('adds a manual media entry', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/')
  await page.getByRole('button', { name: '添加条目' }).click()
  await page.getByRole('button', { name: '手动填写', exact: true }).click()
  await page.getByPlaceholder('例如：葬送的芙莉莲').fill('自动化测试条目')
  await page.getByPlaceholder('2024').fill('2026')
  await page.getByRole('button', { name: '加入媒体库' }).click()
  await expect(page.getByText('自动化测试条目').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('adds and filters a bookmark', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/#/bookmarks')
  await expect(page.getByRole('heading', { name: '网页书签' })).toBeVisible()
  await page.getByRole('button', { name: '添加书签' }).click()
  await page.getByPlaceholder('https://bgm.tv').fill('https://example.com')
  await page.getByPlaceholder('留空则使用域名').fill('示例站点')
  await page.getByPlaceholder('番剧, 数据库').fill('测试, 工具')
  await page.getByRole('button', { name: '保存书签' }).click()
  await expect(page.getByText('示例站点').first()).toBeVisible()
  await page.getByRole('button', { name: /测试/ }).click()
  await expect(page.getByText('示例站点').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('reads a book, turns pages and opens the table of contents', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/#/books')
  await expect(page.getByRole('heading', { name: '我的书架' })).toBeVisible()
  await page.getByRole('link', { name: /夜航书店/ }).first().click()
  await expect(page.getByRole('heading', { name: /第一章 凌晨的书店/ })).toBeVisible()

  const footer = page.locator('footer')
  const before = await footer.innerText()
  await page.keyboard.press('ArrowRight')
  await expect(footer).not.toHaveText(before)

  await page.getByRole('button', { name: '目录' }).click()
  await expect(page.getByText('第二章 借书证')).toBeVisible()
  await page.getByRole('button', { name: /第二章 借书证/ }).click()
  await expect(page.getByRole('heading', { name: /第二章 借书证/ })).toBeVisible()
  expect(errors).toEqual([])
})

test('changes reader theme', async ({ page }) => {
  await page.goto('/#/books')
  await page.getByRole('link', { name: /夜航书店/ }).first().click()
  await page.getByRole('button', { name: '阅读设置' }).click()
  await expect(page.getByText('阅读设置')).toBeVisible()
  await page.getByRole('button', { name: '夜间' }).click()
  await expect(page.locator('.reader-dark')).toBeVisible()
})


test('imports a TXT and opens it in the reader', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/#/books')
  const input = page.locator('input[accept*=".txt"]')
  await input.setInputFiles({
    name: '测试小说.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('第一章 开始\n\n你好，世界。\n\n第二章 继续\n\n再见。', 'utf8'),
  })
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: '创建新媒体条目' }).click()
  await expect(page).toHaveURL(/#\/read\/book-/)
  await expect(page.getByRole('heading', { name: /第一章 开始/ })).toBeVisible()
  expect(errors).toEqual([])
})


test('classifies a TV entry by country and year', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/')
  await page.getByRole('button', { name: '添加条目' }).click()
  await page.getByRole('button', { name: '手动填写', exact: true }).click()
  await page.getByPlaceholder('例如：葬送的芙莉莲').fill('测试日剧')
  await page.getByPlaceholder('2024').fill('2024')
  const selects = page.getByRole('dialog').locator('select')
  await selects.nth(0).selectOption('tv')
  await selects.nth(3).selectOption('JP')
  await page.getByRole('button', { name: '加入媒体库' }).click()

  await expect(page.getByText('测试日剧').first()).toBeVisible()
  await expect(page.getByText('2024 · 日剧').first()).toBeVisible()

  await page.selectOption('select[aria-label="分组方式"]', 'country')
  await expect(page.getByRole('heading', { name: '日本' })).toBeVisible()
  await expect(page.getByText('测试日剧').first()).toBeVisible()

  await page.selectOption('select[aria-label="按国家或地区筛选"]', 'JP')
  await page.selectOption('select[aria-label="按年份筛选"]', '2024')
  await expect(page.getByText('测试日剧').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('stats include year and country breakdowns', async ({ page }) => {
  await page.goto('/#/stats')
  await expect(page.getByRole('heading', { name: '统计' })).toBeVisible()
  await expect(page.getByText('年份分布')).toBeVisible()
  await expect(page.getByText('国家 / 地区')).toBeVisible()
  await expect(page.getByText('日剧').first()).toBeVisible()
  await expect(page.getByText('2014 年').first()).toBeVisible()
})


test('notes can be created, previewed, saved and searched', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/#/notes')
  await expect(page.getByRole('heading', { name: '备忘录', exact: true })).toBeVisible()
  await expect(page.getByText('欢迎来到 Meme 备忘录').first()).toBeVisible()

  await page.getByRole('button', { name: '新建备忘录' }).first().click()
  await expect(page.getByPlaceholder('标题')).toHaveValue('')
  await page.getByPlaceholder('标题').fill('E2E 备忘录')
  await page.locator('textarea[placeholder="开始写点什么…"]').fill('## 小标题\n\n- [ ] 待办事项')
  await page.waitForTimeout(900)
  await page.getByRole('button', { name: '预览' }).click()
  await expect(page.getByText('小标题', { exact: true })).toBeVisible()
  await page.getByRole('checkbox', { name: '标记完成' }).click()
  await expect(page.getByRole('checkbox', { name: '标记未完成' })).toBeVisible()

  await page.getByRole('button', { name: '编辑' }).click()
  await expect(page.getByPlaceholder('标题')).toHaveValue('E2E 备忘录')
  await expect(page.locator('textarea[placeholder="开始写点什么…"]')).toHaveValue(/- \[x\] 待办事项/)

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  await expect(page.getByText('E2E 备忘录').first()).toBeVisible()
  await page.getByPlaceholder('搜索备忘录…').fill('周末')
  await expect(page.getByText('这个周末').first()).toBeVisible()
  expect(errors).toEqual([])
})


test('imports a PDF, links it to a new media item and renders pages', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/#/books')
  await page
    .locator('input[accept=".pdf,application/pdf"]')
    .setInputFiles(path.resolve('e2e/fixtures/sample.pdf'))
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: '创建新媒体条目' }).click()
  await expect(page).toHaveURL(/#\/read\/book-/)
  await expect(page.getByText(/1 \/ 2/)).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: '下一页' }).click()
  await expect(page.getByText(/2 \/ 2/)).toBeVisible()
  // Let the page-2 write finish before a full navigation (IndexedDB writes
  // are aborted if the document goes away mid-transaction).
  await page.waitForTimeout(2_000)

  await page.getByRole('button', { name: '返回书架' }).click()
  await page.getByRole('link', { name: /媒体库/ }).first().click()
  // Target the library grid card (-> #/item/...) instead of the "继续阅读"
  // shelf, whose card opens the reader directly and has no 阅读 button.
  await page.getByRole('main').locator('a[href^="#/item/"]').filter({ hasText: 'sample' }).first().click()
  await page.getByRole('button', { name: '阅读' }).click()
  const readPanel = page.getByRole('main')
  await expect(readPanel.getByText('继续阅读')).toBeVisible()
  await expect(readPanel.getByText(/2 页 · 100%/)).toBeVisible()
  // Reopening the book must restore page 2 (a late PDF load used to reset it
  // to page 1 and overwrite the saved progress with 50%).
  await readPanel.getByRole('link', { name: /继续阅读/ }).first().click()
  await expect(page.getByText(/2 \/ 2/)).toBeVisible({ timeout: 20_000 })
  expect(errors).toEqual([])
})

test('imports comic images and pages through them', async ({ page }) => {
  await page.goto('/#/books')
  await page.locator('input[accept="image/*"]').first().setInputFiles([
    path.resolve('e2e/fixtures/page1.png'),
    path.resolve('e2e/fixtures/page2.png'),
  ])
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: '稍后再说' }).click()
  await page.getByRole('link', { name: /page/ }).first().click()
  await expect(page.getByText(/1 \/ 2/)).toBeVisible()
  await page.getByRole('button', { name: '下一页' }).last().click()
  await expect(page.getByText(/2 \/ 2/)).toBeVisible()
})


test('records reading time and shows it in stats', async ({ page }) => {
  await page.goto('/#/books')
  await page.getByRole('link', { name: /夜航书店/ }).first().click()
  await expect(page.getByRole('heading', { name: /第一章 凌晨的书店/ })).toBeVisible()
  await page.waitForTimeout(6_000)
  await page.goto('/#/stats')
  await page.waitForTimeout(1_200)
  await expect(page.getByText('阅读时间', { exact: true })).toBeVisible()
  await expect(page.getByText('最近 14 天')).toBeVisible()
  await expect(page.getByText('今日', { exact: true })).toBeVisible()
})


test('continues reading from the library and saves on exit', async ({ page }) => {
  await page.goto('/#/books')
  await page.getByRole('link', { name: /夜航书店/ }).first().click()
  await expect(page.getByRole('heading', { name: /第一章 凌晨的书店/ })).toBeVisible()
  await page.getByRole('button', { name: '返回书架' }).click()
  await page.getByRole('link', { name: /媒体库/ }).first().click()
  await expect(page.getByRole('heading', { name: '继续阅读' })).toBeVisible()
  await page.getByRole('link', { name: /夜航书店/ }).first().click()
  await expect(page.getByRole('heading', { name: /第一章 凌晨的书店/ })).toBeVisible()
})


test('caches covers and cleans deleted content', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/#/')
  await expect(page.getByRole('heading', { name: '我的媒体库' })).toBeVisible()
  await page.waitForTimeout(800)
  await page.evaluate(async () => {
    const open = () =>
      new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('meme')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    const db = await open()
    const tx = db.transaction('media', 'readwrite')
    const store = tx.objectStore('media')
    const all = await new Promise<any[]>((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    if (all[0]) {
      all[0].cover = location.origin + '/covers/interstellar.jpg'
      store.put(all[0])
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1_500)
  await page.goto('/#/settings')
  await expect(page.getByText('存储', { exact: true })).toBeVisible()
  await expect(page.getByText('1 张', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: /清空封面缓存/ }).click()
  await expect(page.getByText('0 张', { exact: true }).first()).toBeVisible()

  await page.goto('/#/books')
  const card = page.locator('article').filter({ hasText: '夜航书店' }).first()
  await card.hover()
  await card.getByRole('button', { name: '删除书籍' }).click()
  await card.getByRole('button', { name: '删除书籍' }).click()
  await page.goto('/#/settings')
  await page.getByRole('button', { name: /清理已删除书籍/ }).click()
  await expect(page.getByText(/已清理 1 本/)).toBeVisible()
  expect(errors).toEqual([])
})

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })


  test('notes list opens the editor and goes back', async ({ page }) => {
    await page.goto('/#/notes')
    await expect(page.getByText('欢迎来到 Meme 备忘录').first()).toBeVisible()
    await page.getByText('欢迎来到 Meme 备忘录').first().click()
    await expect(page.getByRole('button', { name: '返回备忘录列表' })).toBeVisible()
    await page.getByRole('button', { name: '返回备忘录列表' }).click()
    await expect(page.getByPlaceholder('搜索备忘录…')).toBeVisible()
  })

  test('bottom navigation and floating action work', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: '我的媒体库' })).toBeVisible()
    const fab = page.getByRole('button', { name: '添加条目' })
    await expect(fab).toBeVisible()
    await fab.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()

    await page.getByRole('link', { name: '书签' }).last().click()
    await expect(page.getByRole('heading', { name: '网页书签' })).toBeVisible()
    expect(errors).toEqual([])
  })
})

test('desktop update panel checks and reports updates', async ({ page }) => {
  // The panel is desktop-only; stub the preload bridge before the app boots.
  await page.addInitScript(() => {
    let emit: ((state: unknown) => void) | undefined
    ;(window as any).memeDesktop = {
      platform: 'win32',
      electron: '45.2.3',
      appInfo: async () => ({ version: '1.1.0', platform: 'win32', packaged: true, updatable: true }),
      updates: {
        getState: async () => ({ status: 'idle', version: null, percent: 0, message: null }),
        check: async () => {
          const next = { status: 'latest', version: '1.1.0', percent: 0, message: null }
          emit?.(next)
          return next
        },
        download: async () => ({ status: 'idle', version: null, percent: 0, message: null }),
        install: async () => true,
        onState: (callback: (state: unknown) => void) => {
          emit = callback
          return () => {
            emit = undefined
          }
        },
      },
    }
  })

  await page.goto('/#/settings')
  await expect(page.getByText('应用更新')).toBeVisible()
  await expect(page.getByText(/当前 v1\.1\.0/)).toBeVisible()
  await page.getByRole('button', { name: '检查更新' }).click()
  await expect(page.getByText('已是最新版本')).toBeVisible()
})
