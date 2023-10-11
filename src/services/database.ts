// database.ts
import Dexie from 'dexie'

export type ChatRole = 'user' | 'assistant' | 'system'

export interface Chat {
  id?: number
  name: string
  model: string
  createdAt: Date
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

  constructor() {
    super('ChatDatabase')
    this.version(1).stores({
      chats: '++id,name,model,createdAt',
      messages: '++id,chatId,role,content,meta,context,createdAt',
    })

    this.chats = this.table('chats')
    this.messages = this.table('messages')
  }
}

export const db = new ChatDatabase()
