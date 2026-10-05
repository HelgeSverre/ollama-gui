import { expect, test, type Page, type Route } from '@playwright/test'

/**
 * UI tests against a mocked Ollama API. Requests are recorded so tests can assert on the
 * wire format (images, think, options).
 */
interface Mock {
  chatRequests: any[]
  replies: string[]
}

const MODELS = [
  { name: 'llama3.2', model: 'llama3.2', size: 2_000_000_000, digest: 'a', modified_at: '2026-01-01T00:00:00Z', details: { parameter_size: '3B', quantization_level: 'Q4_K_M' } },
  { name: 'llava', model: 'llava', size: 4_700_000_000, digest: 'b', modified_at: '2026-01-02T00:00:00Z', details: { parameter_size: '7B' } },
  { name: 'qwen3', model: 'qwen3', size: 5_200_000_000, digest: 'c', modified_at: '2026-01-03T00:00:00Z', details: { family: 'qwen3' } },
]
const CAPS: Record<string, string[]> = {
  'llama3.2': ['completion', 'tools'],
  llava: ['completion', 'vision'],
  qwen3: ['completion', 'thinking', 'tools'],
}

const ndjson = (lines: object[]) => lines.map((l) => JSON.stringify(l)).join('\n') + '\n'

async function mockOllama(page: Page): Promise<Mock> {
  const mock: Mock = { chatRequests: [], replies: [] }
  await page.route('**/api/**', async (route: Route) => {
    const url = new URL(route.request().url())
    const body = route.request().postDataJSON?.() ?? null
    switch (url.pathname) {
      case '/api/tags':
        return route.fulfill({ json: { models: MODELS } })
      case '/api/ps':
        return route.fulfill({ json: { models: [] } })
      case '/api/show':
        return route.fulfill({ json: { capabilities: CAPS[body.model] ?? ['completion'], model_info: { 'llama.context_length': 131072 }, details: {} } })
      case '/api/chat': {
        if (body.stream === false) return route.fulfill({ json: { message: { role: 'assistant', content: 'Mock Title' } } })
        mock.chatRequests.push(body)
        const reply = mock.replies.shift() ?? 'Hello there!'
        const lines: object[] = []
        if (body.think !== false && CAPS[body.model]?.includes('thinking')) lines.push({ model: body.model, message: { role: 'assistant', content: '', thinking: 'Considering the question.' }, done: false })
        for (const word of reply.split(/(?<= )/)) lines.push({ model: body.model, message: { role: 'assistant', content: word }, done: false })
        lines.push({ model: body.model, done: true, done_reason: 'stop', total_duration: 1e9, eval_count: 12, eval_duration: 5e8, prompt_eval_count: 20 })
        return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(lines) })
      }
      case '/api/pull':
        return route.fulfill({
          contentType: 'application/x-ndjson',
          body: ndjson([
            { status: 'pulling manifest' },
            { status: 'downloading', digest: 'sha256:1', total: 1000, completed: 500 },
            { status: 'success' },
          ]),
        })
      default:
        return route.fulfill({ json: {} })
    }
  })
  return mock
}

async function freshPage(page: Page) {
  const mock = await mockOllama(page)
  await page.goto('/')
  await page.evaluate(async () => {
    localStorage.clear()
    for (const db of await indexedDB.databases()) indexedDB.deleteDatabase(db.name!)
  })
  await page.reload()
  await expect(page.getByTestId('chat-textarea')).toBeVisible()
  return mock
}

async function send(page: Page, text: string) {
  await page.getByTestId('chat-textarea').fill(text)
  await page.getByTestId('chat-textarea').press('Enter')
}

