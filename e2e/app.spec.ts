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

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

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
