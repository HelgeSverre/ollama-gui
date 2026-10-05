import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/schema'
import type { MessageNode } from '../domain/types'
import { textOf } from '../domain/parts'
import { siblings } from '../domain/thread'
import { useChats } from './useChats'
import { cleanTitle, useGeneration } from './useGeneration'
import { autoTitle, currentModel } from './useSettings'

type Script = { chunks: string[]; hold?: Promise<void>; noDone?: boolean }
/** Delays /api/show (the model-info lookup that happens before streaming starts). */
let showHold: Promise<void> | undefined
let scripts: Script[] = []
const requests: any[] = []

function streamFor(script: Script, signal?: AbortSignal) {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      signal?.addEventListener('abort', () =>
        controller.error(new DOMException('aborted', 'AbortError')),
      )
      for (const text of script.chunks) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              model: 'm',
              message: { role: 'assistant', content: text },
              done: false,
            }) + '\n',
          ),
        )
      }
      await script.hold
      if (signal?.aborted) return
      if (script.noDone) return controller.close()
      controller.enqueue(
        encoder.encode(JSON.stringify({ model: 'm', done: true, eval_count: 2 }) + '\n'),
      )
      controller.close()
    },
  })
}

vi.stubGlobal(
  'fetch',
  vi.fn(async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname
    if (path === '/api/show') {
      await showHold
      return new Response(JSON.stringify({ capabilities: ['completion'] }))
    }
    if (path === '/api/chat') {
      const body = JSON.parse(String(init.body))
      requests.push(body)
      if (body.stream === false)
        return new Response(JSON.stringify({ message: { content: '"Greeting Chat".' } }))
      return new Response(
        streamFor(scripts.shift() ?? { chunks: ['ok'] }, init.signal ?? undefined),
      )
    }
    return new Response('{}')
  }),
)

const chats = useChats()
const gen = useGeneration()
const text = (t: string) => [{ type: 'text' as const, text: t }]
const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((r) => (resolve = r))
  return { promise, resolve }
}
const tick = () => new Promise((r) => setTimeout(r, 10))

beforeEach(async () => {
  await chats.deleteAllChats()
  await chats.init()
  scripts = []
  showHold = undefined
  requests.length = 0
  currentModel.value = 'm'
  autoTitle.value = false
})

describe('generation', () => {
  it('creates a chat from the draft and streams the reply into it', async () => {
    scripts.push({ chunks: ['Hel', 'lo'] })
    await gen.send(text('Hi there'))
    const chat = chats.activeChat.value!
    expect(chat.title).toBe('Hi there')
    const thread = chats.activeThread.value
    expect(thread.map((n) => n.role)).toEqual(['user', 'assistant'])
    expect(textOf(thread[1].parts)).toBe('Hello')
    expect(thread[1]).toMatchObject({ status: 'done', meta: { evalTokens: 2 } })
    const stored = await db.nodes.get(thread[1].id)
    expect(textOf(stored!.parts)).toBe('Hello')
  })

  it('keeps partial text when stopped', async () => {
    const hold = deferred()
    scripts.push({ chunks: ['Partial '], hold: hold.promise })
    const sending = gen.send(text('Go'))
    await vi.waitFor(() =>
      expect(textOf(chats.activeThread.value[1]?.parts ?? [])).toBe('Partial '),
    )
    const chatId = chats.activeChatId.value
    expect(gen.isGenerating(chatId)).toBe(true)
    gen.stop(chatId)
    await sending
    const reply = chats.activeThread.value[1]
    expect(reply.status).toBe('aborted')
    expect(textOf((await db.nodes.get(reply.id))!.parts)).toBe('Partial ')
    expect(gen.isGenerating(chatId)).toBe(false)
  })

  it('writes a background stream into its own chat after switching', async () => {
    const hold = deferred()
    scripts.push({ chunks: ['for A'], hold: hold.promise })
    const sendingA = gen.send(text('Chat A'))
    await vi.waitFor(() =>
      expect(textOf(chats.activeThread.value[1]?.parts ?? [])).toBe('for A'),
    )
    const chatA = chats.activeChatId.value

    chats.newChat()
    scripts.push({ chunks: ['for B'] })
    await gen.send(text('Chat B'))
    const chatB = chats.activeChatId.value
    expect(chatB).not.toBe(chatA)

    hold.resolve()
    await sendingA
    const nodesA = await db.nodes.where('chatId').equals(chatA).toArray()
    const nodesB = await db.nodes.where('chatId').equals(chatB).toArray()
    expect(nodesA.map((n) => textOf(n.parts)).sort()).toEqual(['Chat A', 'for A'])
    expect(nodesB.map((n) => textOf(n.parts)).sort()).toEqual(['Chat B', 'for B'])
  })

  it('regenerates and edits as siblings', async () => {
    scripts.push({ chunks: ['one'] }, { chunks: ['two'] }, { chunks: ['three'] })
    await gen.send(text('Q'))
    const chatId = chats.activeChatId.value
    const [user, first] = chats.activeThread.value

    await gen.regenerate(chatId, first.id)
    const second = chats.activeThread.value[1]
    expect(textOf(second.parts)).toBe('two')
    expect(siblings(chats.activeIndex.value, second)).toMatchObject({
      index: 1,
      count: 2,
    })

    await gen.edit(chatId, user.id, 'Q edited')
    const [editedUser, third] = chats.activeThread.value
    expect(textOf(editedUser.parts)).toBe('Q edited')
    expect(textOf(third.parts)).toBe('three')
    expect(siblings(chats.activeIndex.value, editedUser)).toMatchObject({
      index: 1,
      count: 2,
    })
    expect(requests.at(-1).messages).toEqual([{ role: 'user', content: 'Q edited' }])
  })

  it('auto-titles after the first exchange', async () => {
    autoTitle.value = true
    await gen.send(text('Hello!'))
    await vi.waitFor(() => expect(chats.activeChat.value?.title).toBe('Greeting Chat'))
  })
})

