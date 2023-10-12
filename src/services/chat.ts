// useChats.ts
import { computed, ref } from 'vue'
import { Chat, db, Message } from './database'
import { useAI } from './useAI.ts'
import { GenerateCompletionCompletedResponse, GenerateCompletionPartResponse } from './api.ts' // Refs

// Refs
const chats = ref<Chat[]>([])
const activeChat = ref<Chat>()
const messages = ref<Message[]>([])
const ongoingAiMessages = ref(new Map<number, Message>())

export function useChats() {
  const { generate } = useAI()

  // Computed
  const sortedChats = computed<Chat[]>(() =>
    chats.value.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
  )
  const hasMessages = computed(() => messages.value.length > 0)
  const hasActiveChat = computed(() => activeChat.value !== null)
  const isCurrentChatPopulated = computed(() => hasMessages.value && hasActiveChat.value)
  const isAssistantResponding = computed(() =>
    ongoingAiMessages.value.has(activeChat.value?.id ?? -1),
  )

  const initialize = async () => {
    chats.value = await db.chats.toArray()
    if (chats.value.length > 0) {
      const lastChat = sortedChats.value[0]

      if (!lastChat.id) {
        console.warn(
          'We have chats, but we dont have any sorted chats?',
          sortedChats.value,
          chats.value,
        )
        return
      }
      console.log('initialize called')
      await switchChat(lastChat.id)
    } else {
      await startNewChat('New chat', 'n/a')
    }
  }

  const getLastMessageWithContext = () => {
    return messages.value
      .slice()
      .reverse()
      .find((msg) => msg.context)
  }

  const switchChat = async (chatId: number) => {
    activeChat.value = await db.chats.get(chatId)
    messages.value = await db.messages.where('chatId').equals(chatId).toArray()
  }

  const switchModel = async (model: string) => {
    if (!activeChat.value) return
    if (isCurrentChatPopulated.value) return
    activeChat.value.model = model
  }

  const startNewChat = async (name: string, model: string) => {
    const newChat: Chat = {
      name,
      model,
      createdAt: new Date(),
    }

    newChat.id = await db.chats.add(newChat)

    chats.value.push(newChat)

    activeChat.value = newChat
    messages.value = []
  }

  const addSystemMessage = async (content: string, meta?: any) => {
    if (!activeChat.value) return

    const message: Message = {
      chatId: activeChat.value.id!,
      role: 'system',
      content,
      meta,
      createdAt: new Date(),
    }

    await db.messages.add(message)
    messages.value.push(message)
  }

  const addUserMessage = async (content: string) => {
    if (!activeChat.value) {
      console.warn(
        'There was no active chat, we tried creating one, but it failed for some reason.',
      )
      return
    }

    const message: Message = {
      chatId: activeChat.value.id!,
      role: 'user',
      content,
      createdAt: new Date(),
    }

    // Save to the database
    message.id = await db.messages.add(message)
    messages.value.push(message)

    await generate(
      activeChat.value.model,
      content,
      getLastMessageWithContext()?.context,
      (data: GenerateCompletionPartResponse) => {
        ongoingAiMessages.value.has(activeChat?.value?.id!)
          ? appendToAiMessage(data.response, activeChat?.value?.id!)
          : startAiMessage(data.response, activeChat.value?.id!)
      },
      (data: GenerateCompletionCompletedResponse) => {
        finalizeAiMessage(data.context, activeChat.value?.id!)
      },
    )
  }

  const startAiMessage = async (initialContent: string, chatId: number) => {
    const message: Message = {
      chatId: chatId,
      role: 'assistant',
      content: initialContent,
      createdAt: new Date(),
    }

    message.id = await db.messages.add(message)

    ongoingAiMessages.value.set(chatId, message) // <-- Set ongoing message in the map
    messages.value.push(message)
  }

  const appendToAiMessage = async (content: string, chatId: number) => {
    const aiMessage = ongoingAiMessages.value.get(chatId) // <-- Get ongoing message from map
    if (aiMessage) {
      aiMessage.content += content
      await db.messages.update(aiMessage.id!, {
        content: aiMessage.content,
      })
    } else {
      console.log('no ongoing message?')
    }
  }

  const finalizeAiMessage = async (context: number[], chatId: number) => {
    const aiMessage = ongoingAiMessages.value.get(chatId) // <-- Get ongoing message from map
    if (aiMessage) {
      aiMessage.context = context
      await db.messages.update(aiMessage.id!, {
        context: aiMessage.context,
      })
      ongoingAiMessages.value.delete(chatId) // <-- Remove ongoing message from map after finalization
    }
  }

  const wipeDatabase = async () => {
    await db.chats.clear()
    await db.messages.clear()

    const model = activeChat.value?.model
    // Reset local state
    chats.value = []
    activeChat.value = undefined
    messages.value = []
    ongoingAiMessages.value.clear()

    await startNewChat('new chat', model ?? 'none')
  }

  const deleteChat = async (chatId: number) => {
    const deletedChat = await db.chats.get(chatId)

    await db.chats.delete(chatId)
    await db.messages.where('chatId').equals(chatId).delete()

    if (activeChat.value?.id != chatId) return

    if (sortedChats.value.length) {
      await switchChat(sortedChats.value[0].id!)
    } else {
      await startNewChat('new chat', deletedChat?.model ?? 'none')
    }
  }

  return {
    chats,
    sortedChats,
    activeChat,
    messages,
    hasMessages,
    hasActiveChat,
    isCurrentChatPopulated,
    isAssistantResponding,
    switchModel,
    startNewChat,
    switchChat,
    deleteChat,
    addUserMessage,
    addSystemMessage,
    initialize,
    wipeDatabase,
  }
}
