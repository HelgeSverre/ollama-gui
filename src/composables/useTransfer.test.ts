import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/schema'
import { useChats } from './useChats'
import { chatToMarkdown, exportAll, importData } from './useTransfer'

vi.stubGlobal(
  'fetch',
  vi.fn(async () => new Response('{}')),
)

const chats = useChats()

beforeEach(async () => {
  await chats.deleteAllChats()
  await chats.init()
})

const v2File = (overrides: Record<string, unknown> = {}) => ({
  format: 'ollama-gui',
  version: 2,
  chats: [
    {
      id: 'c1',
      title: 'Imported',
      model: 'llama3',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      activeLeafId: 'n2',
      nodes: [
        {
          id: 'n1',
          chatId: 'c1',
          parentId: null,
          role: 'user',
          parts: [{ type: 'text', text: 'Hi' }],
          status: 'done',
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'n2',
          chatId: 'c1',
          parentId: 'n1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hello' }],
          status: 'streaming',
          createdAt: '2026-01-01T00:00:01Z',
        },
      ],
      ...overrides,
    },
  ],
})

describe('import', () => {
  it('imports a v2 file with fresh ids and a remapped tree', async () => {
    expect(await importData(v2File())).toBe(1)
    const [chat] = chats.chats.value
    expect(chat.id).not.toBe('c1')
    const nodes = await db.nodes.where('chatId').equals(chat.id).toArray()
    const user = nodes.find((n) => n.role === 'user')!
    const reply = nodes.find((n) => n.role === 'assistant')!
    expect(reply.parentId).toBe(user.id)
    expect(chat.activeLeafId).toBe(reply.id)
    expect(reply.status).toBe('aborted')
    expect(chat.updatedAt).toEqual(new Date('2026-01-02T00:00:00Z'))
  })

  it('can import the same file twice without collisions', async () => {
    await importData(v2File())
    await importData(v2File())
    expect(chats.chats.value).toHaveLength(2)
    expect(await db.nodes.count()).toBe(4)
  })

  it('imports v1 arrays, turning the leading system message into the system prompt', async () => {
    await importData([
      {
        name: 'Old chat',
        model: 'mistral',
        createdAt: '2024-05-01T00:00:00Z',
        messages: [
          { role: 'system', content: 'Be brief', createdAt: '2024-05-01T00:00:00Z' },
          { role: 'user', content: 'Q', createdAt: '2024-05-01T00:00:01Z' },
          {
            role: 'assistant',
            content: '<think>hm</think>A',
            createdAt: '2024-05-01T00:00:02Z',
          },
        ],
      },
    ])
    const [chat] = chats.chats.value
    expect(chat).toMatchObject({
      title: 'Old chat',
      model: 'mistral',
      settings: { systemPrompt: 'Be brief' },
    })
    const nodes = await db.nodes.where('chatId').equals(chat.id).toArray()
    expect(nodes.find((n) => n.role === 'assistant')?.parts.map((p) => p.type)).toEqual([
      'reasoning',
      'text',
    ])
  })

  it('drops malformed nodes and parts instead of failing later in the UI', async () => {
    const file = v2File({
      nodes: [
        null,
        { id: 'bad-role', role: 'hacker', parts: [] },
        {
          id: 'n1',
          parentId: null,
          role: 'user',
          parts: [
            null,
            { type: 'text', text: 42 },
            { type: 'bogus' },
            { type: 'file', name: 'x' },
          ],
          status: 'weird',
        },
      ],
      activeLeafId: 'n1',
    })
    file.chats.push(null as never)
    await importData(file)
    const nodes = await db.nodes.toArray()
    expect(nodes).toHaveLength(1)
    expect(nodes[0].parts).toEqual([{ type: 'text', text: '' }])
    expect(nodes[0].status).toBe('aborted')
  })

  it('rejects files that are not exports', async () => {
    await expect(importData({ hello: 'world' })).rejects.toThrow('Unrecognised file')
    await expect(
      importData({ format: 'ollama-gui', version: 2, chats: [] }),
    ).rejects.toThrow('no chats')
  })
})

describe('export', () => {
  it('round-trips through import', async () => {
    await importData(v2File())
    const exported = await exportAll()
    expect(exported).toMatchObject({ format: 'ollama-gui', version: 2 })
    expect(exported.chats[0].nodes).toHaveLength(2)
    await chats.deleteAllChats()
    await importData(JSON.parse(JSON.stringify(exported)))
    expect(chats.chats.value[0].title).toBe('Imported')
    expect(await db.nodes.count()).toBe(2)
  })

  it('exports the visible branch as Markdown', async () => {
    await importData(v2File({ settings: { systemPrompt: 'Sys' } }))
    const md = await chatToMarkdown(chats.chats.value[0].id)
    expect(md).toContain('# Imported')
    expect(md).toContain('**System**\n\nSys')
    expect(md).toContain('**You**\n\nHi')
    expect(md).toContain('Hello')
  })
})