describe('generation edge cases', () => {
  const streamRequests = () => requests.filter((r) => r.stream !== false)

  it('ignores a second send while the first is still starting up', async () => {
    const show = deferred()
    showHold = show.promise
    currentModel.value = 'slow-model'
    const first = gen.send(text('one'))
    await vi.waitFor(() => expect(chats.activeChatId.value).not.toBe(''))
    expect(gen.isGenerating(chats.activeChatId.value)).toBe(true)
    expect(await gen.send(text('two'))).toBe(false)
    show.resolve()
    await first
    expect(streamRequests()).toHaveLength(1)
    expect(chats.activeThread.value.map((n) => textOf(n.parts))).toEqual(['one', 'ok'])
  })

  it('blocks a draft double-send before the chat row exists', async () => {
    const first = gen.send(text('a'))
    expect(gen.isGenerating(undefined)).toBe(true)
    expect(await gen.send(text('b'))).toBe(false)
    await first
    expect(chats.chats.value).toHaveLength(1)
  })

  it('can be stopped before streaming starts', async () => {
    const show = deferred()
    showHold = show.promise
    currentModel.value = 'slow-model-2'
    const sending = gen.send(text('stop me'))
    await vi.waitFor(() => expect(chats.activeChatId.value).not.toBe(''))
    gen.stop(chats.activeChatId.value)
    show.resolve()
    await sending
    expect(streamRequests()).toHaveLength(0)
    expect(chats.activeThread.value.at(-1)?.status).toBe('aborted')
  })

  it('stops and leaves no rows behind when the chat is deleted mid-stream', async () => {
    const hold = deferred()
    scripts.push({ chunks: ['partial'], hold: hold.promise })
    const sending = gen.send(text('doomed'))
    await vi.waitFor(() =>
      expect(textOf(chats.activeThread.value[1]?.parts ?? [])).toBe('partial'),
    )
    const chatId = chats.activeChatId.value
    await chats.deleteChat(chatId)
    hold.resolve()
    await sending
    await tick()
    expect(await db.nodes.where('chatId').equals(chatId).count()).toBe(0)
    expect(gen.isGenerating(chatId)).toBe(false)
  })

  it('marks a stream that ends without done as an error', async () => {
    scripts.push({ chunks: ['cut'], noDone: true })
    await gen.send(text('hi'))
    const reply = chats.activeThread.value.at(-1)!
    expect(reply.status).toBe('error')
    expect(reply.parts.at(-1)).toMatchObject({
      type: 'error',
      message: expect.stringContaining('ended unexpectedly'),
    })
    expect(textOf(reply.parts)).toBe('cut')
  })

  it('repairs replies left streaming by a reload', async () => {
    await gen.send(text('hi'))
    const reply = chats.activeThread.value.at(-1)!
    await db.nodes.update(reply.id, {
      status: 'streaming',
      parts: [{ type: 'reasoning', text: 'x', startedAt: 1 }],
    } as Partial<MessageNode>)
    await chats.init()
    const stored = await db.nodes.get(reply.id)
    expect(stored?.status).toBe('aborted')
    expect(stored?.parts[0]).toMatchObject({ durationMs: 0 })
  })

  it('does not carry draft settings into the next new chat', async () => {
    await chats.setActiveSettings({ think: false })
    await gen.send(text('first'))
    expect(chats.activeChat.value?.settings).toEqual({ think: false })
    chats.newChat()
    await chats.setActiveSettings({ systemPrompt: 'temp' })
    await chats.openChat(chats.chats.value[0].id)
    chats.newChat()
    expect(chats.draftSettings.value).toBeUndefined()
  })

  it('auto-titles even if an earlier reply in the chat was not the first exchange', async () => {
    autoTitle.value = true
    scripts.push({ chunks: ['x'], noDone: true })
    await gen.send(text('first'))
    expect(chats.activeChat.value?.titleGenerated).toBeFalsy()
    await gen.send(text('second'))
    await vi.waitFor(() => expect(chats.activeChat.value?.title).toBe('Greeting Chat'))
  })
})

describe('cleanTitle', () => {
  it('strips quotes, think blocks and prefixes', () => {
    expect(cleanTitle('<think>x</think>\n"Title: Paris Trip Plans."')).toBe(
      'Paris Trip Plans',
    )
  })
})
