import { computed, ref } from 'vue'
import { Chat, db, Message } from './database'
import { historyMessageLength, currentModel, useConfig } from './appConfig'
import { streamResponse, activeStream } from './stream'

interface ChatExport extends Chat {
  messages: Message[]
}

// State
const chats = ref<Chat[]>([])
const activeChat = ref<Chat | null>(null)
const messages = ref<Message[]>([])
const systemPrompt = ref<Message>()
const ongoingAiMessages = ref<Map<number, Message>>(new Map())

// Database Layer
const dbLayer = {
  async getAllChats() {
    return db.chats.toArray()
  },

  async getChat(chatId: number) {
    return db.chats.get(chatId)
  },

  async getMessages(chatId: number) {
    return db.messages.where('chatId').equals(chatId).toArray()
  },

  async addChat(chat: Chat) {
    return db.chats.add(chat)
  },

  async updateChat(chatId: number, updates: Partial<Chat>) {
    return db.chats.update(chatId, updates)
  },

  async addMessage(message: Message) {
    return db.messages.add(message)
  },

  async updateMessage(messageId: number, updates: Partial<Message>) {
    return db.messages.update(messageId, updates)
  },

  async deleteChat(chatId: number) {
    return db.chats.delete(chatId)
  },

  async deleteMessagesOfChat(chatId: number) {
    return db.messages.where('chatId').equals(chatId).delete()
  },

  async deleteMessage(messageId: number) {
    return db.messages.delete(messageId)
  },

  async clearChats() {
    return db.chats.clear()
  },

  async clearMessages() {
    return db.messages.clear()
  },

  async searchMessages(query: string) {
    try {
      return db.messages
        .filter((m) => m.content.toLowerCase().includes(query.toLowerCase()))
        .toArray()
    } catch (error) {
      console.error('Failed to search messages:', error)
      return []
    }
  },
}

