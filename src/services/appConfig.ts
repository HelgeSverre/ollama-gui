import { useLocalStorage } from '@vueuse/core'
import { computed, ref } from 'vue'
import { db } from './database'
import type { Config } from './database'

export const currentModel = useLocalStorage('currentModel', 'none')
export const gravatarEmail = useLocalStorage('gravatarEmail', '')
export const historyMessageLength = useLocalStorage('historyMessageLength', 10)
export const enableMarkdown = useLocalStorage('markdown', true)
export const showSystem = useLocalStorage('systemMessages', true)
export const baseUrl = useLocalStorage('baseUrl', 'http://localhost:11434')
export const isDarkMode = useLocalStorage('darkMode', true)

export const isSettingsOpen = useLocalStorage('settingsPanelOpen', false)
export const isModelManagerOpen = ref(false)
export const isSystemPromptOpen = useLocalStorage('systemPromptOpen', false)

export const toggleSettingsPanel = () => (isSettingsOpen.value = !isSettingsOpen.value)
export const toggleModelManager = () =>
  (isModelManagerOpen.value = !isModelManagerOpen.value)
export const toggleSystemPromptPanel = () =>
  (isSystemPromptOpen.value = !isSystemPromptOpen.value)

export const avatarUrl = computed(() => {
  const email = gravatarEmail.value.trim().toLowerCase()
  return email ? `https://gravatar.com/avatar/${email}?s=200&d=mp` : null
})

export function useConfig() {
  const setConfig = async (config: Config) => {
    config.id = hashString(config.model)
    await db.config.put(config)
  }

  const getCurrentSystemMessage = async () => {
    const modelConfig = await db.config.where('model').equals(currentModel.value).first()
    const prompt = modelConfig?.systemPrompt
    if (prompt) return prompt
    const defaultConfig = await db.config.where('model').equals('default').first()
    return defaultConfig?.systemPrompt ?? null
  }

  const initializeConfig = async (model: string) => {
    try {
      const [modelConfig, defaultConfig] = await Promise.all([
        db.config.where('model').equals(model).first(),
        db.config.where('model').equals('default').first(),
      ])
      return { modelConfig, defaultConfig }
    } catch (error) {
      console.error('Failed to initialize config:', error)
      return null
    }
  }

  return { initializeConfig, setConfig, getCurrentSystemMessage }
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0
  return Math.abs(hash)
}
