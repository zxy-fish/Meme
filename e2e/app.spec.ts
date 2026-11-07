import path from 'node:path'
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

  await page.getByRole('button', { name: '编辑' }).click()
  await expect(page.getByPlaceholder('标题')).toHaveValue('E2E 备忘录')

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

  await page.goto('/#/')
  await page.getByText('sample').first().click()
  await page.getByRole('button', { name: '阅读' }).click()
  await expect(page.getByText('继续阅读')).toBeVisible()
  await expect(page.getByText(/2 页 · 100%/)).toBeVisible()
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
