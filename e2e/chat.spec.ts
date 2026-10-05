import { expect, test } from '@playwright/test'
import { freshPage, send } from './helpers'

test.describe('Ollama GUI', () => {
  test('sends a message, streams the reply and auto-titles the chat', async ({
    page,
  }) => {
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
    await expect(
      page.getByTestId('user-message').getByTestId('branch-nav'),
    ).toContainText('2/2')
    expect(mock.chatRequests.at(-1).messages).toEqual([
      { role: 'user', content: 'Better question' },
    ])
  })

  test('sends images to vision models as images[]', async ({ page }) => {
    const mock = await freshPage(page)
    await page.getByTestId('model-select').click()
    await page.getByTestId('model-option-llava').click()
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    )
    await page
      .getByTestId('file-input')
      .setInputFiles({ name: 'dot.png', mimeType: 'image/png', buffer: png })
    await expect(page.getByTestId('attachment-chip')).toHaveCount(1)
    await send(page, 'What is this?')
    await expect(page.getByTestId('ai-message')).toHaveAttribute('data-status', 'done')
    const message = mock.chatRequests[0].messages[0]
    expect(message.content).toBe('What is this?')
    expect(message.images).toEqual([png.toString('base64')])
    await expect(
      page.getByTestId('user-message').getByRole('img', { name: 'dot.png' }),
    ).toBeVisible()
  })

  test('rejects images for non-vision models', async ({ page }) => {
    await freshPage(page)
    await page.getByTestId('model-select').click()
    await page.getByTestId('model-option-llama3.2').click()
    await page
      .getByTestId('file-input')
      .setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: Buffer.from('x') })
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
    await expect(page.getByTestId('ai-message').nth(1)).toHaveAttribute(
      'data-status',
      'done',
    )
    expect(mock.chatRequests[1].think).toBe(false)
  })

  test('system prompt from chat settings is sent first', async ({ page }) => {
    const mock = await freshPage(page)
    await page.getByTestId('chat-settings-btn').click()
    await page.getByTestId('system-prompt-input').fill('Answer like a pirate')
    await page.getByTestId('save-chat-settings').click()
    await send(page, 'Hello')
    await expect(page.getByTestId('ai-message')).toHaveAttribute('data-status', 'done')
    expect(mock.chatRequests[0].messages[0]).toEqual({
      role: 'system',
      content: 'Answer like a pirate',
    })
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
    await expect(page.getByTestId('connection-banner')).toContainText(
      "Can't reach Ollama",
    )
  })
})

