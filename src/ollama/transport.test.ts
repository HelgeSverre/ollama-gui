import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyEvent, type ChatEvent } from '../domain/parts'
import type { MessageNode, Part } from '../domain/types'
import { resolveHost } from './client'
import { buildChatRequest, chatEvents } from './transport'

vi.mock('../composables/useSettings', async () => {
  const { ref } = await import('vue')
  return { ollamaUrl: ref('http://ollama.test:11434') }
})

function ndjsonResponse(lines: object[], split = 7) {
  const text = lines.map((l) => JSON.stringify(l)).join('\n') + '\n'
  const encoder = new TextEncoder()
  // Deliberately split mid-line to exercise buffering
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < text.length; i += split)
        controller.enqueue(encoder.encode(text.slice(i, i + split)))
      controller.close()
    },
  })
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson' },
  })
}

async function collect(events: AsyncGenerator<ChatEvent>) {
  const out: ChatEvent[] = []
  for await (const e of events) out.push(e)
  return out
}

const node = (role: MessageNode['role'], parts: Part[]): MessageNode => ({
  id: role,
  chatId: 'c',
  parentId: null,
  role,
  parts,
  status: 'done',
  createdAt: new Date(),
})

afterEach(() => vi.unstubAllGlobals())

describe('resolveHost', () => {
  it('prefers the user setting and strips /api', () => {
    expect(resolveHost('http://box:11434/api/', undefined, false, 'http://ui')).toBe(
      'http://box:11434',
    )
  })
  it('uses the build-time env, with "/" meaning same origin', () => {
    expect(resolveHost('', '/', false, 'http://ui:8080')).toBe('http://ui:8080')
    expect(resolveHost('', 'http://gpu:11434', false, 'http://ui')).toBe(
      'http://gpu:11434',
    )
  })
  it('adds http:// when the scheme is missing', () => {
    expect(resolveHost('localhost:11434', undefined, false, 'http://ui')).toBe(
      'http://localhost:11434',
    )
    expect(resolveHost('192.168.1.5:11434/api', undefined, false, 'http://ui')).toBe(
      'http://192.168.1.5:11434',
    )
    expect(resolveHost('https://ollama.example.com', undefined, false, 'http://ui')).toBe(
      'https://ollama.example.com',
    )
  })
  it('uses the dev proxy in dev and localhost otherwise', () => {
    expect(resolveHost('', undefined, true, 'http://lan-ip:5173')).toBe(
      'http://lan-ip:5173',
    )
    expect(resolveHost('', undefined, false, 'http://ui')).toBe('http://localhost:11434')
  })
})

describe('buildChatRequest', () => {
  it('sends images, inlines text files and prepends the system prompt', () => {
    const user = node('user', [
      { type: 'file', mediaType: 'image/png', name: 'a.png', data: 'QUJD' },
      { type: 'file', mediaType: 'text/plain', name: 'notes.txt', data: btoa('hello') },
      { type: 'text', text: 'What is this?' },
    ])
    const assistant = node('assistant', [
      { type: 'reasoning', text: 'hidden', durationMs: 1 },
      { type: 'text', text: 'A cat' },
    ])
    const req = buildChatRequest({
      model: 'llava',
      history: [user, assistant],
      settings: { systemPrompt: 'Be brief', think: true, options: { temperature: 0.2 } },
      supportsThinking: false,
    })
    expect(req.messages).toEqual([
      { role: 'system', content: 'Be brief' },
      {
        role: 'user',
        content: 'File: notes.txt\n```\nhello\n```\n\nWhat is this?',
        images: ['QUJD'],
      },
      { role: 'assistant', content: 'A cat' },
    ])
    expect(req.think).toBeUndefined()
    expect(req.options).toEqual({ temperature: 0.2 })
  })

  it('sends think only to thinking-capable models', () => {
    const req = buildChatRequest({
      model: 'qwen3',
      history: [],
      settings: { think: 'high' },
      supportsThinking: true,
    })
    expect(req.think).toBe('high')
  })
})

