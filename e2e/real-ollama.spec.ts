import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Smoke tests against a real Ollama (through the dev server's /api proxy). Skipped unless
 * OLLAMA_REAL=1. Needs the models below pulled:
 *   ollama pull qwen3-vl:2b && ollama pull qwen3:0.6b
 *   OLLAMA_REAL=1 bun run test:e2e real-ollama
 */
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL ?? 'qwen3-vl:2b'
const TEXT_MODEL = process.env.OLLAMA_TEXT_MODEL ?? 'qwen3:0.6b'
const fixture = (name: string) =>
  fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))

test.skip(!process.env.OLLAMA_REAL, 'set OLLAMA_REAL=1 to run against a real Ollama')
test.describe.configure({ timeout: 240_000 })

async function start(page: Page, model: string) {
  await page.goto('/')
  await page.evaluate(async () => {
    localStorage.clear()
    for (const db of await indexedDB.databases()) indexedDB.deleteDatabase(db.name!)
  })
  await page.reload()
  await page.getByTestId('model-select').click()
  await page.getByTestId(`model-option-${model}`).click()
}

async function ask(page: Page, text: string) {
  await page.getByTestId('chat-textarea').fill(text)
  await page.getByTestId('chat-textarea').press('Enter')
  const reply = page.getByTestId('ai-message').last()
  await expect(reply).toHaveAttribute('data-status', 'done', { timeout: 180_000 })
  return (await reply.innerText()).toLowerCase()
}

test('vision model reads an attached image', async ({ page }) => {
  await start(page, VISION_MODEL)
  // Thinking makes small models slow and verbose; the toggle is shown because the model supports it
  await page.getByTestId('think-toggle').click()
  await page.getByTestId('file-input').setInputFiles(fixture('number-42.png'))
  await expect(page.getByTestId('attachment-chip')).toHaveCount(1)
  const answer = await ask(
    page,
    'What number is shown in this image? Reply with just the number.',
  )
  await page.screenshot({ path: 'test-results/real-vision-number.png' })
  expect(answer).toContain('42')
  await expect(
    page.getByTestId('user-message').getByRole('img', { name: 'number-42.png' }),
  ).toBeVisible()
})

test('vision model sees an image dropped onto the composer', async ({ page }) => {
  await start(page, VISION_MODEL)
  await page.getByTestId('think-toggle').click()
  const bytes = readFileSync(fixture('three-circles.png')).toString('base64')
  const drop = await page.evaluateHandle((b64) => {
    const data = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const dt = new DataTransfer()
    dt.items.add(new File([data], 'three-circles.png', { type: 'image/png' }))
    return dt
  }, bytes)
  await page.getByTestId('chat-input-form').dispatchEvent('drop', { dataTransfer: drop })
  await expect(page.getByTestId('attachment-chip')).toHaveCount(1)
  const answer = await ask(
    page,
    'How many circles are in this image, and what colors are they? Answer in one short sentence.',
  )
  await page.screenshot({ path: 'test-results/real-vision-circles.png' })
  expect(answer).toMatch(/three|3/)
  expect(answer).toMatch(/red|green|blue/)
})

test('text and code files are read as part of the message', async ({ page }) => {
  await start(page, VISION_MODEL)
  await page.getByTestId('think-toggle').click()
  await page
    .getByTestId('file-input')
    .setInputFiles([fixture('notes.txt'), fixture('buggy.py')])
  await expect(page.getByTestId('attachment-chip')).toHaveCount(2)
  const answer = await ask(
    page,
    'Two questions. 1) What is the launch codename in notes.txt? 2) What is wrong with the add function in buggy.py? Be brief.',
  )
  await page.screenshot({ path: 'test-results/real-vision-files.png' })
  expect(answer).toContain('blue heron')
  expect(answer).toMatch(/subtract|minus|-|instead of/)
})

test('a text-only model refuses image attachments', async ({ page }) => {
  await start(page, TEXT_MODEL)
  await page.getByTestId('file-input').setInputFiles(fixture('number-42.png'))
  await expect(page.getByTestId('toast')).toContainText("can't read images")
  await expect(page.getByTestId('attachment-chip')).toHaveCount(0)
})
