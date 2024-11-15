import { useLocalStorage } from '@vueuse/core'
import gravatarUrl from 'gravatar-url'
import { computed } from 'vue'
import { Config, db } from './database'

export const currentModel = useLocalStorage('currentModel', 'none')
export const gravatarEmail = useLocalStorage('gravatarEmail', 'helge.sverre@gmail.com')
export const historyMessageLength = useLocalStorage('historyMessageLength', 10)
export const avatarUrl = computed(() =>
  gravatarUrl(gravatarEmail.value, { size: 200, default: '/avatar.png' }),
)
export const debugMode = useLocalStorage('debug', false)
export const baseUrl = useLocalStorage('baseUrl', 'http://localhost:11434/api')
export const isDarkMode = useLocalStorage('darkMode', true)
export const isSettingsOpen = useLocalStorage('settingsPanelOpen', true)
export const isSystemPromptOpen = useLocalStorage('systemPromptOpen', true)
export const toggleSettingsPanel = () => (isSettingsOpen.value = !isSettingsOpen.value)
export const toggleSystemPromptPanel = () =>
  (isSystemPromptOpen.value = !isSystemPromptOpen.value)

// Database Layer
export const configDbLayer = {
  async getConfig(model: string) {
    const filteredConfig = await db.config.where('model').equals(model).limit(1)
    return filteredConfig.first()
  },

  async getCurrentConfig(model: string) {
    let config = await this.getConfig(model)
    if (!config?.systemPrompt) {
      config = await this.getConfig('default')
    }
    return config
  },

  async setConfig(config: Config) {
    await db.config.put(config)
  },

  async clearConfig() {
    return db.config.clear()
  },
}

export function useConfig() {
  const setConfig = async (newConfig: Config) => {
    newConfig.id = await generateIdFromModel(newConfig.model)
    await configDbLayer.setConfig(newConfig)
  }

  const getCurrentSystemMessage = async () => {
    let config = await configDbLayer.getCurrentConfig(currentModel.value)
    return config?.systemPrompt ?? null
  }

  const generateIdFromModel = async (model: string): Promise<number> => {
    let hash = 0
    for (let i = 0; i < model.length; i++) {
      hash += model.charCodeAt(i)
    }
    return hash
  }

  const initializeConfig = async (model: string) => {
    try {
      const modelConfig = await configDbLayer.getConfig(model)
      const defaultConfig = await configDbLayer.getConfig('default')
      return { modelConfig: modelConfig, defaultConfig: defaultConfig }
    } catch (error) {
      console.error('Failed to initialize config:', error)
    }
    return null
  }

  return {
    initializeConfig,
    setConfig,
    getCurrentSystemMessage,
  }
}
