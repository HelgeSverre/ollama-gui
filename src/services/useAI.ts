import {
  GenerateCompletionCompletedResponse,
  GenerateCompletionPartResponse,
  GenerateCompletionResponse,
  Model,
  useApi,
} from './api.ts'
import { ref } from 'vue' // Define availableModels outside the function to ensure a shared state.

// Define availableModels outside the function to ensure a shared state.
const availableModels = ref<Model[]>([])

export const useAI = () => {
  const { generateCompletion, listLocalModels } = useApi()

  const generate = async (
    model: string,
    prompt: string,
    context?: number[],
    onMessage?: (data: GenerateCompletionResponse) => void,
    onDone?: (data: GenerateCompletionCompletedResponse) => void,
  ) => {
    await generateCompletion(
      { model, prompt, context },
      (data: GenerateCompletionResponse) => {
        if (!data.done && onMessage) {
          onMessage(data as GenerateCompletionPartResponse)
        } else if (data.done && 'context' in data && onDone) {
          onDone(data as GenerateCompletionCompletedResponse)
        }
      },
    )
  }

  const refreshModels = async () => {
    const response = await listLocalModels()
    availableModels.value = response.models
  }

  // Use toRefs to keep reactivity when destructuring in components.
  return {
    availableModels,
    generate,
    refreshModels,
  }
}