describe('chatEvents', () => {
  it('maps native thinking, content, tool calls and final stats', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ndjsonResponse([
          {
            model: 'qwen3',
            message: { role: 'assistant', content: '', thinking: 'Let me ' },
            done: false,
          },
          {
            model: 'qwen3',
            message: { role: 'assistant', content: '', thinking: 'think' },
            done: false,
          },
          {
            model: 'qwen3',
            message: {
              role: 'assistant',
              content: 'Hi',
              tool_calls: [{ function: { name: 'now', arguments: {} } }],
            },
            done: false,
          },
          {
            model: 'qwen3',
            message: { role: 'assistant', content: '' },
            done: true,
            done_reason: 'stop',
            total_duration: 3e9,
            eval_count: 12,
            prompt_eval_count: 30,
            eval_duration: 1e9,
          },
        ]),
      ),
    )
    const events = await collect(chatEvents({ model: 'qwen3', messages: [] }))
    expect(events.map((e) => e.type)).toEqual([
      'reasoning',
      'reasoning',
      'text',
      'tool-call',
      'finish',
    ])
    expect(events.at(-1)).toMatchObject({
      meta: {
        totalMs: 3000,
        evalTokens: 12,
        promptTokens: 30,
        evalMs: 1000,
        doneReason: 'stop',
      },
    })

    const parts: Part[] = []
    events.forEach((e) => applyEvent(parts, e, 0))
    expect(parts.map((p) => p.type)).toEqual(['reasoning', 'text', 'tool-call'])
  })

  it('strips literal think tags from the native thinking field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ndjsonResponse([
          {
            model: 'vl',
            message: { role: 'assistant', content: '', thinking: '<think>\nLooking' },
            done: false,
          },
          {
            model: 'vl',
            message: { role: 'assistant', content: '', thinking: ' closely</think>' },
            done: false,
          },
          { model: 'vl', message: { role: 'assistant', content: 'Hi' }, done: true },
        ]),
      ),
    )
    const events = await collect(chatEvents({ model: 'vl', messages: [] }))
    expect(
      events
        .filter((e) => e.type === 'reasoning')
        .map((e) => (e as { text: string }).text)
        .join(''),
    ).toBe('\nLooking closely')
  })

  it('splits inline <think> tags from content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ndjsonResponse(
          [
            {
              model: 'r1',
              message: { role: 'assistant', content: '<think>abc</think>' },
              done: false,
            },
            {
              model: 'r1',
              message: { role: 'assistant', content: 'Answer' },
              done: false,
            },
            { model: 'r1', done: true },
          ],
          3,
        ),
      ),
    )
    const events = await collect(chatEvents({ model: 'r1', messages: [] }))
    expect(events.slice(0, 2)).toEqual([
      { type: 'reasoning', text: 'abc' },
      { type: 'text', text: 'Answer' },
    ])
  })

  it('throws Ollama error lines and HTTP errors as messages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ndjsonResponse([{ error: 'model "x" not found' }])),
    )
    await expect(collect(chatEvents({ model: 'x', messages: [] }))).rejects.toThrow(
      'model "x" not found',
    )

    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: 'does not support thinking' }), {
            status: 400,
          }),
      ),
    )
    await expect(collect(chatEvents({ model: 'x', messages: [] }))).rejects.toThrow(
      'does not support thinking',
    )
  })

  it('throws when the stream ends without a done chunk', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ndjsonResponse([
          { model: 'm', message: { role: 'assistant', content: 'half' }, done: false },
        ]),
      ),
    )
    await expect(collect(chatEvents({ model: 'm', messages: [] }))).rejects.toThrow(
      'ended unexpectedly',
    )
  })

  it('reports an unreachable server with the host', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    await expect(collect(chatEvents({ model: 'x', messages: [] }))).rejects.toThrow(
      "Can't reach Ollama at http://ollama.test:11434",
    )
  })
})
