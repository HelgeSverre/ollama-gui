import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import {
  GenerateCompletionCompletedResponse,
  GenerateCompletionPartResponse,
  GenerateCompletionResponse,
  useApi,
} from './api.ts'
import { v4 as uuidv4 } from 'uuid'
import gravatarUrl from 'gravatar-url'

export const gravatarEmail = useLocalStorage('gravatarEmail', 'helge.sverre@gmail.com')
export const avatarUrl = computed(() => gravatarUrl(gravatarEmail.value, { size: 200 }))
export const debugMode = useLocalStorage('debug', false)
export const isDarkMode = useLocalStorage('darkMode', true)
export const isSettingsPanelOpen = useLocalStorage('settingsPanelOpen', true)
export const toggleSettingsPanel = () => {
  isSettingsPanelOpen.value = !isSettingsPanelOpen.value
}

export type ChatMessage = {
  role: 'ai' | 'user' | 'system'
  content: string
  date: Date
}

export type Chat = {
  id: string
  title?: string
  model: string
  messages: ChatMessage[]
  createdAt: Date
  lastContext?: number[]
}

export const useAppState = defineStore('app-state', () => {
  const { generateCompletion, listLocalModels } = useApi()

  const baseUrl = ref('http://localhost:11434/api')
  const currentModel = ref<string>()
  const availableModels = ref([])
  const userInput = ref('')

  const previousChats = ref<Chat[]>([])
  const currentChat = ref<Chat>()

  // Start a new chat
  const setCurrentChat = (chat: Chat) => {
    currentChat.value = chat
  }

  // Start a new chat
  const startNewChat = (title: string, model: string) => {
    const newChat: Chat = {
      title,
      model,
      id: uuidv4(),
      messages: [],
      createdAt: new Date(),
    }
    previousChats.value.push(newChat)
    currentChat.value = newChat
  }

  // Add a message to the current chat
  const addMessage = async (role: 'ai' | 'user' | 'system', content: string) => {
    if (!currentChat.value) return
    if (!content?.trim()) return

    const message: ChatMessage = {
      role,
      content,
      date: new Date(),
    }

    currentChat.value.messages.push(message)

    if (role == 'user') {
      clearUserInput()
      await generateCompletion(
        {
          model: currentChat.value?.model,
          prompt: content,
          context: currentChat.value?.lastContext,
        },
        (data: GenerateCompletionResponse) => {
          appendAiMessage(data.response)

          if (data.done && 'context' in data) {
            addMessage('system', JSON.stringify(data, null, 2))
            currentChat.value.lastContext = data?.context
          }
        },
      )
    }
  }

  const addUserMessage = (content: string) => addMessage('user', content)
  const addAiMessage = (content: string) => addMessage('user', content)

  const appendAiMessage = (content: string) => {
    if (!currentChat.value || !content?.trim()) return

    let lastMessage = currentChat.value.messages[currentChat.value.messages.length - 1]

    if (!lastMessage || lastMessage.role !== 'ai') {
      const newAiMessage: ChatMessage = {
        role: 'ai',
        content: '',
        date: new Date(),
      }
      currentChat.value.messages.push(newAiMessage)
      lastMessage = newAiMessage
    }

    lastMessage.content += content
  }

  const fetchAvailableModels = async () => {
    const { models } = await listLocalModels()
    availableModels.value = models
  }

  // Clear the user input
  const clearUserInput = () => {
    userInput.value = ''
  }
  // Function to change the model of the current chat
  const changeCurrentModel = (newModel: string) => {
    if (currentChat.value && currentChat.value.messages.length === 0) {
      currentChat.value.model = newModel
      // Optionally, update the `currentModel` ref
      currentModel.value = newModel
    }
  }

  const initialize = () => {
    fetchAvailableModels().then(() => {
      if (!currentModel.value) {
        currentModel.value = availableModels?.value?.[0]?.name
      }

      // Have not chats
      if (!currentChat.value) {
        startNewChat('New chat', currentModel?.value)
      }
    })
  }

  // Call the function to populate availableModels
  initialize()

  return {
    userInput,
    previousChats,
    currentChat,
    baseUrl,
    currentModel,
    availableModels,
    changeCurrentModel,
    fetchAvailableModels,
    setCurrentChat,
    startNewChat,
    addMessage,
    clearUserInput,
    addUserMessage,
    addAiMessage,
  }
})
