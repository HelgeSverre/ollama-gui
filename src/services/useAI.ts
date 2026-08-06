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
const isLoading = ref(false)
const modelError = ref<string | null>(null)

export const useAI = () => {
  const refreshModels = async () => {
    isLoading.value = true
    modelError.value = null
    try {
      const response = await getOllama().list()
      availableModels.value = response.models as unknown as OllamaModel[]
    } catch (e) {
      modelError.value = e instanceof Error ? e.message : 'Failed to refresh models'
      console.error('Failed to refresh models:', e)
    } finally {
      isLoading.value = false
    }
  }

  return { availableModels, isLoading, modelError, refreshModels }
}
