import { INJECT_IMAGE_KEY } from '../constants.ts';
import {
  GenerateCompletionCompletedResponse,
  GenerateCompletionPartResponse,
  GenerateCompletionResponse,
  Model,
  useApi,
} from './api.ts'
import { Ref, inject, ref } from 'vue' // Define availableModels outside the function to ensure a shared state.

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1]; // Remove the beginning part (e.g., "data:image/png;base64,")
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
}

// Define availableModels outside the function to ensure a shared state.
const availableModels = ref<Model[]>([])

export const useAI = () => {
  const { generateCompletion, listLocalModels } = useApi()

  const generate = async (
    model: string,
    prompt: string,
    image?: string,
    context?: number[],
    onMessage?: (data: GenerateCompletionResponse) => void,
    onDone?: (data: GenerateCompletionCompletedResponse) => void,
  ) => {
    let images: string[] | undefined = undefined;

    if (image) {
      images = [image];
    }

    await generateCompletion(
      { model, prompt, context, images },
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
