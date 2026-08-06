import Dexie from 'dexie'

export type ChatRole = 'user' | 'assistant' | 'system'

export interface Config {
  id?: number
  model: string
  systemPrompt: string
  createdAt: Date
}

export interface Chat {
  id?: number
  name: string
  model: string
  createdAt: Date
  pinned?: boolean
  archived?: boolean
  tokenUsage?: { prompt: number; completion: number; total: number }
}

export interface Message {
  id?: number
  chatId: number
  role: ChatRole
  content: string
  meta?: any
  context?: number[]
  createdAt: Date
}

class ChatDatabase extends Dexie {
  chats: Dexie.Table<Chat, number>
  messages: Dexie.Table<Message, number>
  config: Dexie.Table<Config, number>

  constructor() {
    super('ChatDatabase')
    this.version(11).stores({
      chats: '++id,name,model,createdAt,pinned,archived',
      messages: '++id,chatId,role,content,meta,context,createdAt',
      config: '++id,model,systemPrompt,createdAt',
    })

    this.chats = this.table('chats')
    this.messages = this.table('messages')
    this.config = this.table('config')
  }
}

export const db = new ChatDatabase()