export function useChats() {
  // Computed
  const sortedChats = computed<Chat[]>(() =>
    [...chats.value].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      if (a.archived && !b.archived) return 1
      if (!a.archived && b.archived) return -1
      return b.createdAt.getTime() - a.createdAt.getTime()
    }),
  )
  const hasActiveChat = computed(() => activeChat.value !== null)
  const hasMessages = computed(() => messages.value.length > 0)

  // Methods for state mutations
  const setActiveChat = (chat: Chat) => (activeChat.value = chat)
  const setMessages = (newMessages: Message[]) => (messages.value = newMessages)

  const initialize = async () => {
    try {
      chats.value = await dbLayer.getAllChats()
      if (chats.value.length > 0) {
        await switchChat(sortedChats.value[0].id!)
      } else {
        await startNewChat('New chat')
      }
    } catch (error) {
      console.error('Failed to initialize chats:', error)
    }
  }

  const switchChat = async (chatId: number) => {
    try {
      const chat = await dbLayer.getChat(chatId)
      if (chat) {
        setActiveChat(chat)
        const chatMessages = await dbLayer.getMessages(chatId)
        setMessages(chatMessages)
        if (activeChat.value) {
          await switchModel(activeChat.value.model)
        }
      }
    } catch (error) {
      console.error(`Failed to switch to chat with ID ${chatId}:`, error)
    }
  }

  const switchModel = async (model: string) => {
    currentModel.value = model
    if (!activeChat.value) return

    try {
      await dbLayer.updateChat(activeChat.value.id!, { model })
      activeChat.value.model = model
    } catch (error) {
      console.error(`Failed to switch model to ${model}:`, error)
    }
  }

  const renameChat = async (newName: string) => {
    if (!activeChat.value) return

    activeChat.value.name = newName
    await dbLayer.updateChat(activeChat.value.id!, { name: newName })
    chats.value = await dbLayer.getAllChats()
  }

  const startNewChat = async (name: string) => {
    const newChat: Chat = {
      name,
      model: currentModel.value,
      createdAt: new Date(),
    }

    try {
      newChat.id = await dbLayer.addChat(newChat)
      chats.value.push(newChat)
      setActiveChat(newChat)
      setMessages([])
      await addSystemMessage(await useConfig().getCurrentSystemMessage())
    } catch (error) {
      console.error('Failed to start a new chat:', error)
    }
  }

  const addSystemMessage = async (content: string | null, meta?: any) => {
    if (!activeChat.value) return
    if (!content) return

    const systemPromptMessage: Message = {
      chatId: activeChat.value.id!,
      role: 'system',
      content,
      meta,
      createdAt: new Date(),
    }

    systemPromptMessage.id = await dbLayer.addMessage(systemPromptMessage)
    messages.value.push(systemPromptMessage)

    systemPrompt.value = systemPromptMessage
  }

  const addUserMessage = async (content: string) => {
    if (!activeChat.value) {
      console.warn('There was no active chat.')
      return
    }

    const currentChatId = activeChat.value.id!
    const message: Message = {
      chatId: activeChat.value.id!,
      role: 'user',
      content,
      createdAt: new Date(),
    }

    try {
      message.id = await dbLayer.addMessage(message)
      messages.value.push(message)

      await streamResponse(
        currentModel.value,
        messages.value,
        systemPrompt.value,
        historyMessageLength.value,
        (data) => handleAiPartialResponse(data, currentChatId),
        (data) => handleAiCompletion(data, currentChatId),
      )
    } catch (error) {
      ongoingAiMessages.value.delete(currentChatId)
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Failed to add user message:', error)
    }
  }

  const regenerateResponse = async () => {
    if (!activeChat.value) return
    const currentChatId = activeChat.value.id!
    const message = messages.value[messages.value.length - 1]
    if (message && message.role === 'assistant') {
      if (message.id) await dbLayer.deleteMessage(message.id)
      messages.value.pop()
      try {
        await streamResponse(
          currentModel.value,
          messages.value,
          systemPrompt.value,
          historyMessageLength.value,
          (content) => handleAiPartialResponse(content, currentChatId),
          (data) => handleAiCompletion(data, currentChatId),
        )
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          ongoingAiMessages.value.delete(currentChatId)
          return
        }
        console.error('Failed to regenerate response:', error)
      }
    }
  }

  const handleAiPartialResponse = (content: string, chatId: number) => {
    const existing = ongoingAiMessages.value.get(chatId)
    existing ? appendToAiMessage(content, chatId) : startAiMessage(content, chatId)
  }

  const handleAiCompletion = async (
    data: { total_duration: number; eval_count: number; prompt_eval_count: number },
    chatId: number,
  ) => {
    const aiMessage = ongoingAiMessages.value.get(chatId)
    if (!aiMessage) {
      console.error('No ongoing AI message to finalize')
      return
    }

    try {
      await dbLayer.updateMessage(aiMessage.id!, {
        content: aiMessage.content,
        meta: {
          total_duration: data.total_duration,
          eval_count: data.eval_count,
          prompt_eval_count: data.prompt_eval_count,
        },
      })

      if (activeChat.value && (data.prompt_eval_count || data.eval_count)) {
        const current = activeChat.value.tokenUsage || {
          prompt: 0,
          completion: 0,
          total: 0,
        }
        const usage = {
          prompt: current.prompt + (data.prompt_eval_count || 0),
          completion: current.completion + (data.eval_count || 0),
          total: current.total + (data.prompt_eval_count || 0) + (data.eval_count || 0),
        }
        await dbLayer.updateChat(activeChat.value.id!, { tokenUsage: usage })
        activeChat.value.tokenUsage = usage
      }
    } catch (error) {
      console.error('Failed to finalize AI message:', error)
    } finally {
      ongoingAiMessages.value.delete(chatId)
    }
  }

  const wipeDatabase = async () => {
    try {
      await dbLayer.clearChats()
      await dbLayer.clearMessages()

      // Reset local state
      chats.value = []
      activeChat.value = null
      messages.value = []
      ongoingAiMessages.value.clear()

      await startNewChat('New chat')
    } catch (error) {
      console.error('Failed to wipe the database:', error)
    }
  }

  const deleteChat = async (chatId: number) => {
    try {
      await dbLayer.deleteChat(chatId)
      await dbLayer.deleteMessagesOfChat(chatId)

      chats.value = chats.value.filter((chat) => chat.id !== chatId)

      if (activeChat.value?.id === chatId) {
        if (sortedChats.value.length) {
          await switchChat(sortedChats.value[0].id!)
        } else {
          await startNewChat('New chat')
        }
      }
    } catch (error) {
      console.error(`Failed to delete chat with ID ${chatId}:`, error)
    }
  }

  const startAiMessage = async (initialContent: string, chatId: number) => {
    const message: Message = {
      chatId: chatId,
      role: 'assistant',
      content: initialContent,
      createdAt: new Date(),
    }

    ongoingAiMessages.value.set(chatId, message)
    messages.value.push(message)

    try {
      message.id = await dbLayer.addMessage(message)
    } catch (error) {
      console.error('Failed to start AI message:', error)
      ongoingAiMessages.value.delete(chatId)
    }
  }

  const appendToAiMessage = async (content: string, chatId: number) => {
    const aiMessage = ongoingAiMessages.value.get(chatId)
    if (aiMessage) {
      aiMessage.content += content
      try {
        await dbLayer.updateMessage(aiMessage.id!, { content: aiMessage.content })
      } catch (error) {
        console.error('Failed to append to AI message:', error)
      }
    }
  }

  const exportChats = async () => {
    const chats = await dbLayer.getAllChats()
    const exportData: ChatExport[] = []
    await Promise.all(
      chats.map(async (chat) => {
        if (!chat?.id) return
        const messages = await dbLayer.getMessages(chat.id)
        exportData.push(Object.assign({ messages }, chat))
      }),
    )
    return exportData
  }

  const importChats = async (jsonData: ChatExport[]) => {
    for (const chatData of jsonData) {
      const chat: Chat = {
        name: chatData?.name,
        model: chatData?.model,
        createdAt: new Date(
          chatData?.createdAt || (chatData.messages?.[0]?.createdAt ?? Date.now()),
        ),
      }
      chat.id = await dbLayer.addChat(chat)
      chats.value.push(chat)
      for (const messageData of chatData.messages ?? []) {
        const message: Message = {
          chatId: chat.id!,
          role: messageData.role,
          content: messageData.content,
          createdAt: new Date(messageData.createdAt ?? Date.now()),
        }
        await dbLayer.addMessage(message)
      }
    }
  }

  const togglePinChat = async (chatId: number) => {
    const chat = await dbLayer.getChat(chatId)
    if (!chat) return
    const updates: Partial<Chat> = { pinned: !chat.pinned }
    if (updates.pinned && chat.archived) {
      updates.archived = false
    }
    await dbLayer.updateChat(chatId, updates)
    chats.value = await dbLayer.getAllChats()
  }

  const toggleArchiveChat = async (chatId: number) => {
    const chat = await dbLayer.getChat(chatId)
    if (!chat) return
    const updates: Partial<Chat> = { archived: !chat.archived }
    if (updates.archived && chat.pinned) {
      updates.pinned = false
    }
    await dbLayer.updateChat(chatId, updates)
    chats.value = await dbLayer.getAllChats()
  }

  const exportChatToMarkdown = async (chat: Chat) => {
    const msgs = await dbLayer.getMessages(chat.id!)
    const date = new Date(chat.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    let md = `# ${chat.name}\n**Model:** ${chat.model} | **Date:** ${date}\n\n---\n`
    for (const m of msgs) {
      if (m.role === 'system') continue
      const label = m.role === 'user' ? 'User' : 'Assistant'
      md += `\n**${label}:**\n${m.content}\n`
    }
    return md
  }

  const searchChats = async (query: string) => {
    const results = await dbLayer.searchMessages(query)
    const chatIds = [...new Set(results.map((m) => m.chatId))]
    const chatMap = new Map<number, string>()
    for (const id of chatIds) {
      const chat = await dbLayer.getChat(id)
      if (chat) chatMap.set(id, chat.name)
    }
    return results.reduce<
      { chatId: number; chatName: string; matchCount: number; preview: string }[]
    >((acc, m) => {
      const existing = acc.find((r) => r.chatId === m.chatId)
      const preview =
        m.content.length > 100 ? m.content.substring(0, 100) + '...' : m.content
      if (existing) {
        existing.matchCount++
        return acc
      }
      acc.push({
        chatId: m.chatId,
        chatName: chatMap.get(m.chatId) || 'Unknown',
        matchCount: 1,
        preview,
      })
      return acc
    }, [])
  }

  const forkChat = async (chatId: number, fromMessageIndex: number) => {
    try {
      const original = await dbLayer.getChat(chatId)
      if (!original) return
      const originalMessages = await dbLayer.getMessages(chatId)
      if (originalMessages.length === 0) return

      const safeIndex = Math.max(
        0,
        Math.min(fromMessageIndex, originalMessages.length - 1),
      )
      const newChat: Chat = {
        name: `Fork of ${original.name}`,
        model: original.model,
        createdAt: new Date(),
      }
      newChat.id = await dbLayer.addChat(newChat)
      chats.value.push(newChat)
      const slicedMessages = originalMessages.slice(0, safeIndex + 1)
      for (const msg of slicedMessages) {
        const { id, ...rest } = msg
        await dbLayer.addMessage({ ...rest, chatId: newChat.id! })
      }
      await switchChat(newChat.id!)
    } catch (error) {
      console.error('Failed to fork chat:', error)
    }
  }

  const editMessage = async (messageId: number, newContent: string, chatId: number) => {
    try {
      await dbLayer.updateMessage(messageId, { content: newContent })
      const allMessages = await dbLayer.getMessages(chatId)
      const targetIdx = allMessages.findIndex((m) => m.id === messageId)
      if (targetIdx !== -1) {
        for (let i = allMessages.length - 1; i > targetIdx; i--) {
          if (allMessages[i].id) await dbLayer.deleteMessage(allMessages[i].id!)
        }
      }
      const freshMessages = await dbLayer.getMessages(chatId)
      setMessages(freshMessages)

      if (!activeChat.value) return
      const currentChatId = activeChat.value.id!
      try {
        await streamResponse(
          currentModel.value,
          freshMessages,
          systemPrompt.value,
          historyMessageLength.value,
          (content) => handleAiPartialResponse(content, currentChatId),
          (data) => handleAiCompletion(data, currentChatId),
        )
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          ongoingAiMessages.value.delete(currentChatId)
          return
        }
        console.error('Failed to regenerate after edit:', error)
      }
    } catch (error) {
      console.error('Failed to edit message:', error)
    }
  }

  return {
    chats,
    sortedChats,
    activeChat,
    messages,
    hasMessages,
    hasActiveChat,
    renameChat,
    switchModel,
    startNewChat,
    switchChat,
    deleteChat,
    addUserMessage,
    regenerateResponse,
    addSystemMessage,
    initialize,
    wipeDatabase,
    abort: () => activeStream.value?.abort(),
    exportChats,
    importChats,
    togglePinChat,
    toggleArchiveChat,
    exportChatToMarkdown,
    searchChats,
    forkChat,
    editMessage,
  }
}
