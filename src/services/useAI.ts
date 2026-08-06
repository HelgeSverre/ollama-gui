import { ref } from 'vue'
import { getOllama } from './api.ts'

export interface OllamaModel {
  name: string
  size: number
  modified_at: string
  details?: {
    parameter_size: string
    family: string
  }
}

const availableModels = ref<OllamaModel[]>([])

export const useAI = () => {
  const refreshModels = async () => {
    try {
      const response = await getOllama().list()
      availableModels.value = response.models as unknown as OllamaModel[]
    } catch (e) {
      console.error('Failed to refresh models:', e)
    }
  }

  return { availableModels, refreshModels }
}
