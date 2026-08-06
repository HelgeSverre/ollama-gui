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
      const raw = response.models ?? []
      availableModels.value = raw
        .filter((m: any) => typeof m?.name === 'string')
        .map((m: any) => ({ name: m.name, size: m.size, modified_at: m.modified_at }))
    } catch (e) {
      modelError.value = e instanceof Error ? e.message : 'Failed to refresh models'
      console.error('Failed to refresh models:', e)
    } finally {
      isLoading.value = false
    }
  }

  return { availableModels, isLoading, modelError, refreshModels }
}
