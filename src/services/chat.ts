// useChats.ts
import { computed, ref } from 'vue'
import { Chat, db, Message } from './database'
import { useAI } from './useAI.ts'
import {
  GenerateCompletionCompletedResponse,
  GenerateCompletionPartResponse,
} from './api.ts' // Refs

// Refs
const chats = ref<Chat[]>([])
const activeChat = ref<Chat>()
const messages = ref<Message[]>([])

export function useChats() {
  const { generate } = useAI()

  // Computed
  const sortedChats = computed<Chat[]>(() =>
    chats.value.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
  )
  const hasMessages = computed(() => messages.value.length > 0)
  const hasActiveChat = computed(() => activeChat.value !== null)
  const isCurrentChatPopulated = computed(() => hasMessages.value && hasActiveChat.value)
  const isAssistantResponding = computed(() => ongoingAiMessage !== null)

  // Temporary variable
  let ongoingAiMessage: Message | null = null

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

      await switchChat(lastChat.id)
    } else {
      await startNewChat('New chat', 'n/a')
    }
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

  const ensureActiveChat = async () => {
    if (!activeChat.value) {
      await startNewChat('Default Chat', 'default')
    }
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

    await db.messages.add(message)
    messages.value.push(message)

    await generate(
      activeChat.value.model,
      content,
      getLastMessageWithContext()?.context,
      (data: GenerateCompletionPartResponse) =>
        ongoingAiMessage == null
          ? startAiMessage(data.response)
          : appendToAiMessage(data.response),

      (data: GenerateCompletionCompletedResponse) => {
        finalizeAiMessage(data.context)
      },
    )
  }

  const startAiMessage = (initialContent: string) => {
    if (!activeChat.value) return
    console.log("startAiMessage")

    const message: Message = {
      chatId: activeChat.value.id!,
      role: 'assistant',
      content: initialContent,
      createdAt: new Date(),
    }

    ongoingAiMessage = message

    messages.value.push(message)
  }

  const getLastMessageWithContext = () => {
    return messages.value
      .slice()
      .reverse()
      .find((msg) => msg.context)
  }

  const getOngoingAssistantMessage = (): Message | undefined => {
    return messages.value.find((msg) => msg === ongoingAiMessage)
  }

  const appendToAiMessage = (content: string) => {
    console.log("appendToAiMessage")
    const assistantMessage = getOngoingAssistantMessage()
    if (assistantMessage) {
      assistantMessage.content += content
    }
  }

  const finalizeAiMessage = (context: number[]) => {
    console.log("finalizeAiMessage")
    const assistantMessage = getOngoingAssistantMessage()
    if (assistantMessage) {
      assistantMessage.context = context
      ongoingAiMessage = null
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
    addUserMessage,
    addSystemMessage,
    initialize,
  }
}
