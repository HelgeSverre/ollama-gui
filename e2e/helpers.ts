import { expect, type Page, type Route } from '@playwright/test'

/**
 * UI tests against a mocked Ollama API. Requests are recorded so tests can assert on the
 * wire format (images, think, options).
 */
export interface Mock {
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

export async function mockOllama(page: Page): Promise<Mock> {
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

export async function freshPage(page: Page) {
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

export async function send(page: Page, text: string) {
  await page.getByTestId('chat-textarea').fill(text)
  await page.getByTestId('chat-textarea').press('Enter')
}


/**
 * Replaces /api/chat streaming with streams the test drives chunk by chunk, so mid-reply behaviour
 * (stop, reload, switching chats, deleting) can be exercised. Non-streaming calls (titles) and
 * every other endpoint still go through the route mock.
 */
export async function manualStreams(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>
    const original = window.fetch.bind(window)
    const streams: { push(o: object): void; close(): void; body: unknown }[] = []
    w.__streams = streams
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null
      if (!url.endsWith('/api/chat') || body?.stream === false) return original(input, init)
      let controller!: ReadableStreamDefaultController<Uint8Array>
      const stream = new ReadableStream<Uint8Array>({ start: (c) => (controller = c) })
      const encoder = new TextEncoder()
      streams.push({
        body,
        push: (o) => controller.enqueue(encoder.encode(JSON.stringify(o) + '\n')),
        close: () => controller.close(),
      })
      init?.signal?.addEventListener('abort', () => {
        try {
          controller.error(new DOMException('aborted', 'AbortError'))
        } catch {
          // already closed
        }
      })
      return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } })
    }
  })
  const call = (fn: string, index: number, arg?: unknown) =>
    page.evaluate(
      ([fn, index, arg]) => {
        const streams = (window as unknown as { __streams: Record<string, (a?: unknown) => void>[] }).__streams
        const s = streams.at(index as number)!
        if (fn === 'push') s.push({ model: 'llama3.2', message: { role: 'assistant', content: arg }, done: false })
        else if (fn === 'done') {
          s.push({ model: 'llama3.2', done: true, eval_count: 3, eval_duration: 1e8, total_duration: 2e8 })
          s.close()
        } else s.close()
      },
      [fn, index, arg] as const,
    )
  return {
    count: () => page.evaluate(() => (window as unknown as { __streams: unknown[] }).__streams.length),
    push: (index: number, text: string) => call('push', index, text),
    done: (index: number) => call('done', index),
    /** Ends the body without a done chunk, like a dropped connection. */
    drop: (index: number) => call('drop', index),
  }
}

/** Row count in an IndexedDB object store, read directly. */
export function countRows(page: Page, store: string, chatId?: string) {
  return page.evaluate(
    ([store, chatId]) =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('ChatDatabase')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const tx = open.result.transaction(store as string, 'readonly')
          const source = chatId ? tx.objectStore(store as string).index('chatId') : tx.objectStore(store as string)
          const req = chatId ? source.count(chatId as string) : source.count()
          req.onsuccess = () => {
            resolve(req.result)
            open.result.close()
          }
        }
      }),
    [store, chatId ?? null] as const,
  )
}

export const activeChatId = (page: Page) => page.evaluate(() => localStorage.getItem('ollama-gui:active-chat') ?? '')
