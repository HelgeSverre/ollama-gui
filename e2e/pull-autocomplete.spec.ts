import { expect, test, type Page } from '@playwright/test'
import { freshPage } from './helpers'

/** Model search in the Models dialog, backed by the bundled Ollama library catalog. */
async function openModels(page: Page) {
  const mock = await freshPage(page)
  await page.getByTestId('models-btn').click()
  const input = page.getByTestId('pull-input')
  await expect(input).toBeVisible()
  return { mock, input }
}

const suggestions = (page: Page) => page.getByTestId('pull-suggestion')

test.describe('model search', () => {
  test('suggests library models while typing and pulls the chosen one', async ({
    page,
  }) => {
    const { mock, input } = await openModels(page)
    await input.fill('qwe')
    await expect(suggestions(page).first()).toContainText('qwen')
    const first = (
      await suggestions(page).first().locator('span').first().innerText()
    ).trim()
    await input.press('Enter')
    await expect.poll(() => mock.pullRequests).toEqual([first])
    await expect(input).toHaveValue('')
  })

  test('arrow keys move the selection', async ({ page }) => {
    const { mock, input } = await openModels(page)
    await input.fill('llama')
    await expect(suggestions(page).nth(1)).toBeVisible()
    await input.press('ArrowDown')
    await expect(suggestions(page).nth(1)).toHaveAttribute('aria-selected', 'true')
    const second = (
      await suggestions(page).nth(1).locator('span').first().innerText()
    ).trim()
    await input.press('Enter')
    await expect.poll(() => mock.pullRequests).toEqual([second])
  })

  test('a size chip pulls that exact tag', async ({ page }) => {
    const { mock, input } = await openModels(page)
    await input.fill('qwen3')
    await page.getByTestId('pull-size-qwen3-8b').click()
    await expect.poll(() => mock.pullRequests).toEqual(['qwen3:8b'])
  })

  test('Tab completes the name and lists its sizes', async ({ page }) => {
    const { mock, input } = await openModels(page)
    await input.fill('deepseek-r')
    await expect(suggestions(page).first()).toContainText('deepseek-r1')
    await input.press('Tab')
    await expect(input).toHaveValue('deepseek-r1:')
    await expect(suggestions(page).first()).toContainText('deepseek-r1:')
    await input.pressSequentially('1.')
    await expect(suggestions(page)).toHaveCount(1)
    await input.press('Enter')
    await expect.poll(() => mock.pullRequests).toEqual(['deepseek-r1:1.5b'])
  })

  test('shows popular models that are not installed when empty', async ({ page }) => {
    await openModels(page)
    await page.getByTestId('pull-input').focus()
    await expect(page.getByTestId('pull-suggestions')).toContainText('Popular')
    await expect(suggestions(page).first()).toBeVisible()
    // The mock has llama3.2, llava and qwen3 installed
    const names = await suggestions(page).locator('span:first-child').allInnerTexts()
    for (const installed of ['llama3.2', 'llava', 'qwen3'])
      expect(names).not.toContain(installed)
  })

  test('marks models that are already installed', async ({ page }) => {
    const { input } = await openModels(page)
    await input.fill('llava')
    await expect(suggestions(page).first()).toContainText('Installed')
  })

  test('Escape closes the list but keeps the dialog open', async ({ page }) => {
    const { input } = await openModels(page)
    await input.fill('gemma')
    await expect(page.getByTestId('pull-suggestions')).toBeVisible()
    await input.press('Escape')
    await expect(page.getByTestId('pull-suggestions')).toHaveCount(0)
    await expect(page.getByRole('dialog', { name: 'Models' })).toBeVisible()
  })

  test('pulls free text that is not in the catalog', async ({ page }) => {
    const { mock, input } = await openModels(page)
    await input.fill('hf.co/someone/custom-model:Q4_K_M')
    await expect(page.getByTestId('pull-suggestions')).toHaveCount(0)
    await input.press('Enter')
    await expect
      .poll(() => mock.pullRequests)
      .toEqual(['hf.co/someone/custom-model:Q4_K_M'])
  })

  test('the suggestion list is not clipped by the dialog', async ({ page }) => {
    const { input } = await openModels(page)
    await input.fill('qwen')
    const list = await page.getByTestId('pull-suggestions').boundingBox()
    const dialog = await page.getByRole('dialog', { name: 'Models' }).boundingBox()
    expect(list && dialog).toBeTruthy()
    expect(list!.y + list!.height).toBeLessThanOrEqual(dialog!.y + dialog!.height)
  })
})
