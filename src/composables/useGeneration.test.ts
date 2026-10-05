import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/schema'
import { textOf } from '../domain/parts'
import { siblings } from '../domain/thread'
import { useChats } from './useChats'
import { cleanTitle, useGeneration } from './useGeneration'
import { autoTitle, currentModel } from './useSettings'

type Script = { chunks: string[]; hold?: Promise<void> }
let scripts: Script[] = []
const requests: any[] = []

function streamFor(script: Script, signal?: AbortSignal) {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      signal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')))
      for (const text of script.chunks) {
        controller.enqueue(encoder.encode(JSON.stringify({ model: 'm', message: { role: 'assistant', content: text }, done: false }) + '\n'))
      }
      await script.hold
      if (signal?.aborted) return
      controller.enqueue(encoder.encode(JSON.stringify({ model: 'm', done: true, eval_count: 2 }) + '\n'))
      controller.close()
    },
  })
}

vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
  const path = new URL(url).pathname
  if (path === '/api/show') return new Response(JSON.stringify({ capabilities: ['completion'] }))
  if (path === '/api/chat') {
    const body = JSON.parse(String(init.body))
    requests.push(body)
    if (body.stream === false) return new Response(JSON.stringify({ message: { content: '"Greeting Chat".' } }))
    return new Response(streamFor(scripts.shift() ?? { chunks: ['ok'] }, init.signal ?? undefined))
  }
  return new Response('{}')
}))

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
    await tick()
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
    await tick()
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
    expect(siblings(chats.activeIndex.value, second)).toMatchObject({ index: 1, count: 2 })

    await gen.edit(chatId, user.id, 'Q edited')
    const [editedUser, third] = chats.activeThread.value
    expect(textOf(editedUser.parts)).toBe('Q edited')
    expect(textOf(third.parts)).toBe('three')
    expect(siblings(chats.activeIndex.value, editedUser)).toMatchObject({ index: 1, count: 2 })
    expect(requests.at(-1).messages).toEqual([{ role: 'user', content: 'Q edited' }])
  })

  it('auto-titles after the first exchange', async () => {
    autoTitle.value = true
    await gen.send(text('Hello!'))
    await tick()
    expect(chats.activeChat.value?.title).toBe('Greeting Chat')
  })
})

describe('cleanTitle', () => {
  it('strips quotes, think blocks and prefixes', () => {
    expect(cleanTitle('<think>x</think>\n"Title: Paris Trip Plans."')).toBe('Paris Trip Plans')
  })
})
