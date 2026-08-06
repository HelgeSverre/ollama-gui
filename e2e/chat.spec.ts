import { test, expect } from '@playwright/test'

const AI_RESPONSE_TIMEOUT = 30000

async function mockOllamaApi(page: import('@playwright/test').Page) {
  await page.route('**/api/tags', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        models: [
          { name: 'llama2', modified_at: '2024-01-01T00:00:00Z', size: 1234567890 },
          { name: 'mistral', modified_at: '2024-01-02T00:00:00Z', size: 9876543210 },
        ],
      }),
    })
  })

  await page.route('**/api/chat', async (route) => {
    const body =
      [
        JSON.stringify({
          model: 'llama2',
          created_at: '2024-01-01T00:00:00Z',
          message: { role: 'assistant', content: 'Hello' },
          done: false,
        }),
        JSON.stringify({
          model: 'llama2',
          created_at: '2024-01-01T00:00:00Z',
          message: { role: 'assistant', content: ' there!' },
          done: false,
        }),
        JSON.stringify({
          model: 'llama2',
          created_at: '2024-01-01T00:00:00Z',
          message: { role: 'assistant', content: '' },
          done: true,
          total_duration: 1000,
          load_duration: 100,
          prompt_eval_count: 5,
          prompt_eval_duration: 200,
          eval_count: 10,
          eval_duration: 700,
        }),
      ].join('\n') + '\n'

    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body,
    })
  })
}

test.describe('Ollama GUI', () => {
  test.beforeEach(async ({ page }) => {
    await mockOllamaApi(page)
    await page.goto('/')
    await page.waitForSelector('[data-testid="chat-input-form"]', { timeout: 10000 })
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases()
      await Promise.all(dbs.map((db) => new Promise<void>((resolve) => {
        const r = indexedDB.deleteDatabase(db.name!)
        r.onsuccess = () => resolve()
        r.onerror = () => resolve()
        r.onblocked = () => resolve()
      })))
    })
    await page.reload()
    await page.waitForSelector('[data-testid="chat-input-form"]', { timeout: 10000 })
  })

  test('creates a new chat', async ({ page }) => {
    const initialCount = await page.locator('[data-testid="chat-item"]').count()

    await page.locator('[data-testid="new-chat-btn"]').click()

    await expect(page.locator('[data-testid="chat-input-form"]')).toBeVisible()
    await expect(page.locator('[data-testid="chat-textarea"]')).toBeVisible()
    await expect(page.locator('[data-testid="chat-item"]')).toHaveCount(initialCount + 1)
  })

  test('sends a message and receives AI response', async ({ page }) => {
    await page.locator('[data-testid="chat-textarea"]').fill('Hello, AI!')
    await page.locator('[data-testid="send-btn"]').click()

    await expect(page.locator('[data-testid="user-message"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="ai-message"]').first()).toBeVisible({
      timeout: AI_RESPONSE_TIMEOUT,
    })
    await expect(page.locator('[data-testid="ai-message"]').first()).toContainText('Hello there!')
  })

  test('regenerates response', async ({ page }) => {
    await page.locator('[data-testid="chat-textarea"]').fill('First message')
    await page.locator('[data-testid="send-btn"]').click()
    await expect(page.locator('[data-testid="ai-message"]').first()).toBeVisible({
      timeout: AI_RESPONSE_TIMEOUT,
    })
    await expect(page.locator('[data-testid="ai-message"]').first()).toContainText('Hello there!')

    await expect(page.locator('[data-testid="regenerate-btn"]')).toBeVisible()
    await page.locator('[data-testid="regenerate-btn"]').click()

    await expect(page.locator('[data-testid="ai-message"]').first()).toBeVisible({
      timeout: AI_RESPONSE_TIMEOUT,
    })
    await expect(page.locator('[data-testid="ai-message"]').first()).toContainText('Hello there!')
  })

  test('switches between chats', async ({ page }) => {
    await page.locator('[data-testid="new-chat-btn"]').click()
    await expect(page.locator('[data-testid="chat-item"]')).toHaveCount(2)

    await page.locator('[data-testid="chat-textarea"]').fill('Message in chat 2')
    await page.locator('[data-testid="send-btn"]').click()
    await expect(page.locator('[data-testid="ai-message"]').first()).toBeVisible({
      timeout: AI_RESPONSE_TIMEOUT,
    })

    await page.locator('[data-testid="chat-item"]').nth(1).click()
    await expect(page.locator('[data-testid="user-message"]').first()).not.toBeVisible()
    await expect(page.locator('[data-testid="ai-message"]').first()).not.toBeVisible()

    await page.locator('[data-testid="chat-item"]').nth(0).click()
    await expect(page.locator('[data-testid="user-message"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="ai-message"]').first()).toBeVisible()
  })

  test('deletes a chat via context menu', async ({ page }) => {
    await page.locator('[data-testid="new-chat-btn"]').click()
    await expect(page.locator('[data-testid="chat-item"]')).toHaveCount(2)

    await page.locator('[data-testid="chat-item"]').first().click({ button: 'right' })

    await expect(page.locator('[data-testid="delete-chat-btn"]')).toBeVisible()

    await page.locator('[data-testid="delete-chat-btn"]').click()

    await expect(page.locator('[data-testid="chat-item"]')).toHaveCount(1)
  })

  test('opens and closes settings overlay', async ({ page }) => {
    await page.locator('[data-testid="settings-btn"]').click()

    await expect(page.locator('[data-testid="settings-overlay"]')).toBeVisible()
    await expect(page.locator('[data-testid="settings-close"]')).toBeVisible()

    await page.locator('[data-testid="settings-close"]').click()
    await expect(page.locator('[data-testid="settings-overlay"]')).not.toBeVisible()

    await page.locator('[data-testid="settings-btn"]').click()
    await expect(page.locator('[data-testid="settings-overlay"]')).toBeVisible()

    await page.locator('[data-testid="settings-backdrop"]').click({ position: { x: 10, y: 10 } })
    await expect(page.locator('[data-testid="settings-overlay"]')).not.toBeVisible()
  })

  test('model selector works', async ({ page }) => {
    const select = page.locator('[data-testid="model-select"]')
    await expect(select).toBeVisible()

    await select.selectOption('mistral')
    await expect(select).toHaveValue('mistral')

    await select.selectOption('llama2')
    await expect(select).toHaveValue('llama2')
  })
})
