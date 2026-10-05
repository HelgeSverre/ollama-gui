import Dexie, { type EntityTable, type Transaction } from 'dexie'
import type { Chat, MessageNode, Preset } from '../domain/types'
import { GLOBAL_SCOPE } from '../domain/types'
import { convertLegacyChat, type LegacyChat, type LegacyMessage } from '../domain/legacy'

export const DB_NAME = 'ChatDatabase'

export class ChatDatabase extends Dexie {
  conversations!: EntityTable<Chat, 'id'>
  nodes!: EntityTable<MessageNode, 'id'>
  presets!: EntityTable<Preset, 'scope'>

  constructor(name = DB_NAME) {
    super(name)
    // v11: flat messages with numeric ids (v1/v2.0 layout). Kept so v12 can read it.
    this.version(11).stores({
      chats: '++id,name,model,createdAt,pinned,archived',
      messages: '++id,chatId,role,content,meta,context,createdAt',
      config: '++id,model,systemPrompt,createdAt',
    })
    // v12: message tree with parts. Primary keys change type, so the data moves to new tables.
    this.version(12)
      .stores({
        conversations: 'id,updatedAt',
        nodes: 'id,chatId',
        presets: 'scope',
      })
      .upgrade(migrateV11)
    this.version(13).stores({ chats: null, messages: null, config: null })
  }
}

interface LegacyConfig {
  model: string
  systemPrompt: string
}

export async function migrateV11(tx: Transaction) {
  const chats: (LegacyChat & { id: number })[] = await tx.table('chats').toArray()
  const messages: (LegacyMessage & { chatId: number })[] = await tx.table('messages').toArray()
  const configs: LegacyConfig[] = await tx.table('config').toArray()

  const byChat = new Map<number, LegacyMessage[]>()
  for (const m of messages) {
    const list = byChat.get(m.chatId)
    if (list) list.push(m)
    else byChat.set(m.chatId, [m])
  }

  const newChats: Chat[] = []
  const newNodes: MessageNode[] = []
  for (const old of chats) {
    const { chat, nodes } = convertLegacyChat(old, byChat.get(old.id) ?? [])
    newChats.push(chat)
    newNodes.push(...nodes)
  }

  const presets: Preset[] = configs
    .filter((c) => c.systemPrompt?.trim())
    .map((c) => ({
      scope: c.model === 'default' ? GLOBAL_SCOPE : c.model,
      settings: { systemPrompt: c.systemPrompt },
    }))

  await tx.table('conversations').bulkAdd(newChats)
  await tx.table('nodes').bulkAdd(newNodes)
  await tx.table('presets').bulkPut(presets)
}

export const db = new ChatDatabase()