test.describe('chat management', () => {
  test('command palette opens Settings and Models', async ({ page }) => {
    await freshPage(page)
    for (const [label, title] of [
      ['Settings', 'Settings'],
      ['Manage models', 'Models'],
    ]) {
      await page.getByTestId('chat-textarea').press('ControlOrMeta+k')
      await page.getByRole('option', { name: label, exact: true }).click()
      await expect(page.getByRole('dialog', { name: title })).toBeVisible()
      await page
        .getByRole('dialog', { name: title })
        .getByRole('button', { name: 'Close' })
        .click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
    }
  })

  test('branches a reply into a new chat', async ({ page }) => {
    await freshPage(page)
    await send(page, 'Original question')
    await expect(page.getByTestId('ai-message')).toHaveAttribute('data-status', 'done')
    await page.getByRole('button', { name: 'Branch in new chat' }).click()
    await expect(page.getByTestId('chat-item')).toHaveCount(2)
    await expect(page.getByTestId('chat-title')).toContainText('(branch)')
    await expect(page.getByTestId('user-message')).toContainText('Original question')
  })

  test('pins and archives chats', async ({ page }) => {
    await freshPage(page)
    await send(page, 'Keep me')
    await expect(page.getByTestId('ai-message')).toHaveAttribute('data-status', 'done')
    const openMenu = async () => {
      await page.getByTestId('chat-item').first().hover()
      await page
        .getByRole('button', { name: /Actions for/ })
        .first()
        .click()
    }
    await openMenu()
    await page.getByRole('menuitem', { name: 'Pin' }).click()
    await expect(page.getByRole('heading', { name: 'Pinned' })).toBeVisible()
    await openMenu()
    await page.getByRole('menuitem', { name: 'Archive' }).click()
    await expect(page.getByTestId('chat-item')).toHaveCount(0)
    await page.getByRole('button', { name: /Archived \(1\)/ }).click()
    await page.getByRole('button', { name: 'Restore' }).click({ force: true })
    await expect(page.getByTestId('chat-item')).toHaveCount(1)
  })

  test('exports and re-imports all chats', async ({ page }) => {
    await freshPage(page)
    await send(page, 'Export me')
    await expect(page.getByTestId('ai-message')).toHaveAttribute('data-status', 'done')
    await page.getByTestId('settings-btn').click()
    const download = page.waitForEvent('download')
    await page.getByTestId('export-chats').click()
    const path = await (await download).path()
    await page.getByTestId('delete-all-chats').click()
    await page.getByTestId('confirm-btn').click()
    await expect(page.getByTestId('chat-item')).toHaveCount(0)
    // Settings stays open behind the confirm dialog
    await page.getByTestId('import-input').setInputFiles(path)
    await expect(
      page.getByTestId('toast').filter({ hasText: 'Imported 1 chat' }),
    ).toBeVisible()
    await expect(page.getByTestId('chat-item')).toHaveCount(1)
  })

  test('a model-level system prompt applies to new chats with that model', async ({
    page,
  }) => {
    const mock = await freshPage(page)
    await page.getByTestId('chat-settings-btn').click()
    await page.getByRole('tab', { name: 'Model' }).click()
    await page.getByTestId('system-prompt-input').fill('You are a llama')
    await page.getByTestId('save-chat-settings').click()
    await send(page, 'Who are you?')
    await expect(page.getByTestId('ai-message')).toHaveAttribute('data-status', 'done')
    expect(mock.chatRequests[0].messages[0]).toEqual({
      role: 'system',
      content: 'You are a llama',
    })
  })

  test('inlines text file attachments into the message', async ({ page }) => {
    const mock = await freshPage(page)
    await page.getByTestId('file-input').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('remember the milk'),
    })
    await send(page, 'Summarise')
    await expect(page.getByTestId('ai-message')).toHaveAttribute('data-status', 'done')
    expect(mock.chatRequests[0].messages[0].content).toBe(
      'File: notes.txt\n```\nremember the milk\n```\n\nSummarise',
    )
  })

  test('keyboard: new chat shortcut and ArrowUp to edit', async ({ page }) => {
    const mock = await freshPage(page)
    mock.replies.push('one', 'two')
    await send(page, 'First')
    await expect(page.getByTestId('ai-message')).toHaveAttribute('data-status', 'done')
    await page.getByTestId('chat-textarea').press('ArrowUp')
    await expect(page.getByTestId('edit-textarea')).toBeFocused()
    await page.getByTestId('edit-textarea').fill('First, edited')
    await page.getByTestId('edit-textarea').press('Enter')
    await expect(page.getByTestId('ai-message')).toContainText('two')
    await page.getByTestId('chat-textarea').press('ControlOrMeta+Shift+O')
    await expect(page.getByText('How can I help?')).toBeVisible()
  })

  test('mobile: the sidebar is a drawer', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 800 })
    await freshPage(page)
    const sidebar = page.getByRole('complementary', { name: 'Chats' })
    await expect(sidebar).not.toBeInViewport()
    await page.getByRole('button', { name: 'Open sidebar' }).click()
    await expect(sidebar).toBeInViewport()
    await page.getByRole('button', { name: 'Close sidebar' }).click()
    await expect(sidebar).not.toBeInViewport()
  })
})
