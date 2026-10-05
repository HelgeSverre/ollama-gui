import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { ChatDatabase } from './schema'

async function seedV11(name: string) {
  const old = new Dexie(name)
  old.version(11).stores({
    chats: '++id,name,model,createdAt,pinned,archived',
    messages: '++id,chatId,role,content,meta,context,createdAt',
    config: '++id,model,systemPrompt,createdAt',
  })
  const chatId = await old
    .table('chats')
    .add({ name: 'Trip', model: 'llama3', createdAt: new Date(1000), pinned: true })
  const at = (s: number) => new Date(s * 1000)
  await old.table('messages').bulkAdd([
    { chatId, role: 'system', content: 'Be brief', createdAt: at(2) },
    {
      chatId,
      role: 'user',
      content: 'Hi ![image](data:image/png;base64,QUJD)',
      createdAt: at(3),
    },
    {
      chatId,
      role: 'assistant',
      content: '<think>greet</think>Hello',
      createdAt: at(4),
      meta: { total_duration: 2e9, eval_count: 5, prompt_eval_count: 9 },
    },
  ])
  await old.table('config').bulkAdd([
    { id: 1, model: 'default', systemPrompt: 'Global', createdAt: new Date() },
    { id: 2, model: 'llama3', systemPrompt: 'Llama prompt', createdAt: new Date() },
  ])
  old.close()
}

describe('v11 → v13 migration', () => {
  it('moves chats into the message tree', async () => {
    const name = `test-${crypto.randomUUID()}`
    await seedV11(name)
    const db = new ChatDatabase(name)
    await db.open()

    expect(db.tables.map((t) => t.name).sort()).toEqual([
      'conversations',
      'nodes',
      'presets',
    ])

    const [chat] = await db.conversations.toArray()
    expect(chat).toMatchObject({
      title: 'Trip',
      model: 'llama3',
      pinned: true,
      settings: { systemPrompt: 'Be brief' },
    })
    expect(chat.updatedAt).toEqual(new Date(4000))

    const nodes = await db.nodes.where('chatId').equals(chat.id).toArray()
    const user = nodes.find((n) => n.role === 'user')!
    const ai = nodes.find((n) => n.role === 'assistant')!
    expect(user.parentId).toBeNull()
    expect(ai.parentId).toBe(user.id)
    expect(chat.activeLeafId).toBe(ai.id)
    expect(user.parts).toEqual([
      { type: 'file', mediaType: 'image/png', name: 'image-1', data: 'QUJD' },
      { type: 'text', text: 'Hi' },
    ])
    expect(ai.parts.map((p) => p.type)).toEqual(['reasoning', 'text'])
    expect(ai.meta).toMatchObject({ totalMs: 2000, evalTokens: 5, promptTokens: 9 })

    expect(await db.presets.get('')).toMatchObject({
      settings: { systemPrompt: 'Global' },
    })
    expect(await db.presets.get('llama3')).toMatchObject({
      settings: { systemPrompt: 'Llama prompt' },
    })
    db.close()
  })

  it('upgrades a v10 database from the original main branch', async () => {
    const name = `v10-${crypto.randomUUID()}`
    const old = new Dexie(name)
    old.version(10).stores({
      chats: '++id,name,model,createdAt',
      messages: '++id,chatId,role,content,meta,context,createdAt',
      config: '++id,model,systemPrompt,createdAt',
    })
    const chatId = await old
      .table('chats')
      .add({ name: 'From main', model: 'mistral', createdAt: new Date(1000) })
    await old.table('messages').bulkAdd([
      { chatId, role: 'user', content: 'Hello', createdAt: new Date(2000) },
      {
        chatId,
        role: 'assistant',
        content: 'Hi!',
        context: [1, 2, 3],
        meta: { eval_count: 4 },
        createdAt: new Date(3000),
      },
    ])
    old.close()

    const db = new ChatDatabase(name)
    await db.open()
    const [chat] = await db.conversations.toArray()
    expect(chat).toMatchObject({ title: 'From main', model: 'mistral' })
    const nodes = await db.nodes.where('chatId').equals(chat.id).toArray()
    expect(nodes.map((n) => n.role).sort()).toEqual(['assistant', 'user'])
    expect(nodes.find((n) => n.role === 'assistant')).toMatchObject({
      meta: { evalTokens: 4 },
    })
    db.close()
  })

  it('creates an empty database on first install', async () => {
    const db = new ChatDatabase(`fresh-${crypto.randomUUID()}`)
    await db.open()
    expect(await db.conversations.count()).toBe(0)
    db.close()
  })
})