test.describe('Ollama GUI', () => {
  test('sends a message, streams the reply and auto-titles the chat', async ({ page }) => {
    const mock = await freshPage(page)
    await send(page, 'Hi')
    await expect(page.getByTestId('ai-message')).toContainText('Hello there!')
    await expect(page.getByTestId('ai-message')).toHaveAttribute('data-status', 'done')
    await expect(page.getByTestId('chat-title')).toHaveText('Mock Title')
    await expect(page.getByTestId('chat-item')).toHaveCount(1)
    expect(mock.chatRequests[0].messages).toEqual([{ role: 'user', content: 'Hi' }])
  })

  test('history survives a reload', async ({ page }) => {
    await freshPage(page)
    await send(page, 'Remember me')
    await expect(page.getByTestId('ai-message')).toHaveAttribute('data-status', 'done')
    await page.reload()
    await expect(page.getByTestId('user-message')).toContainText('Remember me')
    await expect(page.getByTestId('ai-message')).toContainText('Hello there!')
  })

  test('regenerate and edit create versions with arrows', async ({ page }) => {
    const mock = await freshPage(page)
    mock.replies.push('First answer', 'Second answer', 'Edited answer')
    await send(page, 'Question')
    await expect(page.getByTestId('ai-message')).toContainText('First answer')

    await page.getByTestId('regenerate-btn').click()
    await expect(page.getByTestId('ai-message')).toContainText('Second answer')
    const nav = page.getByTestId('ai-message').getByTestId('branch-nav')
    await expect(nav).toContainText('2/2')
    await nav.getByRole('button', { name: 'Previous version' }).click()
    await expect(page.getByTestId('ai-message')).toContainText('First answer')

    await page.getByTestId('user-message').hover()
    await page.getByTestId('edit-btn').click()
    await page.getByTestId('edit-textarea').fill('Better question')
    await page.getByTestId('edit-submit').click()
    await expect(page.getByTestId('ai-message')).toContainText('Edited answer')
    await expect(page.getByTestId('user-message').getByTestId('branch-nav')).toContainText('2/2')
    expect(mock.chatRequests.at(-1).messages).toEqual([{ role: 'user', content: 'Better question' }])
  })

  test('sends images to vision models as images[]', async ({ page }) => {
    const mock = await freshPage(page)
    await page.getByTestId('model-select').click()
    await page.getByTestId('model-option-llava').click()
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
    await page.getByTestId('file-input').setInputFiles({ name: 'dot.png', mimeType: 'image/png', buffer: png })
    await expect(page.getByTestId('attachment-chip')).toHaveCount(1)
    await send(page, 'What is this?')
    await expect(page.getByTestId('ai-message')).toHaveAttribute('data-status', 'done')
    const message = mock.chatRequests[0].messages[0]
    expect(message.content).toBe('What is this?')
    expect(message.images).toEqual([png.toString('base64')])
    await expect(page.getByTestId('user-message').getByRole('img', { name: 'dot.png' })).toBeVisible()
  })

  test('rejects images for non-vision models', async ({ page }) => {
    await freshPage(page)
    await page.getByTestId('model-select').click()
    await page.getByTestId('model-option-llama3.2').click()
    await page.getByTestId('file-input').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: Buffer.from('x') })
    await expect(page.getByTestId('toast')).toContainText("can't read images")
    await expect(page.getByTestId('attachment-chip')).toHaveCount(0)
  })

  test('thinking models stream a reasoning block', async ({ page }) => {
    const mock = await freshPage(page)
    await page.getByTestId('model-select').click()
    await page.getByTestId('model-option-qwen3').click()
    await expect(page.getByTestId('think-toggle')).toBeVisible()
    await send(page, 'Think about it')
    await expect(page.getByTestId('reasoning')).toContainText(/Thought for|Thoughts/)
    expect(mock.chatRequests[0].think).toBeUndefined()

    await page.getByTestId('think-toggle').click()
    await send(page, 'Now without thinking')
    await expect(page.getByTestId('ai-message').nth(1)).toHaveAttribute('data-status', 'done')
    expect(mock.chatRequests[1].think).toBe(false)
  })

  test('system prompt from chat settings is sent first', async ({ page }) => {
    const mock = await freshPage(page)
    await page.getByTestId('chat-settings-btn').click()
    await page.getByTestId('system-prompt-input').fill('Answer like a pirate')
    await page.getByTestId('save-chat-settings').click()
    await send(page, 'Hello')
    await expect(page.getByTestId('ai-message')).toHaveAttribute('data-status', 'done')
    expect(mock.chatRequests[0].messages[0]).toEqual({ role: 'system', content: 'Answer like a pirate' })
  })

  test('deletes a chat after confirmation', async ({ page }) => {
    await freshPage(page)
    await send(page, 'Delete me')
    await expect(page.getByTestId('chat-item')).toHaveCount(1)
    await page.getByTestId('chat-item').hover()
    await page.getByRole('button', { name: /Actions for/ }).click()
    await page.getByTestId('delete-chat-btn').click()
    await page.getByTestId('confirm-btn').click()
    await expect(page.getByTestId('chat-item')).toHaveCount(0)
  })

  test('command palette finds messages by content', async ({ page }) => {
    await freshPage(page)
    await send(page, 'The secret word is pineapple')
    await expect(page.getByTestId('ai-message')).toHaveAttribute('data-status', 'done')
    await page.getByTestId('new-chat-btn').click()
    await page.getByTestId('chat-textarea').press('ControlOrMeta+k')
    await page.getByPlaceholder('Search chats, messages and commands…').fill('pineapple')
    await page.getByRole('option', { name: /pineapple/ }).click()
    await expect(page.getByTestId('user-message')).toContainText('pineapple')
  })

  test('pulls a model with progress', async ({ page }) => {
    await freshPage(page)
    await page.getByTestId('models-btn').click()
    await page.getByTestId('pull-input').fill('tinyllama')
    await page.getByTestId('pull-input').press('Enter')
    await expect(page.getByTestId('pull-job')).toHaveCount(0)
    await expect(page.getByTestId('installed-model')).toHaveCount(3)
  })

  test('theme and locale settings apply', async ({ page }) => {
    await freshPage(page)
    await page.getByTestId('settings-btn').click()
    await page.getByTestId('theme-light').click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await page.getByTestId('theme-dark').click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.getByTestId('locale-select').selectOption('de-DE')
    await expect(page.getByTestId('locale-preview')).toContainText('1.234.567,89')
    await expect(page.getByTestId('locale-preview')).toContainText('vorgestern')
  })

  test('shows a connection banner when Ollama is unreachable', async ({ page }) => {
    await page.route('**/api/**', (route) => route.abort())
    await page.goto('/')
    await expect(page.getByTestId('connection-banner')).toContainText("Can't reach Ollama")
  })
})
